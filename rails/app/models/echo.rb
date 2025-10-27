class Echo < ApplicationRecord
  belongs_to :user
  has_one :recording, as: :belongable, dependent: :destroy
  has_many :chat_rooms, dependent: :destroy

  validates :user, presence: true

  scope :recent, -> { order(id: :desc) }
  scope :not_expired, -> { where("created_at > ?", 3.days.ago) }

  def self.create_mock_data
    user = User.first
    ActiveRecord::Base.transaction do
      echo = Echo.create!(user:)
      recording = Recording.create!(belongable: echo)
      file_path = Rails.root.join("app", "assets", "audios", "sample_audio.mp3")
      recording.audio_file.attach(io: File.open(file_path), filename: "sample_audio.mp3", content_type: "audio/mpeg")
    end
  end
end

