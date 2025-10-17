class ChatRoom < ApplicationRecord
  belongs_to :echo
  belongs_to :initiator, class_name: "User", foreign_key: "initiator_id"
  belongs_to :responder, class_name: "User", foreign_key: "responder_id"
  has_many :messages, dependent: :destroy

  validates :echo, :initiator, :responder, presence: true
  validate :different_users

  scope :active, -> { where(initiator_left_at: nil, responder_left_at: nil) }
  scope :recent, -> { order(last_message_at: :desc) }

  def other_user(current_user)
    current_user == initiator ? responder : initiator
  end

  def user_left?(user)
    user == initiator ? initiator_left_at.present? : responder_left_at.present?
  end

  private

  def different_users
    errors.add(:base, "Initiator and responder must be different") if initiator == responder
  end
end

