require "streamio-ffmpeg"

class Recording < ApplicationRecord
  # belongs_to :user
  belongs_to :belongable, polymorphic: true
  has_one_attached :audio_file

  # validates :audio_file, presence: true

  def self.create_mock_data
    user = User.last
    recording = Recording.create!(user: user)
    file_path = Rails.root.join("app", "assets", "audios", "sample_audio.mp3")
    recording.audio_file.attach(io: File.open(file_path), filename: "sample_audio.mp3", content_type: "audio/mpeg")
  end

  # 오디오 압축 헬퍼 메서드 (Controller에서 호출)
  def self.compress_audio_file(input_path, output_path)
    Rails.logger.info "🎵 Starting audio compression"

    movie = FFMPEG::Movie.new(input_path)
    original_size = File.size(input_path)

    # 64kbps 비트레이트, 모노 채널로 변환
    # -ac 1: 모노 채널
    # -ab 64k: 64kbps 비트레이트
    # -ar 44100: 샘플레이트 44.1kHz
    movie.transcode(output_path, %w[-ac 1 -ab 64k -ar 44100])

    compressed_size = File.size(output_path)
    reduction = ((1 - compressed_size.to_f / original_size) * 100).round(1)

    Rails.logger.info "✅ Compression complete: #{original_size} bytes → #{compressed_size} bytes (#{reduction}% reduction)"

    true
  rescue StandardError => e
    Rails.logger.error "❌ Audio compression failed: #{e.message}"
    false
  end
end
