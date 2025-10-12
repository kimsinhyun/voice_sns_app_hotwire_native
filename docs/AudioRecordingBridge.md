# 음성 녹음 - Bridge Component 구현 가이드

## 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [데이터 흐름](#데이터-흐름)
4. [구현 개요](#구현-개요)
5. [주요 코드](#주요-코드)
6. [테스트](#테스트)

---

## 개요

### Bridge Component란?

Hotwire Native의 Bridge Component는 **웹과 네이티브 간 양방향 통신**을 가능하게 하는 메커니즘입니다.

📖 **[BridgeComponent.md](./BridgeComponent.md)** - Bridge Component 상세 가이드

### 왜 Bridge Component인가?

음성 녹음에 Bridge Component를 사용하는 이유:

❌ **웹 기반 (MediaRecorder API)**:
- WebView 권한 팝업이 앱 재시작마다 표시
- 해결 불가능한 권한 모델 한계

✅ **Bridge Component (AVAudioRecorder)**:
- iOS 시스템 권한 (한 번만 요청)
- 안정적인 네이티브 API
- 높은 오디오 품질 (AAC)

### 책임 분리

| 레이어 | 담당 | 역할 |
|--------|-----|------|
| UI/UX | Rails + Stimulus | 화면, 타이머, 진행바 |
| 녹음/재생 | Swift | AVAudioRecorder/Player |
| 통신 | Bridge | send() / reply() |
| 저장 | Rails | Base64 디코딩, Active Storage |

---

## 아키텍처

### 시스템 구조

```
┌─────────────────────────────────┐
│      Rails Server               │
│  ┌──────────────────────────┐   │
│  │ recordings/new.html.erb  │   │  ← UI 렌더링
│  │ audio_recorder_ctrl.js   │   │  ← UI 상태, Bridge 통신
│  │ recordings_controller.rb │   │  ← Base64 디코딩, 저장
│  └──────────────────────────┘   │
└─────────────────────────────────┘
            ↕ (this.send / reply)
┌─────────────────────────────────┐
│      iOS Native App             │
│  ┌──────────────────────────┐   │
│  │ AudioRecorderComponent   │   │  ← AVAudioRecorder
│  │                          │   │  ← Base64 인코딩
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**핵심 파일**:
- `voice_talk_rails/app/views/recordings/new.html.erb`
- `voice_talk_rails/app/javascript/controllers/bridge/audio_recorder_controller.js`
- `voice_talk_rails/app/controllers/recordings_controller.rb`
- `voice_talk_ios/voice_talk_ios/Bridge/Components/AudioRecorderComponent.swift`

---

## 데이터 흐름

### 전체 플로우

```
1. [사용자] 녹음 버튼 클릭
   ↓
2. [Stimulus] send("startRecording") → Native
   ↓
3. [Swift] AVAudioRecorder.record() → 녹음 시작
   ↓
4. [Stimulus] startTimer() → UI만 업데이트 (타이머, 진행바)
   ↓
5. [사용자] 10초 경과 또는 중지 버튼 클릭
   ↓
6. [Stimulus] send("stopRecording") → Native
   ↓
7. [Swift] AVAudioRecorder.stop() → reply({duration: 10.0})
   ↓
8. [Stimulus] 미리듣기 화면으로 전환
   ↓
9. [사용자] 재생 버튼 클릭
   ↓
10. [Stimulus] send("playAudio") → Native
    ↓
11. [Swift] AVAudioPlayer.play() → 네이티브 재생
    ↓
12. [사용자] 게시하기 버튼 클릭
    ↓
13. [Stimulus] send("getAudioData") → Native
    ↓
14. [Swift] Base64.encode(audioData) → reply({audioData: "base64..."})
    ↓
15. [Stimulus] FormData.append(base64) → Rails
    ↓
16. [Rails] Base64.decode() → Tempfile → Active Storage
    ↓
17. [Rails] redirect_to feed_path
```

### Bridge 메시지 프로토콜

#### JavaScript → Native

| 메시지 | 파라미터 | 설명 |
|--------|---------|------|
| `startRecording` | - | 녹음 시작 |
| `stopRecording` | - | 녹음 중지 |
| `playAudio` | - | 미리듣기 재생 |
| `pauseAudio` | - | 미리듣기 일시정지 |
| `getAudioData` | - | Base64 인코딩된 오디오 데이터 요청 |

#### Native → JavaScript

| 응답 | 데이터 | 설명 |
|------|-------|------|
| `startRecording` | `{success: true}` | 녹음 시작 성공 |
| `stopRecording` | `{success: true, duration: 10.0}` | 녹음 중지 + 길이 |
| `playAudio` | `{success: true}` | 재생 시작 성공 |
| `getAudioData` | `{success: true, audioData: "base64..."}` | Base64 오디오 데이터 |

---

## 구현 개요

### iOS (Swift)

**역할**: 네이티브 녹음/재생, Base64 인코딩

**핵심 로직**:
```swift
final class AudioRecorderComponent: BridgeComponent {
    override class var name: String { "audio-recorder" }
    
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingURL: URL?
    
    override func onReceive(message: Message) {
        switch message.event {
        case "startRecording": handleStartRecording()
        case "stopRecording": handleStopRecording()
        case "playAudio": handlePlayAudio()
        case "getAudioData": handleGetAudioData()
        }
    }
    
    private func handleStartRecording() {
        // 1. 권한 확인 (iOS 17+ / 16-)
        // 2. AVAudioSession 설정 (.playAndRecord)
        // 3. AVAudioRecorder 생성 (AAC, 48kbps)
        // 4. 녹음 시작
        audioRecorder?.record()
        reply(to: "startRecording")
    }
    
    private func handleStopRecording() {
        let duration = audioRecorder?.currentTime ?? 0
        audioRecorder?.stop()
        reply(to: "stopRecording", with: StopResponse(duration: duration))
    }
    
    private func handleGetAudioData() {
        let data = try Data(contentsOf: recordingURL!)
        let base64 = data.base64EncodedString()
        reply(to: "getAudioData", with: AudioDataResponse(audioData: base64))
    }
}
```

**상세 구현**: `voice_talk_ios/voice_talk_ios/Bridge/Components/AudioRecorderComponent.swift`

---

### JavaScript (Stimulus)

**역할**: UI 상태 관리, Bridge 통신, Rails로 데이터 전송

**핵심 로직**:
```javascript
export default class extends BridgeComponent {
  static component = "audio-recorder"
  
  async startRecording() {
    // Native에게 녹음 시작 요청
    await this.send("startRecording")
    
    // UI만 JavaScript에서 관리
    this.isRecording = true
    this.startTimer()  // 타이머, 진행바 업데이트
  }
  
  async stopRecording() {
    // Native에게 녹음 중지 요청
    const result = await this.send("stopRecording")
    
    this.isRecording = false
    this.recordedDuration = result.duration
    this.showPreviewView()
  }
  
  async playAudio() {
    // Native에게 재생 요청
    await this.send("playAudio")
    this.isPlaying = true
    this.updatePlaybackUI()
  }
  
  async submit() {
    // Native에서 Base64 데이터 가져오기
    const result = await this.send("getAudioData")
    
    // Rails 서버로 전송
    const formData = new FormData()
    formData.append('recording[audio_data]', result.audioData)
    
    await fetch('/recordings', {
      method: 'POST',
      body: formData,
      headers: { 'X-CSRF-Token': getCsrfToken() }
    })
  }
  
  // UI 관리: 타이머, 진행바, 버튼 상태
  updateTimer() {
    const elapsed = (Date.now() - this.startTime) / 1000
    this.timerTarget.textContent = (10 - elapsed).toFixed(1)
    this.circleProgressTarget.style.strokeDashoffset = ...
  }
}
```

**상세 구현**: `voice_talk_rails/app/javascript/controllers/bridge/audio_recorder_controller.js`

---

### Rails

**역할**: Base64 디코딩, Active Storage 저장

**핵심 로직**:
```ruby
class RecordingsController < ApplicationController
  def create
    @recording = current_user.recordings.build
    
    # Base64 데이터 처리
    if params[:recording][:audio_data].present?
      attach_base64_audio(@recording, params[:recording][:audio_data])
    end
    
    @recording.save
    redirect_to feed_path
  end

  private

  def attach_base64_audio(recording, base64_data)
    # Base64 → Binary
    audio_data = Base64.decode64(base64_data)
    
    # Tempfile 생성
    tempfile = Tempfile.new(['recording', '.m4a'])
    tempfile.binmode
    tempfile.write(audio_data)
    tempfile.rewind
    
    # Active Storage에 저장
    recording.audio_file.attach(
      io: tempfile,
      filename: 'recording.m4a',
      content_type: 'audio/mp4'
    )
  ensure
    tempfile&.close
    tempfile&.unlink
  end
end
```

**상세 구현**: `voice_talk_rails/app/controllers/recordings_controller.rb`

---

## 주요 코드

### HTML

```erb
<div data-controller="bridge--audio-recorder"
     data-bridge--audio-recorder-max-duration-value="10">
  
  <button data-action="click->bridge--audio-recorder#toggleRecording">
    녹음 시작/중지
  </button>
  
  <button data-action="click->bridge--audio-recorder#submit">
    게시하기
  </button>
</div>
```

### 컴포넌트 등록

```swift
// AppDelegate.swift
Hotwire.registerBridgeComponents([
    AudioRecorderComponent.self
])
```

---

## 테스트

### iOS 테스트

1. **실행**:
   ```bash
   cd voice_talk_rails && bin/dev
   # Xcode에서 앱 실행
   ```

2. **시나리오**:
   - ✅ 녹음 버튼 클릭 → 타이머 시작
   - ✅ 10초 후 자동 중지 → 미리듣기 화면
   - ✅ 재생 버튼 → 네이티브 재생
   - ✅ 게시하기 → Base64 전송 → Feed 표시

3. **로그 확인**:
   - **Xcode**: `🎤 Recording started`, `✅ Recording stopped`
   - **Safari Inspector**: `✅ Audio data received`

4. **권한**:
   - 최초: iOS 시스템 권한 팝업 (1회)
   - 재시작: 팝업 없음 ✅

---

## 트러블슈팅

### onReceive 미작동

```swift
// ✅ 올바른 메서드명
override func onReceive(message: Message) {
    // ...
}
```

### reply 전송 실패

```swift
// ✅ Encodable 구조체 사용
struct StopRecordingResponse: Encodable {
    let duration: TimeInterval
}
reply(to: "stopRecording", with: StopRecordingResponse(duration: duration))
```

### iOS 17+ 권한

```swift
if #available(iOS 17.0, *) {
    AVAudioApplication.requestRecordPermission { granted in ... }
} else {
    AVAudioSession.sharedInstance().requestRecordPermission { granted in ... }
}
```

### 재생 실패

```swift
// prepareToRecord() / prepareToPlay() 호출 필수
audioRecorder?.prepareToRecord()
audioRecorder?.record()

audioPlayer?.prepareToPlay()
audioPlayer?.play()
```

---

## 성능

**오디오 포맷**: AAC 48kbps, 모노  
**파일 크기**: 10초 → 약 60KB  
**용도**: SNS 음성 메시지 최적

---

## 참고 자료

- [BridgeComponent.md](./BridgeComponent.md) - Bridge Component 완전 가이드
- [HotwireNative.md](./HotwireNative.md) - Hotwire Native 개요
- [DeviceAuthentication.md](./DeviceAuthentication.md) - 디바이스 인증
- [Hotwire Native - Bridge Components](https://native.hotwired.dev/overview/bridge-components)
- [Apple - AVAudioRecorder](https://developer.apple.com/documentation/avfaudio/avaudiorecorder)

---

**작성일**: 2025-10-11  
**최종 업데이트**: 2025-10-12  
**상태**: ✅ 간소화 완료

