Rails.application.routes.draw do
  devise_for :admin_users, ActiveAdmin::Devise.config
  ActiveAdmin.routes(self)

  devise_for :users,
             controllers: {
               sessions: "users/sessions",
               registrations: "users/registrations",
               passwords: "users/passwords",
               confirmations: "users/confirmations"
             },
             path: "",
             path_names: {
               sign_in: "login",
               sign_out: "logout",
               sign_up: "register"
             }

  # Device-based authentication for native apps
  devise_scope :user do
    post "auth/device_login", to: "users/sessions#device_login"
  end

  # Authenticated routes
  # authenticated :user do
  #   root "feed#index", as: :authenticated_root
  # end
  root to: "feed#index"

  # Feed routes
  # get "feed", to: "feed#index"
  resources :feed, only: [:index] do
    collection do
      get :refresh
      get :load_more
    end
  end
  resources :messages, only: [:index]
  resources :settings, only: [:index]

  # Echo routes
  resources :echos, only: [:create, :show] do
    resources :messages, only: [:create], shallow: false
  end

  # ChatRoom routes
  resources :chat_rooms, only: [:show] do
    resources :messages, only: [:create]
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
