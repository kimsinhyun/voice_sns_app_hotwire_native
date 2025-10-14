class FeedController < ApplicationController
  # before_action :authenticate_user!

  def index
    @recordings = Recording.all.order(created_at: :desc)
  end
end
