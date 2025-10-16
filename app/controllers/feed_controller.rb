class FeedController < ApplicationController
  # before_action :authenticate_user!

  def index
    @recordings = Recording.includes(
      :user, audio_file_attachment: :blob
    ).all.order(id: :desc)

    @submit_url = recordings_path
  end
end
