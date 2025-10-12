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

### 예제 1: 네이티브 버튼

네비게이션 바에 네이티브 버튼을 표시하는 간단한 예제입니다.

#### JavaScript (Stimulus)

```javascript
// app/javascript/controllers/bridge/button_controller.js
import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "button"
  static values = { title: String, style: String }

  connect() {
    super.connect()
    
    // Native에게 버튼 표시 요청
    this.send("connect", {
      title: this.titleValue,
      style: this.styleValue
    }, () => {
      // 사용자가 버튼 클릭 시 실행
      this.performAction()
    })
  }

  performAction() {
    // 커스텀 이벤트 디스패치
    const event = new CustomEvent("button:clicked", { bubbles: true })
    this.element.dispatchEvent(event)
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
        switch message.event {
        case "connect":
            handleConnect(message: message)
        case "disconnect":
            handleDisconnect()
        }
    }
    
    private func handleConnect(message: Message) {
        guard let data: MessageData = message.data(),
              let viewController = delegate.destination as? UIViewController else { return }
        
        // 네이티브 버튼 생성
        let action = UIAction { [weak self] _ in
            self?.reply(to: "connect")  // JavaScript callback 호출
        }
        
        let button = UIBarButtonItem(title: data.title, primaryAction: action)
        viewController.navigationItem.rightBarButtonItem = button
        barButtonItem = button
    }
    
    private struct MessageData: Decodable {
        let title: String
        let style: String?
    }
}
```

#### HTML (ERB)

```erb
<!-- 네비게이션 바에 "저장" 버튼 추가 -->
<div data-controller="bridge--button"
     data-bridge--button-title-value="저장"
     data-bridge--button-style-value="done"
     data-action="button:clicked->form#submit">
  <!-- 폼 또는 콘텐츠 -->
</div>
```

**결과**:
- ✅ iOS 네비게이션 바에 진짜 네이티브 버튼 표시

---

### 예제 2: 음성 녹음

OS의 마이크 기능을 사용하는 복잡한 예제입니다.

#### JavaScript (Stimulus)

```javascript
export default class extends BridgeComponent {
  static component = "audio-recorder"
  
  async startRecording() {
    // Native에게 녹음 시작 요청
    const result = await this.send("startRecording")
    
    if (result.success) {
      this.isRecording = true
      this.startTimer()  // UI만 JavaScript에서 관리
    }
  }
  
  async stopRecording() {
    // Native에게 녹음 중지 요청
    const result = await this.send("stopRecording")
    
    this.isRecording = false
    this.recordedDuration = result.duration  // Native에서 받은 녹음 길이
    this.showPreview()
  }
  
  async submit() {
    // Native에게 오디오 데이터 요청 (Base64)
    const result = await this.send("getAudioData")
    
    // Rails 서버로 전송
    const formData = new FormData()
    formData.append('recording[audio_data]', result.audioData)
    
    await fetch('/recordings', { method: 'POST', body: formData })
  }
}
```

#### iOS (Swift)

```swift
final class AudioRecorderComponent: BridgeComponent {
    override class var name: String { "audio-recorder" }
    
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    
    override func onReceive(message: Message) {
        switch message.event {
        case "startRecording": handleStartRecording()
        case "stopRecording": handleStopRecording()
        case "getAudioData": handleGetAudioData()
        }
    }
    
    private func handleStartRecording() {
        // AVAudioRecorder로 네이티브 녹음
        let fileURL = createTempURL()
        audioRecorder = try? AVAudioRecorder(url: fileURL, settings: settings)
        audioRecorder?.record()
        
        reply(to: "startRecording", with: ["success": true])
    }
    
    private func handleStopRecording() {
        let duration = audioRecorder?.currentTime ?? 0
        audioRecorder?.stop()
        
        reply(to: "stopRecording", with: StopResponse(duration: duration))
    }
    
    private func handleGetAudioData() {
        // 오디오 파일을 Base64로 인코딩
        let data = try? Data(contentsOf: recordingURL!)
        let base64 = data?.base64EncodedString() ?? ""
        
        reply(to: "getAudioData", with: AudioDataResponse(audioData: base64))
    }
    
    private struct StopResponse: Encodable {
        let duration: TimeInterval
    }
    
    private struct AudioDataResponse: Encodable {
        let audioData: String
    }
}
```

**책임 분리**:
- **JavaScript**: UI 상태 관리 (타이머, 진행바, 버튼 활성화)
- **Native**: OS API 호출 (마이크 녹음, 파일 저장, Base64 인코딩)
- **Rails**: 데이터 저장 (Base64 디코딩, Active Storage)

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
- [AudioRecordingBridge.md](./AudioRecordingBridge.md) - 음성 녹음 구현 가이드

---

**작성일**: 2025-10-12  
**최종 업데이트**: 2025-10-12  
**상태**: ✅ 완료

