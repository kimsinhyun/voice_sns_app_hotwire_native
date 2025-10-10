# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
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

