# Bridge Component 가이드

## 목차
1. [Bridge Component란?](#bridge-component란)
2. [통신 구조](#통신-구조)
3. [메시지 패턴](#메시지-패턴)
4. [구현 예제](#구현-예제)
5. [개발 원칙](#개발-원칙)

---

## Bridge Component란?

**Bridge Component**는 Hotwire Native에서 웹(Stimulus)과 네이티브(Swift/Kotlin) 간 양방향 통신을 가능하게 하는 핵심 메커니즘입니다.

### 핵심 개념

- **웹 우선**: UI와 비즈니스 로직은 Rails에서 제어
- **네이티브 보완**: OS 기능(카메라, 마이크 등)은 네이티브로 처리
- **양방향 통신**: JavaScript ↔ Native 메시지 교환

### 공식 문서

- [Bridge Components 개요](https://native.hotwired.dev/overview/bridge-components)
- [iOS Bridge Components](https://native.hotwired.dev/ios/bridge-components)
- [Android Bridge Components](https://native.hotwired.dev/android/bridge-components)

---

## 통신 구조

### 다이어그램

```
┌──────────┐                ┌──────────────────┐               ┌──────────────────┐
│   HTML   │──connect()────→│    Stimulus      │               │     Native       │
│          │                │   Controller     │               │    Component     │
└──────────┘                │                  │               │                  │
                            │                  │──this.send()─→│                  │
                            │                  │               │                  │
                            │                  │←─reply(to:)───│                  │
                            └──────────────────┘               └──────────────────┘
                                    ↕                                  ↕
                              UI 상태 관리                      OS API 호출
                              (타이머, 진행바)                  (녹음, 카메라)
```

### 통신 흐름

1. **HTML**: `data-controller="bridge--component-name"` 선언
2. **Stimulus**: `connect()` 시 Bridge Component 활성화
3. **JavaScript → Native**: `this.send(event, data, callback)`
4. **Native 처리**: OS API 호출 (예: 녹음 시작)
5. **Native → JavaScript**: `reply(to: event, with: data)`
6. **JavaScript**: callback 실행 및 UI 업데이트

---

## 메시지 패턴

### JavaScript → Native

```javascript
// BridgeComponent를 상속받은 Stimulus Controller
export default class extends BridgeComponent {
  static component = "button"  // Native와 동일한 이름
  
  async someAction() {
    // 메시지 전송 및 응답 대기
    const result = await this.send("eventName", { param: "value" })
    
    // 응답 처리
    if (result.success) {
      console.log("성공:", result.data)
    }
  }
}
```

### Native → JavaScript

```swift
// iOS (Swift)
final class ButtonComponent: BridgeComponent {
    override class var name: String { "button" }  // JavaScript와 동일
    
    override func onReceive(message: Message) {
        // 메시지 수신 처리
        switch message.event {
        case "eventName":
            handleEvent(message: message)
        }
    }
    
    private func handleEvent(message: Message) {
        // OS API 호출
        performNativeAction()
        
        // 응답 전송
        reply(to: "eventName", with: ["success": true, "data": "value"])
    }
}
```

### 메시지 프로토콜

| 방향 | 메서드 | 설명 |
|------|--------|------|
| JS → Native | `this.send(event, data, callback)` | 메시지 전송 및 응답 대기 |
| Native → JS | `reply(to: event, with: data)` | 응답 전송 |

---

## 구현 예제

### 네이티브 버튼

네비게이션 바에 네이티브 버튼을 표시하는 예제입니다.

#### JavaScript (Stimulus)

```javascript
// app/javascript/controllers/bridge/button_controller.js
import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "button"

  connect() {
    super.connect()

    const element = this.bridgeElement
    const title = element.bridgeAttribute("title")
    this.send("connect", {title}, () => {
      this.element.click()
    })
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

    override func onReceive(message: Message) {
        guard let viewController else { return }
        addButton(via: message, to: viewController)
    }

    private var viewController: UIViewController? {
        delegate?.destination as? UIViewController
    }

    private func addButton(via message: Message, to viewController: UIViewController) {
        guard let data: MessageData = message.data() else { return }

        let action = UIAction { [unowned self] _ in
            self.reply(to: "connect")
        }
        let item = UIBarButtonItem(title: data.title, primaryAction: action)
        viewController.navigationItem.rightBarButtonItem = item
    }
}

private extension ButtonComponent {
    struct MessageData: Decodable {
        let title: String
    }
}
```

#### Android (Kotlin)

```kotlin
class ButtonComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    override fun onReceive(message: Message) {
        // Handle incoming messages based on the message `event`.
        when (message.event) {
            "connect" -> handleConnectEvent(message)
            else -> Log.w("ButtonComponent", "Unknown event for message: $message")
        }
    }

    private fun handleConnectEvent(message: Message) {
        val data = message.data<MessageData>() ?: return

        // Write native code to display a native submit button in the
        // toolbar displayed in the delegate.destination. Use the
        // incoming data.title to set the button title.
    }

    private fun performButtonClick(): Boolean {
        return replyTo("connect")
    }

    // Use kotlinx.serialization annotations to define a serializable
    // data class that represents the incoming message.data json.
    @Serializable
    data class MessageData(
        @SerialName("title") val title: String
    )
}
```

#### HTML (ERB)

```erb
<!-- 네비게이션 바에 "저장" 버튼 추가 -->
<div data-controller="bridge--button"
     data-bridge--button-title-value="저장">
  <!-- 폼 또는 콘텐츠 -->
</div>
```

**동작 방식**:
1. HTML의 `data-bridge--button-title-value`가 Stimulus Controller로 전달
2. Stimulus가 `this.send("connect", {title})` 호출로 Native에게 메시지 전송
3. Native가 네이티브 버튼을 네비게이션 바에 추가
4. 사용자가 버튼 클릭 시 Native가 `reply(to: "connect")` 호출
5. Stimulus callback이 실행되어 `this.element.click()` 트리거
6. HTML의 click 이벤트로 폼 제출 등의 액션 실행

---

## 개발 원칙

### 1. Rails 중심 개발 (Rails-First)

**최대한 많은 로직을 Rails에서 처리**합니다.

```
✅ Rails: 비즈니스 로직, 데이터 처리, UI 렌더링
✅ Stimulus: UI 상태 관리, Bridge 메시지 송수신
✅ Native: OS API만 (카메라, 마이크, GPS 등)
```

**잘못된 예**:
```swift
// ❌ Native에서 비즈니스 로직 처리
func uploadRecording() {
    let url = "https://api.example.com/recordings"
    // HTTP 요청을 Native에서 직접...
}
```

**올바른 예**:
```javascript
// ✅ JavaScript에서 Rails로 전송
async submit() {
  const audioData = await this.send("getAudioData")
  await fetch('/recordings', { method: 'POST', body: audioData })
}
```

### 2. 재사용성 (Reusability)

**Bridge Component는 범용적으로 설계**합니다.

**잘못된 예**:
```javascript
// ❌ 특정 화면에 종속
export default class extends BridgeComponent {
  static component = "save-profile-button"  // 프로필 화면 전용
}
```

**올바른 예**:
```javascript
// ✅ 범용적으로 설계
export default class extends BridgeComponent {
  static component = "button"  // 어떤 화면에서든 사용 가능
  static values = { title: String, action: String }
}
```

---

## 컴포넌트 등록

### iOS

```swift
// AppDelegate.swift
import HotwireNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, 
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Bridge Components 등록
        Hotwire.registerBridgeComponents([
            ButtonComponent.self,
            FormComponent.self,
            MenuComponent.self,
            AudioRecorderComponent.self
        ])
        
        return true
    }
}
```

### JavaScript

```javascript
// app/javascript/controllers/application.js
import { Application } from "@hotwired/stimulus"

const application = Application.start()

// Bridge Controllers는 자동으로 등록됨
// (controllers/bridge/ 디렉토리의 모든 컨트롤러)
```

---

## 참고 자료

- [Hotwire Native 공식 문서](https://native.hotwired.dev/)
- [Bridge Components 개요](https://native.hotwired.dev/overview/bridge-components)
- [iOS Bridge Components](https://native.hotwired.dev/ios/bridge-components)
- [Android Bridge Components](https://native.hotwired.dev/android/bridge-components)
- [HotwireNative.md](./HotwireNative.md) - 전체 Hotwire Native 가이드

---

**작성일**: 2025-10-12  
**최종 업데이트**: 2025-10-15  
**상태**: ✅ 완료

