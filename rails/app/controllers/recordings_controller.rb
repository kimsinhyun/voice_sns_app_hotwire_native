class RecordingsController < ApplicationController
  before_action :authenticate_user!, only: [:create]

  def create
    @recording = Recording.create!(user: current_user)

    # Base64 데이터가 있는 경우 (네이티브 앱)
    audio_data = params[:audio_data]
    if audio_data.present?
      attach_base64_audio(@recording, audio_data)
    end

    # last_seen_id 이후의 모든 새 recordings 가져오기
    last_seen_id = params[:last_seen_id].to_i

    @new_recordings = if last_seen_id > 0
                        Recording.includes(:user, audio_file_attachment: :blob)
                                 .where("id > ?", last_seen_id)
                                 .order(id: :desc)
                      else
                        Recording.where(id: @recording.id)
                                 .includes(:user, audio_file_attachment: :blob)
                      end

    # Rails.logger.info "🆕 New recordings after #{last_seen_id}: #{@new_recordings.pluck(:id)}"

    respond_to do |format|
      format.turbo_stream {
        render turbo_stream: [
          # 새 recordings prepend
          turbo_stream.prepend(
            "recordings_list",
            partial: "feed/recordings_batch",
            locals: { recordings: @new_recordings }
          ),
          # footer 초기화 (녹음 상태 리셋, CSRF 토큰 갱신)
          turbo_stream.replace(
            "recording_footer",
            partial: "shared/footer",
            locals: { submit_url: recordings_path }
          )
        ]
      }
      format.html { redirect_to feed_index_path, notice: "녹음이 저장되었습니다." }
    end
  end

  private

  def attach_base64_audio(recording, base64_data)
    Rails.logger.info "📦 Decoding Base64: #{base64_data.length} chars"

    # Base64 디코딩
    audio_data = Base64.decode64(base64_data)
    Rails.logger.info "📦 Decoded: #{audio_data.bytesize} bytes"

    # 원본 파일 생성
    original_file = Tempfile.new(["recording_original", ".mp3"])
    original_file.binmode
    original_file.write(audio_data)
    original_file.rewind
    original_file.close  # ffmpeg가 파일에 접근하기 위해 닫기

    # 압축된 파일 생성
    compressed_file = Tempfile.new(["recording_compressed", ".mp3"])
    compressed_file.close  # ffmpeg가 파일을 생성하므로 닫기

    # 오디오 압축 시도
    compression_success = Recording.compress_audio_file(original_file.path, compressed_file.path)

    # 압축 성공 시 압축 파일 사용, 실패 시 원본 사용
    final_file_path = compression_success ? compressed_file.path : original_file.path
    final_filename = compression_success ? "recording_compressed.mp3" : "recording.mp3"

    # Active Storage에 attach
    recording.audio_file.attach(
      io: File.open(final_file_path),
      filename: final_filename,
      content_type: "audio/mpeg"
    )

    Rails.logger.info "✅ Audio attached successfully (compressed: #{compression_success})"
  ensure
    original_file&.unlink
    compressed_file&.unlink
  end
end
