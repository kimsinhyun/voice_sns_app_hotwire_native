class ApplicationController < ActionController::Base
  include ErrorHandler
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Turbo Native 앱에서 오는 요청인지 확인
  def turbo_native_app?
    request.user_agent.to_s.match?(/Turbo Native/)
  end
  helper_method :turbo_native_app?

  # Redirect after sign in
  def after_sign_in_path_for(resource)
    if resource.is_a?(User)
      feed_path
    else
      super
    end
  end
end
