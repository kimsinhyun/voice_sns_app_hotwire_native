module ErrorHandler
  def self.included(clazz)
    clazz.class_eval do
      # RoutingError는 컨트롤러 레벨에서 rescue할 수 없으므로 제거
      rescue_from StandardError, with: :internal_server_error

      rescue_from "MyApp::BaseError" do |exception|
        redirect_to root_path, alert: exception.message
      end
    end
  end

  private

  def internal_server_error(error)
    redirect_to root_path, alert: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
  end
end
