class Recording < ApplicationRecord
  belongs_to :user
  has_one_attached :audio_file

  # validates :audio_file, presence: true

  def self.create_mock_data
    user = User.last
    recording = Recording.create!(user: user)
    file_path = Rails.root.join("app", "assets", "audios", "sample_audio.mp3")
    recording.audio_file.attach(io: File.open(file_path), filename: "sample_audio.mp3", content_type: "audio/mpeg")
  end
end
