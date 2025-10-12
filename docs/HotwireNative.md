# Hotwire Native 가이드

## 목차
1. [Hotwire Native란?](#hotwire-native란)
2. [iOS 앱 설정](#ios-앱-설정)
3. [Rails Turbo Native 설정](#rails-turbo-native-설정)
4. [Bridge Components](#bridge-components)
5. [Path Configuration](#path-configuration)
6. [Native Screens](#native-screens)
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
// voice_talk_ios/voice_talk_ios/AppDelegate.swift
import UIKit
import HotwireNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, 
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Path Configuration 로드 (로컬/원격)
        let pathConfigURL = Bundle.main.url(forResource: "path-configuration", withExtension: "json")!
        Hotwire.loadPathConfiguration(from: [.file(pathConfigURL)])
        
        // Bridge Components 등록
        Hotwire.registerBridgeComponents([
            ButtonComponent.self,
            FormComponent.self,
            AudioRecorderComponent.self
        ])
        
        return true
    }
}
```

### 3. SceneDelegate 설정

**역할**: window를 초기화하고 Navigator를 시작합니다.

```swift
// voice_talk_ios/voice_talk_ios/SceneDelegate.swift
import HotwireNative
import UIKit

let rootURL = URL(string: "http://localhost:3000")!

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private lazy var navigator: Navigator = {
        Navigator(configuration: Navigator.Configuration(
            name: "main",
            startLocation: rootURL
        ), delegate: self)
    }()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, 
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigator.rootViewController
        window?.makeKeyAndVisible()
        navigator.start()  // Rails 화면 로드
    }
}

extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        return .accept  // 기본: 모든 방문 승인
    }
}
```

**핵심 포인트**:
- `navigator.start()`: startLocation으로 자동 이동
- `NavigatorDelegate`: 네이티브 스크린 라우팅 (아래 섹션 참조)
- Path Configuration이 자동 적용

---

## Rails Turbo Native 설정

### 1. Layout 설정

**역할**: 네이티브 앱 최적화 스타일 추가

```erb
<!-- app/views/layouts/application.html.erb -->
<meta name="turbo-visit-control" content="reload">

<style>
  /* iOS Safe Area 지원 */
  :root {
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
  }
</style>
```

### 2. ApplicationController (선택사항)

웹 브라우저 접근을 별도로 처리하고 싶다면:

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  def turbo_native_app?
    request.user_agent.to_s.match?(/Turbo Native/)
  end
  helper_method :turbo_native_app?
end
```

---

## Bridge Components

Bridge Components는 **웹과 네이티브 간 양방향 통신**을 가능하게 합니다.

### 핵심 개념

```
HTML → Stimulus Controller ⟷ (this.send / reply) ⟷ Native Component
                ↕                                          ↕
            UI 상태 관리                               OS API 호출
```

### 통신 패턴

**JavaScript → Native**:
```javascript
const result = await this.send("eventName", { data })
```

**Native → JavaScript**:
```swift
reply(to: "eventName", with: ["data": value])
```

### 상세 가이드

Bridge Component의 자세한 설명, 예제, 개발 원칙은 별도 문서를 참조하세요:

📖 **[BridgeComponent.md](./BridgeComponent.md)** - Bridge Component 완전 가이드

**포함 내용**:
- 통신 구조와 다이어그램
- 메시지 패턴
- 버튼, 폼, 음성 녹음 등 구현 예제
- 개발 원칙 (Rails-First, 재사용성, 점진적 개선)

---

## Path Configuration

### 개념

**Path Configuration**은 URL 패턴별로 화면 표시 방식을 제어하는 JSON 기반 라우팅 시스템입니다.

