module ErrorHandler
  def self.included(clazz)
    clazz.class_eval do
      # rescue_from StandardError, with: :internal_server_error

    end
  end

  private

  # def internal_server_error(error)
  #   redirect_to root_path, alert: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
  # end
end
