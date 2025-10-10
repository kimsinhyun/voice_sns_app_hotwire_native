# Hotwire Native 가이드

## 목차
1. [Hotwire Native란?](#hotwire-native란)
2. [iOS 앱 설정](#ios-앱-설정)
3. [Rails Turbo Native 설정](#rails-turbo-native-설정)
4. [Bridge Components](#bridge-components)
5. [Path Configuration](#path-configuration)
6. [실제 사용 예제](#실제-사용-예제)
7. [트러블슈팅](#트러블슈팅)

---

## Hotwire Native란?

**Hotwire Native**는 Ruby on Rails 애플리케이션을 네이티브 모바일 앱으로 변환하는 프레임워크입니다. 웹 콘텐츠를 네이티브 컨테이너에서 실행하면서도 완전한 네이티브 앱 경험을 제공합니다.

### 핵심 구성 요소

1. **Turbo Native**: 웹뷰 기반의 네이티브 내비게이션
2. **Bridge Components**: 웹과 네이티브 간 양방향 통신
3. **Path Configuration**: URL 패턴별 화면 동작 제어

### 장점

- ✅ **빠른 개발**: Rails 코드로 대부분의 기능 구현
- ✅ **네이티브 경험**: 진짜 네이티브 앱처럼 동작
- ✅ **유지보수 용이**: 한 곳에서 웹과 앱 동시 관리
- ✅ **점진적 개선**: 필요한 부분만 네이티브로 구현

---

## iOS 앱 설정

### 1. Hotwire Native 라이브러리 설치

**Package.swift** 또는 Xcode의 Swift Package Manager에서:

```swift
dependencies: [
    .package(url: "https://github.com/hotwired/hotwire-native-ios", from: "1.2.2")
]
```

### 2. AppDelegate 설정

**역할**: 앱 시작 시 Path Configuration과 Bridge Components를 등록합니다.

```swift
import UIKit
import HotwireNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Path Configuration 로드
        configurePathConfiguration()
        
        // Bridge Components 등록
        configureBridgeComponents()
        
        // Debug 로깅 활성화 (개발 중)
        Hotwire.config.debugLoggingEnabled = true
        
        return true
    }
    
    private func configurePathConfiguration() {
        guard let pathConfigURL = Bundle.main.url(forResource: "path-configuration", withExtension: "json") else {
            print("⚠️ path-configuration.json not found")
            return
        }
        
        Hotwire.loadPathConfiguration(from: [
            .file(pathConfigURL)
        ])
        
        print("✅ Path configuration loaded")
    }
    
    private func configureBridgeComponents() {
        Hotwire.registerBridgeComponents([
            ButtonComponent.self,
            FormComponent.self,
            MenuComponent.self
        ])
        
        print("✅ Bridge components registered")
    }
}
```

### 3. SceneDelegate 설정

**역할**: window를 초기화하고 Navigator를 시작합니다.

```swift
import HotwireNative
import UIKit

let rootURL = URL(string: "http://localhost:3000")!

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private lazy var navigator: Navigator = {
        let config = Navigator.Configuration(
            name: "main",
            startLocation: rootURL
        )
        return Navigator(configuration: config, delegate: self)
    }()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // Window 초기화 (중요!)
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigator.rootViewController
        window?.makeKeyAndVisible()
        
        // Navigator 시작 (공식 문서 권장)
        navigator.start()
    }
}

// MARK: - NavigatorDelegate
extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        // 기본적으로 모든 방문 승인
        // 나중에 네이티브 스크린을 추가할 때 여기서 처리
        return .accept
    }
}
```

**효과**:
- ✅ Rails 서버의 화면이 네이티브 컨테이너에서 로드
- ✅ 네이티브 화면 전환 애니메이션 적용
- ✅ iOS 스타일의 네비게이션 동작
- ✅ Path Configuration이 자동으로 적용
- ✅ Bridge Components가 활성화
- ✅ NavigatorDelegate로 네이티브 스크린 라우팅 준비

---

## Rails Turbo Native 설정

### 1. ApplicationController 헬퍼 메서드

**역할**: 요청이 네이티브 앱에서 온 것인지 구분합니다.

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  # Turbo Native 앱에서 오는 요청인지 확인
  def turbo_native_app?
    request.user_agent.to_s.match?(/Turbo Native/)
  end
  helper_method :turbo_native_app?
end
```

**효과**:
- ✅ 앱과 웹에 각각 다른 UI 제공 가능
- ✅ 네이티브 전용 기능 조건부 표시

### 2. Layout 수정

**역할**: 네이티브 앱에 최적화된 메타 태그와 스타일을 추가합니다.

```erb
<!-- app/views/layouts/application.html.erb -->
<% if turbo_native_app? %>
  <!-- Turbo Native 전용 메타 태그 -->
  <meta name="turbo-visit-control" content="reload">
  <meta name="turbo-cache-control" content="no-cache">
  
  <style>
    /* iOS Safe Area 지원 */
    :root {
      --safe-area-inset-top: env(safe-area-inset-top);
      --safe-area-inset-bottom: env(safe-area-inset-bottom);
    }
    
    /* 네이티브 앱에서 웹뷰 스크롤 개선 */
    body {
      -webkit-overflow-scrolling: touch;
    }
  </style>
<% end %>
```

**효과**:
- ✅ iPhone 노치 영역 자동 처리
- ✅ 부드러운 스크롤 동작
- ✅ 캐싱 전략 제어

---

## Bridge Components

Bridge Components는 **웹과 네이티브가 양방향으로 통신**하는 핵심 메커니즘입니다.

### 개념

- **Rails (Stimulus)**: 네이티브에게 명령 전송 + 이벤트 수신
- **iOS (Swift)**: 명령 수신 + 네이티브 UI 표시 + 이벤트 전송

### 구조

```
Rails (Stimulus)         →  메시지  →         iOS (Swift)
     ↓                                            ↓
웹에서 "버튼 보여줘"                    네비게이션 바에 UIButton 추가
     ↓                                            ↓
이벤트 핸들러 대기       ←  클릭 이벤트  ←      사용자가 버튼 탭
```

### 1. Button Bridge Component

**목적**: 네비게이션 바에 네이티브 버튼 표시

#### Rails (Stimulus)

```javascript
// app/javascript/controllers/bridge/button_controller.js
import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "button"
  static values = {
    title: String,
    style: { type: String, default: "plain" }, // plain, done
    position: { type: String, default: "right" } // left, right
  }

  connect() {
    super.connect()
    
    if (this.enabled) {
      this.send("connect", {
        title: this.titleValue,
        style: this.styleValue,
        position: this.positionValue
      }, () => {
        // 네이티브 버튼 클릭 시 실행
        this.performAction()
      })
    }
  }

  disconnect() {
    if (this.enabled) {
      this.send("disconnect", {}, () => {})
    }
    super.disconnect()
  }

  performAction() {
    // 커스텀 액션 디스패치
    if (this.element.dataset.bridgeButtonAction) {
      const action = this.element.dataset.bridgeButtonAction
      const event = new CustomEvent(action, { bubbles: true })
      this.element.dispatchEvent(event)
    }
  }
}
```

#### iOS (Swift)

```swift
// voice_talk_ios/voice_talk_ios/Bridge/Components/ButtonComponent.swift
import HotwireNative
import UIKit

final class ButtonComponent: BridgeComponent {
    override class var name: String { "button" }
    
    private var barButtonItem: UIBarButtonItem?
    
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else { return }
        
        switch event {
        case .connect:
            handleConnect(message: message)
        case .disconnect:
            handleDisconnect()
        }
    }
    
    // 공식 문서 권장: computed property로 viewController 접근
    private var viewController: UIViewController? {
        delegate.destination as? UIViewController
    }
    
    private func handleConnect(message: Message) {
        guard let data: MessageData = message.data(),
              let viewController = viewController,
              let navigationController = viewController.navigationController else { return }
        
        // 공식 문서 권장: UIAction 사용 (modern API)
        let action = UIAction { [weak self] _ in
            self?.reply(to: "connect")
        }
        
        let button = UIBarButtonItem(
            title: data.title,
            primaryAction: action
        )
        
        // 스타일 적용
        if data.style == "done" {
            button.style = .done
        } else {
            button.style = .plain
        }
        
        barButtonItem = button
        
        // 네비게이션 바에 추가
        if data.position == "left" {
            viewController.navigationItem.leftBarButtonItem = button
        } else {
            viewController.navigationItem.rightBarButtonItem = button
        }
    }
    
    private func handleDisconnect() {
        guard let viewController = viewController else { return }
        viewController.navigationItem.rightBarButtonItem = nil
        viewController.navigationItem.leftBarButtonItem = nil
        barButtonItem = nil
    }
}

private extension ButtonComponent {
    struct MessageData: Decodable {
        let title: String
        let style: String?
        let position: String?
    }
    
    enum Event: String {
        case connect
        case disconnect
    }
}
```

#### 사용 예제

```erb
<!-- 네비게이션 바에 "저장" 버튼 추가 -->
<div data-controller="bridge--button"
     data-bridge--button-title-value="저장"
     data-bridge--button-style-value="done"
     data-bridge--button-position-value="right"
     data-bridge--button-action="save">
  <!-- 폼 또는 콘텐츠 -->
</div>
```

**효과**:
- ❌ 이전: 웹뷰 안의 HTML 버튼
- ✅ 이후: iOS 네비게이션 바의 진짜 네이티브 버튼

---

### 2. Form Bridge Component

**목적**: 폼 제출 버튼을 네비게이션 바에 네이티브로 표시

#### 사용 예제

```erb
<%= form_with model: @user, 
     data: { 
       controller: "bridge--form",
       bridge__form_submit_title_value: "완료",
       action: "input->bridge--form#handleInput"
     } do |f| %>
  
  <%= f.text_field :name %>
  <%= f.email_field :email %>
  
  <%= f.submit "완료", data: { bridge__form_target: "submit" } %>
<% end %>
```

**효과**:
- ❌ 이전: 폼 아래 HTML 제출 버튼
- ✅ 이후: 네비게이션 바의 "완료" 버튼 (iOS 스타일)
- ✅ 폼 유효성에 따라 버튼 자동 활성화/비활성화

---

### 3. Menu Bridge Component

**목적**: 액션 시트를 네이티브 UIAlertController로 표시

#### 사용 예제

```erb
<div data-controller="bridge--menu"
     data-bridge--menu-title-value="설정"
     data-bridge--menu-items-value='[
       {"index": 0, "title": "프로필", "url": "/profile"},
       {"index": 1, "title": "로그아웃", "style": "destructive", "url": "/logout", "method": "delete"}
     ]'>
  
  <button data-action="click->bridge--menu#display">메뉴</button>
</div>
```

**효과**:
- ❌ 이전: 웹 스타일의 드롭다운 메뉴
- ✅ 이후: iOS 네이티브 액션 시트 (아래에서 올라옴)

---

## Path Configuration

### Path Configuration이란?

**Path Configuration**은 URL 패턴별로 화면 표시 방식을 제어하는 JSON 기반 라우팅 시스템입니다. 웹의 라우터처럼 작동하지만, **앱 내에서 화면이 어떻게 표시될지**를 결정합니다.

참고: [Hotwire Native iOS Path Configuration](https://native.hotwired.dev/ios/path-configuration)

### 왜 Path Configuration을 사용해야 하나?

#### 1. **원격 업데이트 가능**
- 앱스토어 심사 없이 화면 동작 변경 가능
- 긴급 버그 발생 시 즉시 대응

#### 2. **일관된 라우팅**
- 웹 화면과 네이티브 화면을 동일한 방식으로 관리
- 예측 가능한 네비게이션 흐름

#### 3. **Progressive Rollout (점진적 배포)**
- 네이티브 화면에 버그가 있으면 즉시 웹으로 전환
- A/B 테스트 가능

참고: [Native Screens - Progressive Rollout](https://native.hotwired.dev/ios/native-screens)

### path-configuration.json 예시

```json
{
  "settings": {
    "screenshots_enabled": true
  },
  "rules": [
    {
      "patterns": ["/login$", "/register$"],
      "properties": {
        "context": "modal",
        "pull_to_refresh_enabled": false
      }
    },
    {
      "patterns": ["/feed$", "/$"],
      "properties": {
        "context": "default",
        "pull_to_refresh_enabled": true
      }
    }
  ]
}
```

### Properties 설명

| Property | 값 | 설명 |
|----------|---|------|
| `context` | `modal` | 아래에서 올라오는 모달 방식 |
|  | `default` | 오른쪽에서 슬라이드 (일반 push) |
| `pull_to_refresh_enabled` | `true/false` | 당겨서 새로고침 활성화 |
| `view_controller` | 식별자 문자열 | 네이티브 화면 지정 (아래 섹션 참조) |

### 로컬 & 원격 Configuration

```swift
// AppDelegate.swift
private func configurePathConfiguration() {
    let localURL = Bundle.main.url(forResource: "path-configuration", withExtension: "json")!
    let remoteURL = URL(string: "https://example.com/ios_config.json")!
    
    Hotwire.loadPathConfiguration(from: [
        .file(localURL),      // 1순위: 로컬 (오프라인 대비)
        .server(remoteURL)    // 2순위: 원격 (업데이트 가능)
    ])
}
```

**로딩 순서**:
1. 로컬 파일 (앱 번들)
2. 캐시된 원격 파일 (이전 다운로드)
3. 새로 다운로드된 원격 파일

**효과**:
- ✅ 로그인/회원가입: 모달로 표시 (인증이 필요 없는 → 필요한 화면)
- ✅ 피드: 일반 push (메인 화면)
- ✅ 화면별로 다른 애니메이션과 동작
- ✅ 앱스토어 심사 없이 긴급 변경 가능

---

## 네이티브 스크린 (Native Screens)

완전히 네이티브로 구현된 화면도 Path Configuration을 통해 라우팅할 수 있습니다.

참고: [Native Screens 공식 문서](https://native.hotwired.dev/ios/native-screens)

### 왜 네이티브 스크린도 Path Configuration을 쓰나?

#### 1. **긴급 롤백 가능**

네이티브 화면에 심각한 버그 발견:
```json
// 긴급 상황: view_controller 제거하면 즉시 웹으로 전환
{
  "patterns": ["/profile$"],
  "properties": { }  // view_controller 제거 → 웹 화면으로
}
```

- ❌ 일반 네이티브 앱: 버그 수정 → 제출 → 심사 대기 (1주일)
- ✅ Path Configuration: JSON 업데이트 (즉시)

#### 2. **점진적 네이티브 전환**

처음에는 웹으로 시작:
```json
{
  "patterns": ["/profile$"],
  "properties": { }  // 웹 화면
}
```

네이티브 구현 완료 후:
```json
{
  "patterns": ["/profile$"],
  "properties": {
    "view_controller": "profile"  // 네이티브 화면으로 전환
  }
}
```

### 네이티브 스크린 구현 예시

#### 1. View Controller 생성

```swift
// ProfileViewController.swift
class ProfileViewController: UIViewController, PathConfigurationIdentifiable {
    static var pathConfigurationIdentifier: String { "profile" }
    
    let url: URL
    
    init(url: URL) {
        self.url = url
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // 네이티브 UI 구현
    }
}
```

#### 2. Path Configuration 설정

```json
{
  "patterns": ["/profile$"],
  "properties": {
    "view_controller": "profile",
    "context": "default"
  }
}
```

#### 3. NavigatorDelegate에서 처리

```swift
// SceneDelegate.swift
extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        switch proposal.viewController {
        case ProfileViewController.pathConfigurationIdentifier:
            let vc = ProfileViewController(url: proposal.url)
            return .acceptCustom(vc)
        default:
            return .accept
        }
    }
}
```

### 네이티브 vs 웹 전환 전략

| 시나리오 | Path Configuration 설정 |
|---------|----------------------|
| 웹 화면 | `properties: {}` |
| 네이티브 화면 | `properties: { "view_controller": "식별자" }` |
| 긴급 롤백 | `view_controller` 제거 → 웹으로 |
| A/B 테스트 | 원격 Config에서 사용자별 분기 |

**효과**:
- ✅ 네이티브 화면도 URL 기반 라우팅
- ✅ 버그 발생 시 즉시 웹으로 롤백
- ✅ 점진적으로 네이티브화 가능
- ✅ 일관된 네비게이션 흐름

---

## 실제 사용 예제

### 예제 1: 로그인 화면

```erb
<!-- app/views/devise/sessions/new.html.erb -->
<%= form_for(resource, as: resource_name, url: session_path(resource_name), 
     html: { 
       class: "space-y-6",
       data: { 
         controller: "bridge--form",
         bridge__form_submit_title_value: "로그인",
         action: "input->bridge--form#handleInput"
       }
     }) do |f| %>
  
  <%= f.email_field :email %>
  <%= f.password_field :password %>
  
  <%= f.submit "로그인", data: { bridge__form_target: "submit" } %>
<% end %>
```

**결과**:
- 네이티브 앱에서: 상단 바에 "로그인" 버튼 표시, HTML 버튼 숨김
- 웹 브라우저에서: 일반 HTML 버튼 표시

---

### 예제 2: 피드 화면

```erb
<!-- app/views/feed/index.html.erb -->
<div data-controller="bridge--button bridge--menu"
     data-bridge--button-title-value="메뉴"
     data-bridge--button-action="menu:display"
     data-bridge--menu-items-value='[...]'>
  
  <h1>Voice Talk</h1>
  
  <!-- 웹 브라우저에서만 표시 -->
  <% unless turbo_native_app? %>
    <button data-action="click->bridge--menu#display">메뉴</button>
  <% end %>
  
  <!-- 콘텐츠 -->
</div>
```

**결과**:
- 네이티브 앱에서: 상단 바에 "메뉴" 버튼 → 탭하면 iOS 액션 시트
- 웹 브라우저에서: 화면 내 "메뉴" 버튼

---

## 공식 문서 Best Practices

### 1. ViewController 접근 패턴

**❌ 잘못된 방법 (크래시 가능)**:
```swift
if let navigationController = delegate.destination.navigationController {
    // delegate.destination이 UIViewController가 아니면 컴파일 에러!
}
```

**✅ 공식 권장 방법**:
```swift
private var viewController: UIViewController? {
    delegate.destination as? UIViewController
}

// 사용
guard let viewController = viewController,
      let navigationController = viewController.navigationController else { return }
```

참고: [Bridge Components 공식 문서](https://native.hotwired.dev/ios/bridge-components)

### 2. UIBarButtonItem 생성

**❌ 오래된 방법 (target/action)**:
```swift
let button = UIBarButtonItem(
    title: "Save",
    style: .done,
    target: self,
    action: #selector(buttonTapped)
)
```

**✅ 공식 권장 (UIAction - iOS 14+)**:
```swift
let action = UIAction { [weak self] _ in
    self?.reply(to: "connect")
}
let button = UIBarButtonItem(title: "Save", primaryAction: action)
```

### 3. Navigator 시작

**✅ 공식 권장**:
```swift
navigator.start()  // startLocation으로 자동 이동
```

**🟡 대안 (수동 라우팅)**:
```swift
navigator.route(url)  // 특정 URL로 직접 이동
```

참고: [Getting Started](https://native.hotwired.dev/ios/getting-started)

---

## 트러블슈팅

### 1. 화면이 빈 화면으로 나옴

**원인**: `window`가 제대로 초기화되지 않음

**해결**:
```swift
window = UIWindow(windowScene: windowScene)
window?.rootViewController = navigator.rootViewController
window?.makeKeyAndVisible()  // 이 줄 필수!
```

---

### 2. Bridge Component가 작동하지 않음

**원인**: AppDelegate에서 Bridge Components가 등록되지 않음

**해결**:
```swift
// AppDelegate.swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    Hotwire.registerBridgeComponents([
        ButtonComponent.self,
        FormComponent.self,
        MenuComponent.self
    ])
    return true
}
```

---

### 3. Path Configuration이 적용되지 않음

**원인**: JSON 파일이 번들에 포함되지 않음

**해결**: Xcode에서 `path-configuration.json`을 프로젝트에 추가하고 Target Membership 확인

---

### 4. 네이티브와 웹이 구분되지 않음

**원인**: User-Agent 확인 실패

**해결**:
```ruby
def turbo_native_app?
  request.user_agent.to_s.match?(/Turbo Native/)
end
```

Rails 서버 로그에서 User-Agent를 확인하세요.

---

## 개발 원칙

### 1. Rails 중심 개발

- 최대한 많은 로직을 Rails에서 처리
- 네이티브 코드는 UI 표시와 이벤트 전달만 담당

### 2. 재사용성

- Bridge Component는 범용적으로 설계
- 한 번 만든 컴포넌트를 여러 화면에서 재사용

### 3. 점진적 개선

- 처음에는 웹으로 빠르게 구현
- 필요한 부분만 Bridge Component로 네이티브화

### 4. 웹과 앱 모두 고려

- `turbo_native_app?`로 조건부 렌더링
- 웹 브라우저에서도 정상 작동하도록 보장

---

## 참고 자료

- [Hotwire Native 공식 문서](https://native.hotwired.dev/)
- [Hotwire Native iOS GitHub](https://github.com/hotwired/hotwire-native-ios)
- [iOS Path Configuration](https://native.hotwired.dev/ios/path-configuration)
- [iOS Bridge Components](https://native.hotwired.dev/ios/bridge-components)
- [iOS Configuration](https://native.hotwired.dev/ios/configuration)

