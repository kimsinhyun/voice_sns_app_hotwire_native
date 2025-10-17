class Message < ApplicationRecord
  belongs_to :user
  belongs_to :chat_room
  has_one :recording, as: :belongable, dependent: :destroy

  validates :user, :chat_room, presence: true

  after_create :update_chat_room_timestamp

  private

  def update_chat_room_timestamp
    chat_room.update_column(:last_message_at, created_at)
  end
end