참고: [Path Configuration 공식 문서](https://native.hotwired.dev/ios/path-configuration)

### 주요 기능

1. **원격 업데이트**: 앱스토어 심사 없이 화면 동작 변경
2. **일관된 라우팅**: Rails/네이티브 화면을 동일한 방식으로 관리
3. **긴급 롤백**: 네이티브 화면에 문제 발생 시 즉시 Rails 화면으로 전환

### 설정 예시

```json
{
  "rules": [
    {
      "patterns": ["/login$", "/register$"],
      "properties": {
        "context": "modal",
        "pull_to_refresh_enabled": false
      }
    },
    {
      "patterns": ["/feed$"],
      "properties": {
        "context": "default",
        "pull_to_refresh_enabled": true
      }
    }
  ]
}
```

### 주요 Properties

| Property | 설명 | 값 |
|----------|------|-----|
| `context` | 화면 전환 방식 | `modal`, `default` |
| `pull_to_refresh_enabled` | 당겨서 새로고침 | `true`, `false` |
| `view_controller` | 네이티브 화면 지정 | 문자열 식별자 |

### 로컬/원격 설정

```swift
Hotwire.loadPathConfiguration(from: [
    .file(localURL),      // 로컬 (오프라인 대비)
    .server(remoteURL)    // 원격 (실시간 업데이트)
])
```

---

## Native Screens

완전히 네이티브로 구현된 화면도 Path Configuration을 통해 라우팅할 수 있습니다.

참고: [Native Screens 공식 문서](https://native.hotwired.dev/ios/native-screens)

### Path Configuration으로 네이티브 화면 지정

```json
{
  "patterns": ["/profile$"],
  "properties": {
    "view_controller": "profile"
  }
}
```

### 구현 단계

**1. View Controller 생성**:
```swift
class ProfileViewController: UIViewController, PathConfigurationIdentifiable {
    static var pathConfigurationIdentifier: String { "profile" }
    
    let url: URL
    init(url: URL) { ... }
}
```

**2. NavigatorDelegate 처리**:
```swift
extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        switch proposal.viewController {
        case ProfileViewController.pathConfigurationIdentifier:
            return .acceptCustom(ProfileViewController(url: proposal.url))
        default:
            return .accept
        }
    }
}
```

### 장점

- ✅ 긴급 롤백: 네이티브 화면에 문제 발생 시 `view_controller` 제거로 Rails 화면으로 전환
- ✅ URL 기반 라우팅 일관성 유지
- ✅ 원격 Config로 앱스토어 심사 없이 화면 동작 변경 가능

---

## Best Practices

### 1. ViewController 접근

```swift
// ✅ 안전한 방법
private var viewController: UIViewController? {
    delegate.destination as? UIViewController
}
```

### 2. UIBarButtonItem 생성

```swift
// ✅ 모던 API (iOS 14+)
let action = UIAction { [weak self] _ in
    self?.reply(to: "connect")
}
let button = UIBarButtonItem(title: "Save", primaryAction: action)
```

---

## 트러블슈팅

### 빈 화면 표시

```swift
// window 초기화 시 makeKeyAndVisible() 필수
window?.makeKeyAndVisible()
```

### Bridge Component 미작동

```swift
// AppDelegate에서 컴포넌트 등록 확인
Hotwire.registerBridgeComponents([
    ButtonComponent.self,
    AudioRecorderComponent.self
])
```

### Path Configuration 미적용

Xcode에서 `path-configuration.json`의 Target Membership 확인

### User-Agent 확인 (선택사항)

웹 브라우저 접근을 구분하고 싶다면:

```ruby
def turbo_native_app?
  request.user_agent.to_s.match?(/Turbo Native/)
end
```

---

## 참고 자료

### 프로젝트 문서

- [BridgeComponent.md](./BridgeComponent.md) - Bridge Component 완전 가이드
- [AudioRecordingBridge.md](./AudioRecordingBridge.md) - 음성 녹음 구현 가이드
- [DeviceAuthentication.md](./DeviceAuthentication.md) - 디바이스 인증 가이드

### 공식 문서

- [Hotwire Native 공식 문서](https://native.hotwired.dev/)
- [Bridge Components 개요](https://native.hotwired.dev/overview/bridge-components)
- [iOS Path Configuration](https://native.hotwired.dev/ios/path-configuration)
- [iOS Bridge Components](https://native.hotwired.dev/ios/bridge-components)
- [iOS Native Screens](https://native.hotwired.dev/ios/native-screens)

---

**작성일**: 2025-10-11  
**최종 업데이트**: 2025-10-12  
**상태**: ✅ 간소화 완료

