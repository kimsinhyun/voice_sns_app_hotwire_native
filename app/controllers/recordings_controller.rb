class RecordingsController < ApplicationController
  # before_action :authenticate_user!

  def new
    # 녹음 화면 렌더링
  end

  def create
    @recording = current_user.recordings.build
    
    # Base64 데이터가 있는 경우 (네이티브 앱)
    if params[:recording][:audio_data].present?
      attach_base64_audio(@recording, params[:recording][:audio_data])
    # Multipart 파일이 있는 경우 (웹)
    elsif params[:recording][:audio_file].present?
      @recording.audio_file.attach(params[:recording][:audio_file])
    end
    
    if @recording.save
      respond_to do |format|
        format.html { refresh_or_redirect_to feed_path, notice: "녹음이 저장되었습니다." }
        format.json { render json: { success: true, recording: @recording }, status: :created }
      end
    else
      respond_to do |format|
        format.html { render :new, alert: "녹음 저장에 실패했습니다." }
        format.json { render json: { success: false, errors: @recording.errors }, status: :unprocessable_entity }
      end
    end
  end

  private

  def recording_params
    params.require(:recording).permit(:audio_file, :audio_data)
  end
  
  def attach_base64_audio(recording, base64_data)
    Rails.logger.info "📦 Decoding Base64: #{base64_data.length} chars"
    
    # Base64 디코딩
    audio_data = Base64.decode64(base64_data)
    Rails.logger.info "📦 Decoded: #{audio_data.bytesize} bytes"
    
    # Tempfile 생성
    tempfile = Tempfile.new(['recording', '.m4a'])
    tempfile.binmode
    tempfile.write(audio_data)
    tempfile.rewind
    
    # Active Storage에 attach
    recording.audio_file.attach(
      io: tempfile,
      filename: 'recording.m4a',
      content_type: 'audio/mp4'
    )
    
    Rails.logger.info "✅ Base64 audio attached successfully"
  ensure
    tempfile&.close
    tempfile&.unlink
  end
end

