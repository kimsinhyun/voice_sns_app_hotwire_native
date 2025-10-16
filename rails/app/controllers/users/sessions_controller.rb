# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
  skip_before_action :verify_authenticity_token, only: [:device_login]
  
  # before_action :configure_sign_in_params, only: [:create]

  # GET /login
  # def new
  #   super
  # end

  # POST /login
  # def create
  #   super
  # end

  # DELETE /logout
  # def destroy
  #   super
  # end

  # POST /auth/device_login
  # 기기 식별자로 자동 로그인
  def device_login
    device_id = params[:device_id]

    if device_id.blank?
      redirect_to feed_path
    end

    # device_id로 사용자 찾기 또는 생성
    user = User.find_or_create_by!(device_id: device_id)

    # 자동 로그인
    sign_in(user)

    # redirect_to root_path, allow_other_host: false
  end

  protected

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_in_params
  #   devise_parameter_sanitizer.permit(:sign_in, keys: [:attribute])
  # end

  # 로그인 성공 후 리다이렉트 경로
  def after_sign_in_path_for(resource)
    feed_path
  end
end

