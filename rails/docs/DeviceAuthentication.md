# 기기 식별 자동 로그인 가이드

## 개요

이 문서는 Hotwire Native 앱에서 기기 식별자(IDFV)를 사용한 자동 로그인 시스템에 대해 설명합니다.

## 작동 방식

### 1. 기기 식별자 (IDFV)

iOS에서 `UIDevice.current.identifierForVendor`를 사용하여 기기별 고유 식별자를 가져옵니다.

**특징:**
- 앱이 설치되어 있는 동안 유지됩니다
- 앱을 삭제하면 초기화됩니다 (새로운 사용자로 취급)
- 같은 vendor의 앱들 간 공유됩니다

### 2. 자동 로그인 흐름

```
1. 앱 시작
   ↓
2. iOS에서 IDFV 가져오기
   ↓
3. POST /auth/device_login (device_id 전송)
   ↓
4. Rails: device_id로 사용자 찾기/생성
   ↓
5. 자동 로그인 처리
   ↓
6. Feed 화면으로 리다이렉트
```

### 3. Guest → 정식 사용자 업그레이드

Guest 사용자가 회원가입 화면에서 이메일/비밀번호를 입력하면:

1. 현재 로그인한 사용자가 guest인지 확인
2. Guest라면 기존 레코드에 이메일/비밀번호 추가 (device_id 유지)
3. 정식 사용자로 전환 완료

## 구현 파일

### Rails

#### 1. Migration
```ruby
# db/migrate/20251010132418_add_device_id_to_users.rb
add_column :users, :device_id, :string
add_index :users, :device_id, unique: true
```

#### 2. User 모델
```ruby
# app/models/user.rb
validates :device_id, uniqueness: true, allow_nil: true

def guest?
  device_id.present? && email.blank?
end

def registered?
  email.present?
end
```

#### 3. SessionsController
```ruby
# app/controllers/users/sessions_controller.rb
def device_login
  device_id = params[:device_id]
  user = User.find_or_create_by(device_id: device_id)
  sign_in(user)
  redirect_to feed_path
end
```

#### 4. RegistrationsController
```ruby
# app/controllers/users/registrations_controller.rb
def create
  if current_user&.guest?
    upgrade_guest_to_registered
  else
    super
  end
end
```

### iOS

#### SceneDelegate.swift
```swift
private func performDeviceLogin() {
    guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else {
        return
    }
    
    let loginURL = rootURL.appendingPathComponent("auth/device_login")
    var request = URLRequest(url: loginURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: String] = ["device_id": deviceId]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    URLSession.shared.dataTask(with: request).resume()
}
```

## 테스트 방법

### 1. 기본 자동 로그인 테스트

1. Rails 서버 시작:
   ```bash
   cd voice_talk_rails
   bin/dev
   ```

2. iOS 앱 실행 (Xcode)

3. 앱이 시작되면 자동으로 로그인되고 Feed 화면이 표시됩니다

4. Xcode 콘솔에서 확인:
   ```
   📱 Device ID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   ✅ Device login 응답: 302
   ```

5. Rails 로그에서 확인:
   ```
   Started POST "/auth/device_login"
   Processing by Users::SessionsController#device_login
   User Load (0.5ms) SELECT "users".* FROM "users" WHERE "users"."device_id" = $1
   User Create (1.2ms) INSERT INTO "users" ("device_id", ...) VALUES ($1, ...)
   ```

### 2. Guest 사용자 확인

Rails 콘솔에서 확인:
```ruby
# Rails 콘솔 실행
bin/rails console

# Guest 사용자 조회
user = User.last
user.guest?        # => true
user.registered?   # => false
user.device_id     # => "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
user.email         # => nil
```

### 3. 회원가입 업그레이드 테스트

1. 앱에서 회원가입 화면으로 이동

2. 이메일/비밀번호 입력 후 가입

3. Rails 콘솔에서 확인:
   ```ruby
   user = User.last
   user.guest?        # => false
   user.registered?   # => true
   user.device_id     # => "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" (유지됨)
   user.email         # => "test@example.com" (추가됨)
   ```

### 4. 앱 재설치 테스트

1. iOS 시뮬레이터에서 앱 삭제
2. 앱 재설치 및 실행
3. 새로운 device_id로 새로운 guest 사용자가 생성됨 (완전히 새로운 사용자)

## API 엔드포인트

### POST /auth/device_login

기기 식별자로 자동 로그인

**Request:**
```json
{
  "device_id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
```

**Response:**
- 성공: 302 Redirect to /feed
- 실패: 400 Bad Request

**Parameters:**
- `device_id` (required): iOS IDFV 문자열

## 보안 고려사항

### 1. CSRF 토큰

Device login 엔드포인트는 CSRF 검증을 건너뜁니다:
```ruby
skip_before_action :verify_authenticity_token, only: [:device_login]
```

이는 네이티브 앱에서 호출되기 때문에 안전합니다.

### 2. Device ID 중복 방지

Database unique index로 중복 방지:
```ruby
add_index :users, :device_id, unique: true
```

### 3. Guest 사용자 제한

필요시 Guest 사용자에 대한 기능 제한을 추가할 수 있습니다:
```ruby
# 예시: ApplicationController
def require_registered_user
  if current_user&.guest?
    redirect_to register_path, alert: "이 기능은 회원가입이 필요합니다"
  end
end
```

## 장점

1. **마찰 없는 온보딩**: 사용자가 즉시 앱을 사용할 수 있습니다
2. **점진적 회원가입**: 나중에 필요할 때 회원가입 가능
3. **데이터 유지**: Guest → 정식 사용자 전환 시 데이터 보존
4. **간단한 구현**: 복잡한 OAuth 없이 구현 가능

## 한계

1. **앱 삭제 시 초기화**: 앱 재설치 시 새로운 사용자로 취급됨
2. **기기 종속**: 다른 기기에서 같은 계정 사용 불가 (guest 상태일 때)
3. **계정 복구 불가**: Guest 사용자는 비밀번호가 없어 복구 불가

## 확장 가능성

### 1. 여러 기기 연동

정식 사용자로 전환 후 여러 기기를 연동할 수 있습니다:
```ruby
# User 모델에 devices 관계 추가
has_many :devices
```

### 2. Guest 사용자 통계

Guest 사용자 전환율 추적:
```ruby
User.where.not(device_id: nil).where(email: nil).count  # Guest 사용자
User.where.not(device_id: nil).where.not(email: nil).count  # 전환된 사용자
```

### 3. 정책 기반 제한

Guest 사용자에 대한 제한 정책:
```ruby
class GuestPolicy
  def can_create_room?
    false  # Guest는 방 생성 불가
  end
  
  def can_join_room?
    true   # Guest도 방 참여 가능
  end
end
```

