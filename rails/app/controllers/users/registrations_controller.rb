# frozen_string_literal: true

class Users::RegistrationsController < Devise::RegistrationsController
  # before_action :configure_sign_up_params, only: [:create]
  # before_action :configure_account_update_params, only: [:update]

  # GET /register
  # def new
  #   super
  # end

  # POST /register
  # Guest 사용자가 회원가입하면 기존 레코드를 업그레이드
  def create
    # 현재 로그인한 사용자가 guest인지 확인
    if current_user&.guest?
      # Guest 사용자를 정식 사용자로 업그레이드
      upgrade_guest_to_registered
    else
      # 새로운 사용자 생성
      super
    end
  end

  # GET /resource/edit
  # def edit
  #   super
  # end

  # PUT /resource
  # def update
  #   super
  # end

  # DELETE /resource
  # def destroy
  #   super
  # end

  # GET /resource/cancel
  # Forces the session data which is usually expired after sign
  # in to be expired now. This is useful if the user wants to
  # cancel oauth signing in/up in the middle of the process,
  # removing all OAuth session data.
  # def cancel
  #   super
  # end

  protected

  # Guest 사용자를 정식 사용자로 업그레이드
  def upgrade_guest_to_registered
    @user = current_user
    
    # 이메일과 비밀번호 업데이트
    @user.email = sign_up_params[:email]
    @user.password = sign_up_params[:password]
    @user.password_confirmation = sign_up_params[:password_confirmation]
    
    # device_id는 유지 (이미 존재함)
    
    if @user.save
      # 업그레이드 성공
      bypass_sign_in(@user) # 세션 갱신
      set_flash_message! :notice, :signed_up
      respond_with @user, location: after_sign_up_path_for(@user)
    else
      # 업그레이드 실패
      clean_up_passwords @user
      set_minimum_password_length
      respond_with @user
    end
  end

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_sign_up_params
  #   devise_parameter_sanitizer.permit(:sign_up, keys: [:attribute])
  # end

  # If you have extra params to permit, append them to the sanitizer.
  # def configure_account_update_params
  #   devise_parameter_sanitizer.permit(:account_update, keys: [:attribute])
  # end

  # 회원가입 성공 후 리다이렉트 경로
  def after_sign_up_path_for(resource)
    feed_path
  end

  # The path used after sign up for inactive accounts.
  # def after_inactive_sign_up_path_for(resource)
  #   super(resource)
  # end
end

