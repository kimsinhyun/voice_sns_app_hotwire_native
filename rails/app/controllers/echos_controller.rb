class EchosController < ApplicationController
  before_action :authenticate_user!, only: [:create, :show]

  def show
    @echo = Echo.includes(recording: { audio_file_attachment: :blob }).find(params[:id])

    # Case 1: 내가 올린 Echo인 경우
    if @echo.user == current_user
      # TODO: 복수 대화방 UI 구현
      # 현재는 해당 Echo로부터 생성된 모든 ChatRoom 목록 표시
      @chat_rooms = @echo.chat_rooms
                         .includes(:responder, messages: { recording: { audio_file_attachment: :blob } })
                         .order(last_message_at: :desc)
      @is_my_echo = true
      return
    end

    # Case 2: 남이 올린 Echo인 경우 (1:1 대화)
    @chat_room = current_user.chat_rooms.find_by(echo_id: @echo.id)
    @messages = @chat_room ?
      @chat_room.messages.includes(:user, recording: { audio_file_attachment: :blob }).order(:created_at) :
      []

    @submit_url = echo_messages_path(@echo)
    
    # 턴제 상태 확인: 마지막 메시지가 내가 보낸 것이면 대기 중
    if @chat_room && @messages.any?
      last_message = @messages.last
      @is_waiting_for_reply = (last_message.user_id == current_user.id)
    else
      @is_waiting_for_reply = false
    end
  end

  def create
    # Echo 생성
    @echo = Echo.create!(user: current_user)

    # Recording 생성 및 Echo에 연결
    @recording = Recording.create!(user: current_user, belongable: @echo)

    # Base64 데이터가 있는 경우 (네이티브 앱)
    audio_data = params[:audio_data]
    if audio_data.present?
      attach_base64_audio(@recording, audio_data)
    end

    # last_seen_id 이후의 모든 새 echos 가져오기
    last_seen_id = params[:last_seen_id].to_i

    @new_echos = if last_seen_id > 0
                   Echo.includes(:user, recording: { audio_file_attachment: :blob })
                       .where("id > ?", last_seen_id)
                       .order(id: :desc)
                 else
                   Echo.where(id: @echo.id)
                       .includes(:user, recording: { audio_file_attachment: :blob })
                 end

    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          # 새 echos prepend
          turbo_stream.prepend(
            "echos_list",
            partial: "feed/echos_batch",
            locals: { echos: @new_echos }
          ),
          # footer 초기화 (녹음 상태 리셋, CSRF 토큰 갱신)
          turbo_stream.replace(
            "recording_footer",
            partial: "shared/footer",
            locals: { submit_url: echos_path }
          )
        ]
      }
      format.html { redirect_to feed_index_path, notice: "메아리가 저장되었습니다." }
    end
  end

  private

  def attach_base64_audio(recording, base64_data)
    Rails.logger.info "📦 Decoding Base64: #{base64_data.length} chars"

    # Base64 디코딩
    audio_data = Base64.decode64(base64_data)
    Rails.logger.info "📦 Decoded: #{audio_data.bytesize} bytes"

    # 원본 파일 생성
    original_file = Tempfile.new(["recording_original", ".mp3"])
    original_file.binmode
    original_file.write(audio_data)
    original_file.rewind
    original_file.close # ffmpeg가 파일에 접근하기 위해 닫기

    # 압축된 파일 생성
    compressed_file = Tempfile.new(["recording_compressed", ".mp3"])
    compressed_file.close # ffmpeg가 파일을 생성하므로 닫기

    # 오디오 압축 시도
    compression_success = Recording.compress_audio_file(original_file.path, compressed_file.path)

    # 압축 성공 시 압축 파일 사용, 실패 시 원본 사용
    final_file_path = compression_success ? compressed_file.path : original_file.path
    final_filename = compression_success ? "recording_compressed.mp3" : "recording.mp3"

    # Active Storage에 attach
    recording.audio_file.attach(
      io: File.open(final_file_path),
      filename: final_filename,
      content_type: "audio/mpeg"
    )

    Rails.logger.info "✅ Audio attached successfully (compressed: #{compression_success})"
  ensure
    original_file&.unlink
    compressed_file&.unlink
  end
end

