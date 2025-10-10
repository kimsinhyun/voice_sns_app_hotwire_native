# Admin Gems 설정 완료 (CanCanCan)

## 설치된 Gem들

### 1. **CanCanCan** - 권한 관리 (Authorization)
- DSL 기반의 간단하고 직관적인 권한 관리 시스템
- Ability 클래스에 모든 권한 규칙을 정의
- ActiveAdmin과 완벽하게 통합
- `can`, `cannot` 메서드로 권한 설정

### 2. **Draper** - 데코레이터 패턴
- 뷰 로직을 모델에서 분리하여 Decorator 클래스로 관리
- 모델을 깔끔하게 유지하면서 프레젠테이션 로직 처리
- ActiveAdmin과 함께 사용 시 admin 뷰의 복잡한 로직을 정리하는데 유용

### 3. **ActiveAdmin** - 관리자 페이지
- 강력한 관리자 인터페이스 생성 도구
- Devise와 통합되어 AdminUser 인증 처리
- CanCanCan과 통합되어 권한 관리

### 4. **Devise** - 인증 (Authentication)
- AdminUser 모델의 인증(로그인/로그아웃) 관리
- 이메일/비밀번호 기반 인증

## 생성된 주요 파일

### 모델
- `app/models/admin_user.rb` - AdminUser 모델
- `app/models/ability.rb` - CanCanCan 권한 정의

### 컨트롤러
- `app/controllers/application_controller.rb` - 기본 컨트롤러

### Decorator (뷰 로직)
- `app/decorators/application_decorator.rb` - 기본 Decorator

### ActiveAdmin
- `app/admin/dashboard.rb` - 관리자 대시보드
- `app/admin/admin_users.rb` - AdminUser 관리 페이지

### 설정 파일
- `config/initializers/devise.rb` - Devise 설정
- `config/initializers/active_admin.rb` - ActiveAdmin 설정 (CanCan 어댑터 활성화)
- `config/application.rb` - Draper 경로 설정 추가

### 라우팅
- `config/routes.rb` - Devise와 ActiveAdmin 라우트 자동 추가

## 초기 관리자 계정

개발 환경에서 생성된 초기 관리자 계정:
- **이메일**: admin@example.com
- **비밀번호**: password

## 접속 방법

1. Rails 서버 시작:
```bash
bin/rails server
```

2. 브라우저에서 접속:
```
http://localhost:3000/admin
```

3. 초기 관리자 계정으로 로그인

## CanCanCan 사용 방법

### Ability 클래스에 권한 정의

```ruby
# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= AdminUser.new
    
    if user.persisted?
      # 로그인한 관리자는 모든 권한 보유
      can :manage, :all
    end
  end
end
```

### 복잡한 권한 규칙 예시

```ruby
# app/models/ability.rb
class Ability
  include CanCan::Ability

  def initialize(user)
    user ||= User.new
    
    # 모든 사용자가 Post를 볼 수 있음
    can :read, Post
    
    # 로그인한 사용자
    if user.persisted?
      # 자신의 Post 수정/삭제 가능
      can [:update, :destroy], Post, user_id: user.id
      
      # 또는 블록으로 복잡한 조건 정의
      can :update, Post do |post|
        post.user_id == user.id && post.created_at > 1.hour.ago
      end
      
      # 새 Post 생성 가능
      can :create, Post
    end
    
    # 관리자는 모든 것을 할 수 있음
    if user.admin?
      can :manage, :all
    end
  end
end
```

### Controller에서 권한 체크

#### 방법 1: load_and_authorize_resource (자동)
```ruby
class PostsController < ApplicationController
  load_and_authorize_resource  # 자동으로 @post 로드 및 권한 체크
  
  def index
    # @posts가 자동으로 설정됨 (접근 가능한 것만)
  end
  
  def show
    # @post가 자동으로 로드되고 권한 체크됨
  end
  
  def update
    # @post가 자동으로 로드되고 권한 체크됨
    if @post.update(post_params)
      redirect_to @post
    end
  end
end
```

#### 방법 2: authorize! (수동)
```ruby
class PostsController < ApplicationController
  def edit
    @post = Post.find(params[:id])
    authorize! :edit, @post  # 수동으로 권한 체크
  end
  
  def update
    @post = Post.find(params[:id])
    authorize! :update, @post
    
    if @post.update(post_params)
      redirect_to @post
    end
  end
end
```

### View에서 권한 체크

