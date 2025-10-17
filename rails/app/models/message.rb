class Message < ApplicationRecord
  belongs_to :user
  belongs_to :chat_room
  has_one :recording, as: :belongable, dependent: :destroy

  validates :user, :chat_room, presence: true

  after_create :update_chat_room_timestamp
  after_create_commit -> { broadcast_to_chat_room }

  private

  def update_chat_room_timestamp
    chat_room.update_column(:last_message_at, created_at)
  end

  def broadcast_to_chat_room
    broadcast_append_to(
      chat_room,
      target: "chat-messages",
      partial: "messages/message",
      locals: { message: self, current_user: user }
    )
  end
end

