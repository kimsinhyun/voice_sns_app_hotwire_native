class FeedController < ApplicationController
  # before_action :authenticate_user!

  def index
    @recordings = Recording.includes(
      :user, audio_file_attachment: :blob
    ).all.order(id: :desc)

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
end
