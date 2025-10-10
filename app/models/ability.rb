# frozen_string_literal: true

class Ability
  include CanCan::Ability

  def initialize(user)
    # user는 현재 로그인한 AdminUser 인스턴스
    # 로그인하지 않은 경우 nil이므로 기본 객체 생성
    user ||= AdminUser.new

    if user.persisted?
      # 로그인한 관리자는 모든 권한을 가짐
      can :manage, :all
    else
      # 로그인하지 않은 경우 아무 권한도 없음
      # can :read, ActiveAdmin::Page, name: "Dashboard"
    end

    # ActiveAdmin Comment 권한 추가
    # can :manage, ActiveAdmin::Comment if user.persisted?
  end
end
