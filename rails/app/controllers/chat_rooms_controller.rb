class ChatRoomsController < ApplicationController
  before_action :authenticate_user!

  def show
    @chat_room = ChatRoom.includes(:echo, :initiator, :responder,
                                   messages: { recording: { audio_file_attachment: :blob } })
                         .find(params[:id])
    @echo = @chat_room.echo
    
    # 권한 체크: initiator 또는 responder만 접근 가능
    unless current_user == @chat_room.initiator || current_user == @chat_room.responder
      redirect_to feed_index_path, alert: "접근 권한이 없습니다"
      return
    end
    
    @messages = @chat_room.messages.order(:created_at)
    @submit_url = chat_room_messages_path(@chat_room)
    
    # 턴제 상태 확인: 마지막 메시지가 내가 보낸 것이면 대기 중
    if @messages.any?
      last_message = @messages.last
      @is_waiting_for_reply = (last_message.user_id == current_user.id)
    else
      @is_waiting_for_reply = false
    end
  end
end

