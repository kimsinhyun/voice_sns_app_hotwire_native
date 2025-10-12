class FeedController < ApplicationController
  # before_action :authenticate_user!

  def index
    @recordings = current_user.recordings.order(created_at: :desc) if current_user
  end
end
