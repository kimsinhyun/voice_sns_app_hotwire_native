class MessagesController < ApplicationController
  before_action :authenticate_user!

  def index
    # 남이 올린 Echo에 내가 참여한 대화방만
    @chat_rooms = current_user.chat_rooms
                              .joins(:echo)
                              .where.not(echos: { user_id: current_user.id })
                              .includes(:echo, :initiator, :responder,
                                        messages: { recording: { audio_file_attachment: :blob } })
                              .order(last_message_at: :desc)
  end

  def create
    # echo_id 또는 chat_room_id로 접근
    if params[:echo_id]
      @echo = Echo.find(params[:echo_id])
      @chat_room = current_user.chat_rooms.find_by(echo_id: @echo.id)
      is_first_reply = @chat_room.nil?
      
      if is_first_reply
        # 첫 답장: ChatRoom + Echo 복사 메시지 생성
        create_chat_room_with_echo_copy
      end
      
      submit_url_method = :echo_messages_path
      submit_url_param = @echo
    elsif params[:chat_room_id]
      @chat_room = ChatRoom.find(params[:chat_room_id])
      @echo = @chat_room.echo
      is_first_reply = false
      
      # 권한 체크
      unless current_user == @chat_room.initiator || current_user == @chat_room.responder
        return redirect_to feed_index_path, alert: "접근 권한이 없습니다"
      end
      
      submit_url_method = :chat_room_messages_path
      submit_url_param = @chat_room
    end

    # 턴제 검증
    last_message = @chat_room.messages.order(:created_at).last
    if last_message && last_message.user_id == current_user.id
      return render turbo_stream: [
        turbo_stream.append(
          "chat-messages",
          partial: "shared/error_message",
          locals: { message: "상대방의 목소리를 기다리고 있습니다" }
        ),
        turbo_stream.replace(
          "recording_footer",
          partial: "shared/footer_waiting"
        )
      ], status: :unprocessable_entity
    end

    # 새 메시지 생성
    @message = @chat_room.messages.build(user: current_user)
    @recording = Recording.create!(user: current_user, belongable: @message)

    # Base64 오디오 첨부
    audio_data = params[:audio_data]
    if audio_data.present?
      attach_base64_audio(@recording, audio_data)
    end

    respond_to do |format|
      format.turbo_stream {
        streams = [
          turbo_stream.append("chat-messages", partial: "messages/message", 
                            locals: { message: @message }),
          turbo_stream.replace("recording_footer", partial: "shared/footer", 
                              locals: { submit_url: send(submit_url_method, submit_url_param) })
        ]
        
        # 첫 답장인 경우 Action Cable 구독 추가
        if is_first_reply
          streams << turbo_stream.prepend("chat-messages", 
                                         partial: "messages/chat_subscription")
        end
        
        render turbo_stream: streams
      }
    end
  end

  private

  def create_chat_room_with_echo_copy
    ActiveRecord::Base.transaction do
      @chat_room = ChatRoom.create!(
        echo: @echo,
        initiator: @echo.user,
        responder: current_user,
        last_message_at: Time.current
      )

      # Echo 오디오 복사
      first_message = @chat_room.messages.create!(user: @echo.user)
      first_recording = Recording.create!(user: @echo.user, belongable: first_message)
      first_recording.audio_file.attach(@echo.recording.audio_file.blob)
    end
  end

  def attach_base64_audio(recording, base64_data)
    # EchosController와 동일한 로직
    audio_data = Base64.decode64(base64_data)

    original_file = Tempfile.new(["recording_original", ".mp3"])
    original_file.binmode
    original_file.write(audio_data)
    original_file.rewind
    original_file.close

    compressed_file = Tempfile.new(["recording_compressed", ".mp3"])
    compressed_file.close

    compression_success = Recording.compress_audio_file(original_file.path, compressed_file.path)

    final_file_path = compression_success ? compressed_file.path : original_file.path
    final_filename = compression_success ? "recording_compressed.mp3" : "recording.mp3"

    recording.audio_file.attach(
      io: File.open(final_file_path),
      filename: final_filename,
      content_type: "audio/mpeg"
    )
  ensure
    original_file&.unlink
    compressed_file&.unlink
  end
end

