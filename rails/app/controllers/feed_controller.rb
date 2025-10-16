class FeedController < ApplicationController
  include Pagy::Backend
  # before_action :authenticate_user!

  def index
    @pagy, @recordings = pagy_countless(
      Recording.includes(:user, audio_file_attachment: :blob)
               .order(id: :desc),
      items: 20
    )

    @submit_url = recordings_path
  end

  def refresh
    since_id = params[:since_id].to_i

    @new_recordings = Recording.includes(:user, audio_file_attachment: :blob)
                               .where("id > ?", since_id)
                               .order(id: :desc)

    respond_to do |format|
      format.turbo_stream
    end
  end

  def load_more
    last_id = params[:last_id].to_i

    # 마지막 ID보다 작은 (더 오래된) recordings 조회
    # 21개를 가져와서 20개 반환 + 1개로 "더 있는지" 판단
    @recordings = Recording.includes(:user, audio_file_attachment: :blob)
                           .where("id < ?", last_id)
                           .order(id: :desc)
                           .limit(21)

    # 실제로 반환할 recordings (최대 20개)
    @has_more = @recordings.size > 20
    @recordings = @recordings.first(20)

    respond_to do |format|
      format.turbo_stream
    end
  end
end