```erb
<!-- app/views/posts/show.html.erb -->
<h1><%= @post.title %></h1>
<p><%= @post.content %></p>

<!-- 수정 권한이 있을 때만 버튼 표시 -->
<% if can? :edit, @post %>
  <%= link_to '수정', edit_post_path(@post) %>
<% end %>

<!-- 삭제 권한이 있을 때만 버튼 표시 -->
<% if can? :destroy, @post %>
  <%= link_to '삭제', post_path(@post), method: :delete, data: { confirm: '정말 삭제하시겠습니까?' } %>
<% end %>

<!-- 특정 클래스에 대한 권한 체크 -->
<% if can? :create, Post %>
  <%= link_to '새 글 작성', new_post_path %>
<% end %>
```

### ActiveAdmin에서 권한 설정

```ruby
# app/admin/posts.rb
ActiveAdmin.register Post do
  # CanCanCan이 자동으로 권한 체크
  # Ability 클래스의 규칙이 적용됨
  
  permit_params :title, :content, :user_id
  
  index do
    selectable_column
    id_column
    column :title
    column :user
    column :created_at
    actions
  end
  
  # 특정 액션에 대해 추가 체크 가능
  controller do
    def create
      # authorize! :create, Post (CanCanCan이 자동으로 처리)
      super
    end
  end
end
```

## CanCanCan DSL 치트시트

### 기본 권한 정의
```ruby
can :action, Model                    # 특정 액션 허용
can [:action1, :action2], Model       # 여러 액션 허용
can :manage, Model                    # 모든 액션 허용 (CRUD + 기타)
can :read, Model                      # :index, :show 허용
can :create, Model                    # :new, :create 허용
can :update, Model                    # :edit, :update 허용
can :destroy, Model                   # :destroy 허용
```

### 조건부 권한
```ruby
can :update, Post, user_id: user.id                    # 해시 조건
can :update, Post, user: user                          # 연관관계 조건
can :update, Post, published: true                     # 상태 조건
can :update, Post, ["created_at > ?", 1.day.ago]      # SQL 조건
```

### 블록 조건
```ruby
can :update, Post do |post|
  post.user_id == user.id && !post.locked?
end
```

### 권한 거부
```ruby
cannot :destroy, Post                                  # 특정 액션 거부
cannot :destroy, Post, locked: true                    # 조건부 거부
```

### 모든 모델에 대한 권한
```ruby
can :manage, :all                     # 모든 모델의 모든 액션
can :read, :all                       # 모든 모델 읽기
```

## 예외 처리

### ApplicationController에 추가
```ruby
class ApplicationController < ActionController::Base
  rescue_from CanCan::AccessDenied do |exception|
    redirect_to root_path, alert: exception.message
  end
end
```

## 테스트

### RSpec 예시
```ruby
# spec/models/ability_spec.rb
require 'rails_helper'
require 'cancan/matchers'

RSpec.describe Ability do
  describe "Post abilities" do
    let(:user) { create(:user) }
    let(:other_user) { create(:user) }
    let(:my_post) { create(:post, user: user) }
    let(:other_post) { create(:post, user: other_user) }
    
    subject(:ability) { Ability.new(user) }
    
    it { is_expected.to be_able_to(:read, my_post) }
    it { is_expected.to be_able_to(:update, my_post) }
    it { is_expected.not_to be_able_to(:update, other_post) }
  end
end
```

## 주의사항

- CanCanCan은 기본적으로 모든 액션을 거부합니다. `can`으로 명시적으로 허용해야 합니다.
- `can :manage, :all`은 매우 강력하므로 관리자에게만 부여하세요.
- `load_and_authorize_resource`는 RESTful 컨트롤러에서만 잘 작동합니다.
- 복잡한 권한은 블록을 사용하되, 성능에 주의하세요.
- AdminUser는 일반 User와 별도로 관리됩니다.

## 다음 단계

1. 실제 비즈니스 모델 생성 (User, Post 등)
2. Ability 클래스에 세부 권한 규칙 정의
3. Controller에 권한 체크 추가
4. 필요시 Decorator 추가
5. ActiveAdmin에 리소스 등록
6. 프로덕션 환경을 위한 보안 설정 강화

## 참고 자료

- CanCanCan Wiki: https://github.com/CanCanCommunity/cancancan/wiki
- ActiveAdmin Docs: https://activeadmin.info/
- Devise Guide: https://github.com/heartcombo/devise
