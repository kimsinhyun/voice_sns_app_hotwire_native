class FeedController < ApplicationController
  # before_action :authenticate_user!

  def index
    @recordings = Recording.all.order(created_at: :desc)
    @submit_url = recordings_path
  end
end
