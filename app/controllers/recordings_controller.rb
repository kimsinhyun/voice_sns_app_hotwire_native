class RecordingsController < ApplicationController
  before_action :authenticate_user!, only: [:create]


  def create
    @recording = Recording.create!(user: current_user)

    # Base64 데이터가 있는 경우 (네이티브 앱)
    if params[:audio_data].present?
      attach_base64_audio(@recording, params[:audio_data])
    end

    redirect_to feed_index_path, notice: "녹음이 저장되었습니다."
  end

  private

  def attach_base64_audio(recording, base64_data)
    Rails.logger.info "📦 Decoding Base64: #{base64_data.length} chars"

    # Base64 디코딩
    audio_data = Base64.decode64(base64_data)
    Rails.logger.info "📦 Decoded: #{audio_data.bytesize} bytes"

    # Tempfile 생성
    tempfile = Tempfile.new(["recording", ".mp3"])
    tempfile.binmode
    tempfile.write(audio_data)
    tempfile.rewind

    # Active Storage에 attach
    recording.audio_file.attach(
      io: tempfile,
      filename: "recording.mp3",
      content_type: "audio/mp3"
    )

    Rails.logger.info "✅ Base64 audio attached successfully"
  ensure
    tempfile&.close
    tempfile&.unlink
  end
end
