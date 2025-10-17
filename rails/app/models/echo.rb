class Echo < ApplicationRecord
  belongs_to :user
  has_one :recording, as: :belongable, dependent: :destroy
  has_many :chat_rooms, dependent: :destroy

  validates :user, presence: true

  scope :recent, -> { order(id: :desc) }
  scope :not_expired, -> { where("created_at > ?", 3.days.ago) }
end

