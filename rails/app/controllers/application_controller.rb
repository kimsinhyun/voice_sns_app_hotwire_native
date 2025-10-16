class ApplicationController < ActionController::Base
  include ErrorHandler
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  # allow_browser versions: :modern

  # Turbo Native 앱에서 오는 요청인지 확인
  def hotwire_native_app?
    request.user_agent.to_s.match?(/Turbo Native/)
  end
  helper_method :hotwire_native_app?
end
