class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :rememberable, :registerable

  has_many :echos, dependent: :destroy
  has_many :recordings # dependent: :destroy
  has_many :messages, dependent: :destroy
  has_many :chat_rooms_as_responder, class_name: "ChatRoom", foreign_key: "responder_id", dependent: :destroy
  has_many :chat_rooms_as_initiator, class_name: "ChatRoom", foreign_key: "initiator_id", dependent: :destroy

  def chat_rooms
    ChatRoom.where("initiator_id = ? OR responder_id = ?", id, id)
  end

  # Guest 사용자는 device_id만 있고 이메일이 없음
  validates :device_id, uniqueness: true, allow_nil: true
  validates :email, presence: true, if: :email_required?

  # Guest 사용자 여부 확인
  def guest?
    device_id.present? && email.blank?
  end

  # 정식 사용자 여부 확인
  def registered?
    email.present?
  end

  protected

  # Devise override: guest 사용자는 이메일 불필요
  def email_required?
    !guest?
  end

  # Devise override: guest 사용자는 비밀번호 불필요
  def password_required?
    !guest? && super
  end

  # Devise override: guest 사용자는 confirmation 불필요
  def confirmation_required?
    !guest? && super
  end
end
