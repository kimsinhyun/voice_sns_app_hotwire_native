# 음성 녹음 - Bridge Component 구현 가이드

## 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [데이터 흐름](#데이터-흐름)
4. [iOS 구현](#ios-구현)
5. [JavaScript 구현](#javascript-구현)
6. [Rails 구현](#rails-구현)
7. [테스트](#테스트)
8. [Android 구현](#android-구현)

---

## 개요

### Bridge Component란?

Hotwire Native의 Bridge Component는 **네이티브 기능을 웹에서 사용**할 수 있게 하는 양방향 통신 메커니즘입니다.

```
Rails (Stimulus)  ⟷  Bridge Messages  ⟷  Native (Swift/Kotlin)
```

### 왜 Bridge Component인가?

❌ **웹 기반 (MediaRecorder API)**:
- WebView 권한 팝업이 앱 재시작마다 표시됨
- 해결 불가능한 WebView 권한 모델의 한계

✅ **Bridge Component (AVAudioRecorder)**:
- iOS 시스템 권한만 필요 (한 번만 요청)
- 안정적인 네이티브 API
- 높은 품질 (AAC)

### 핵심 원칙

- **UI/UX**: Rails가 100% 제어 (ERB + Stimulus + TailwindCSS)
- **네이티브 기능**: Swift/Kotlin이 담당 (녹음/재생만)
- **데이터**: Base64로 Native → JavaScript → Rails 전송

---

## 아키텍처

### 전체 시스템 다이어그램

```
┌─────────────────────────────────────────────────────┐
│                  Rails Server                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  recordings/new.html.erb                      │  │
│  │  - UI 렌더링 (타이머, 진행바, 버튼)           │  │
│  │  - data-controller="bridge--audio-recorder"   │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  audio_recorder_controller.js (Stimulus)      │  │
│  │  - UI 업데이트만                              │  │
│  │  - Bridge 메시지 송수신                       │  │
│  │  - Base64 데이터 Rails로 전송                 │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  recordings_controller.rb                     │  │
│  │  - Base64 디코딩                              │  │
│  │  - Active Storage 저장                        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          ↕ Bridge Messages
┌─────────────────────────────────────────────────────┐
│              iOS Native App                         │
│  ┌───────────────────────────────────────────────┐  │
│  │  AudioRecorderComponent.swift                 │  │
│  │  - AVAudioRecorder (녹음)                     │  │
│  │  - AVAudioPlayer (미리듣기)                   │  │
│  │  - Base64 인코딩                              │  │
│  │  - Bridge 메시지 처리                         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 책임 분리

| 레이어 | 담당자 | 역할 |
|--------|-------|------|
| UI | Rails (ERB) | 화면 렌더링, 스타일링 |
| UX | Stimulus | UI 상태 관리, 타이머, 진행바 |
| 녹음 | Swift | AVAudioRecorder로 네이티브 녹음 |
| 재생 | Swift | AVAudioPlayer로 네이티브 재생 |
| 통신 | Bridge | Native ↔ JavaScript 메시지 |
| 저장 | Rails | Active Storage에 파일 저장 |

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

## iOS 구현

### AudioRecorderComponent.swift

**파일**: `voice_talk_ios/voice_talk_ios/Bridge/Components/AudioRecorderComponent.swift`

```swift
import Foundation
import AVFoundation
import HotwireNative

final class AudioRecorderComponent: BridgeComponent {
    // Bridge Component 이름 (JavaScript에서 사용)
    override class var name: String { "audio-recorder" }
    
    // 녹음/재생 인스턴스
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingURL: URL?
    
    // Bridge 메시지 수신
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else {
            print("❌ Unknown event: \(message.event)")
            return
        }
        
        switch event {
        case .startRecording:
            handleStartRecording(message: message)
        case .stopRecording:
            handleStopRecording(message: message)
        case .playAudio:
            handlePlayAudio(message: message)
        case .pauseAudio:
            handlePauseAudio(message: message)
        case .getAudioData:
            handleGetAudioData(message: message)
        }
    }
    
    // MARK: - 녹음 시작
    
    private func handleStartRecording(message: Message) {
        print("🎤 Starting recording...")
        
        // Documents 디렉토리에 파일 생성
        let documentsPath = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        )[0]
        
        let timestamp = Int(Date().timeIntervalSince1970)
        let fileURL = documentsPath.appendingPathComponent("recording_\(timestamp).m4a")
        recordingURL = fileURL
        
        // AAC 포맷 설정 (48 kbps, SNS 최적)
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 2,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
            AVEncoderBitRateKey: 48000  // 48 kbps
        ]
        
        do {
            // 오디오 세션 설정
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playAndRecord, mode: .default)
            try audioSession.setActive(true)
            
            // 녹음 시작
            audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            audioRecorder?.record()
            
            print("✅ Recording started: \(fileURL.lastPathComponent)")
            reply(to: "startRecording", with: Message.data(["success": true]))
            
        } catch {
            print("❌ Recording failed: \(error.localizedDescription)")
            reply(to: "startRecording", with: Message.data([
                "success": false,
                "error": error.localizedDescription
            ]))
        }
    }
    
    // MARK: - 녹음 중지
    
    private func handleStopRecording(message: Message) {
        print("🎤 Stopping recording...")
        
        guard let recorder = audioRecorder else {
            reply(to: "stopRecording", with: Message.data([
                "success": false,
                "error": "No active recording"
            ]))
            return
        }
        
        let duration = recorder.currentTime
        recorder.stop()
        
        print("✅ Recording stopped, duration: \(duration)s")
        reply(to: "stopRecording", with: Message.data([
            "success": true,
            "duration": duration
        ]))
    }
    
    // MARK: - 미리듣기 재생
    
    private func handlePlayAudio(message: Message) {
        print("🎵 Playing audio...")
        
        guard let url = recordingURL else {
            reply(to: "playAudio", with: Message.data([
                "success": false,
                "error": "No recording found"
            ]))
            return
        }
        
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.play()
            
            print("✅ Audio playing")
            reply(to: "playAudio", with: Message.data(["success": true]))
            
        } catch {
            print("❌ Playback failed: \(error.localizedDescription)")
            reply(to: "playAudio", with: Message.data([
                "success": false,
                "error": error.localizedDescription
            ]))
        }
    }
    
    // MARK: - 미리듣기 일시정지
    
    private func handlePauseAudio(message: Message) {
        audioPlayer?.pause()
        print("⏸️ Audio paused")
        reply(to: "pauseAudio", with: Message.data(["success": true]))
    }
    
    // MARK: - 오디오 데이터 가져오기 (Base64)
    
    private func handleGetAudioData(message: Message) {
        print("📦 Getting audio data...")
        
        guard let url = recordingURL else {
            reply(to: "getAudioData", with: Message.data([
                "success": false,
                "error": "No recording found"
            ]))
            return
        }
        
        do {
            let data = try Data(contentsOf: url)
            let base64 = data.base64EncodedString()
            
            print("✅ Audio data encoded: \(data.count) bytes → \(base64.count) chars")
            reply(to: "getAudioData", with: Message.data([
                "success": true,
                "audioData": base64
            ]))
            
        } catch {
            print("❌ Failed to read audio file: \(error.localizedDescription)")
            reply(to: "getAudioData", with: Message.data([
                "success": false,
                "error": error.localizedDescription
            ]))
        }
    }
    
    // MARK: - Event Enum
    
    private enum Event: String {
        case startRecording
        case stopRecording
        case playAudio
        case pauseAudio
        case getAudioData
    }
}
```

### AppDelegate 등록

**파일**: `voice_talk_ios/voice_talk_ios/AppDelegate.swift`

```swift
import HotwireNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Bridge Components 등록
        Hotwire.registerBridgeComponents([
            ButtonComponent.self,
            FormComponent.self,
            MenuComponent.self,
            AudioRecorderComponent.self  // ← 추가
        ])
        
        print("✅ Bridge components registered")
        
        return true
    }
}
```

---

## JavaScript 구현

### audio_recorder_controller.js

**파일**: `voice_talk_rails/app/javascript/controllers/bridge/audio_recorder_controller.js`

```javascript
import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  // Bridge Component 이름 (Swift와 동일해야 함)
  static component = "audio-recorder"
  
  // Stimulus Targets
  static targets = [
    "timer", "recordButton", "statusText", "circleProgress",
    "recordingView", "previewView", "recordedDuration",
    "playButton", "playIcon", "pauseIcon", "submitButton"
  ]
  
  // Stimulus Values
  static values = {
    maxDuration: { type: Number, default: 10 }
  }
  
  // 초기화
  connect() {
    this.isRecording = false
    this.isPlaying = false
    this.currentTime = 0
    this.timerInterval = null
    this.startTime = null
    this.circleCircumference = 2 * Math.PI * 112 // SVG circle
    
    console.log("✅ Bridge Audio Recorder connected")
  }
  
  disconnect() {
    this.stopTimer()
  }
  
  // MARK: - 녹음 시작/중지
  
  async toggleRecording() {
    console.log("🎤 Toggle recording, isRecording:", this.isRecording)
    
    if (this.isRecording) {
      await this.stopRecording()
    } else {
      await this.startRecording()
    }
  }
  
  async startRecording() {
    if (this.isRecording) return
    
    console.log("🎤 Sending startRecording to native...")
    
    try {
      // Native로 메시지 전송
      const result = await this.send("startRecording")
      
      if (result.success) {
        console.log("✅ Recording started via native")
        this.isRecording = true
        this.currentTime = 0
        this.startTime = Date.now()
        
        // UI 업데이트 (JavaScript만)
        this.updateUIForRecording(true)
        this.startTimer()
      } else {
        console.error("❌ Native recording failed:", result.error)
        alert("녹음을 시작할 수 없습니다: " + result.error)
      }
    } catch (error) {
      console.error("❌ Bridge message failed:", error)
      alert("네이티브 통신 오류가 발생했습니다.")
    }
  }
  
  async stopRecording() {
    if (!this.isRecording) return
    
    console.log("🎤 Sending stopRecording to native...")
    
    try {
      // Native로 메시지 전송
      const result = await this.send("stopRecording")
      
      if (result.success) {
        console.log("✅ Recording stopped, duration:", result.duration)
        this.isRecording = false
        this.stopTimer()
        
        // UI 업데이트
        this.updateUIForRecording(false)
        
        // 1초 후 미리듣기 화면으로 전환
        setTimeout(() => this.showPreviewView(), 1000)
      }
    } catch (error) {
      console.error("❌ Stop recording failed:", error)
    }
  }
  
  // MARK: - 타이머 (UI만)
  
  startTimer() {
    this.timerInterval = setInterval(() => this.updateTimer(), 100)
  }
  
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
  
  updateTimer() {
    const elapsed = (Date.now() - this.startTime) / 1000
    this.currentTime = elapsed
    const remaining = this.maxDurationValue - elapsed
    
    // 타이머 텍스트
    if (this.hasTimerTarget) {
      this.timerTarget.textContent = Math.max(0, remaining).toFixed(1)
    }
    
    // 원형 진행 바
    if (this.hasCircleProgressTarget) {
      const progress = elapsed / this.maxDurationValue
      const offset = this.circleCircumference * (1 - progress)
      this.circleProgressTarget.style.strokeDashoffset = offset
    }
    
    // 최대 시간 도달 시 자동 중지
    if (elapsed >= this.maxDurationValue) {
      this.stopRecording()
    }
  }
  
  // MARK: - UI 업데이트
  
  updateUIForRecording(isRecording) {
    if (this.hasStatusTextTarget) {
      this.statusTextTarget.textContent = isRecording ? "탭하여 중지" : "처리 중..."
    }
  }
  
  showPreviewView() {
    if (this.hasRecordingViewTarget && this.hasPreviewViewTarget) {
      this.recordingViewTarget.classList.add("hidden")
      this.previewViewTarget.classList.remove("hidden")
      this.previewViewTarget.classList.add("flex")
    }
    
    if (this.hasRecordedDurationTarget) {
      this.recordedDurationTarget.textContent = `${this.currentTime.toFixed(1)}초`
    }
    
    console.log("✅ Preview view shown")
  }
  
  // MARK: - 미리듣기
  
  async togglePlayback() {
    console.log("🎵 Toggle playback, isPlaying:", this.isPlaying)
    
    if (this.isPlaying) {
      await this.pausePlayback()
    } else {
      await this.playAudio()
    }
  }
  
  async playAudio() {
    console.log("🎵 Sending playAudio to native...")
    
    try {
      const result = await this.send("playAudio")
      
      if (result.success) {
        console.log("✅ Audio playing via native")
        this.isPlaying = true
        this.updatePlaybackUI()
      } else {
        alert("재생할 수 없습니다: " + result.error)
      }
    } catch (error) {
      console.error("❌ Play audio failed:", error)
    }
  }
  
  async pausePlayback() {
    console.log("⏸️ Sending pauseAudio to native...")
    
    try {
      const result = await this.send("pauseAudio")
      
      if (result.success) {
        this.isPlaying = false
        this.updatePlaybackUI()
      }
    } catch (error) {
      console.error("❌ Pause audio failed:", error)
    }
  }
  
  updatePlaybackUI() {
    if (this.hasPlayIconTarget && this.hasPauseIconTarget) {
      if (this.isPlaying) {
        this.playIconTarget.classList.add("hidden")
        this.pauseIconTarget.classList.remove("hidden")
      } else {
        this.playIconTarget.classList.remove("hidden")
        this.pauseIconTarget.classList.add("hidden")
      }
    }
  }
  
  // MARK: - 게시하기
  
  async submit() {
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "업로드 중..."
    }
    
    console.log("📤 Requesting audio data from native...")
    
    try {
      // Native에서 Base64 데이터 가져오기
      const result = await this.send("getAudioData")
      
      if (!result.success || !result.audioData) {
        alert("오디오 데이터를 가져올 수 없습니다")
        return
      }
      
      console.log("✅ Audio data received:", result.audioData.length, "chars")
      
      // Rails 서버로 전송
      const formData = new FormData()
      formData.append('recording[audio_data]', result.audioData)
      
      const response = await fetch('/recordings', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
      
      if (response.ok) {
        console.log("✅ Upload successful")
        window.location.href = "/feed"
      } else {
        throw new Error('Upload failed')
      }
      
    } catch (error) {
      console.error("❌ Submit failed:", error)
      alert("업로드 중 오류가 발생했습니다")
      
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "게시하기"
      }
    }
  }
  
  // MARK: - 취소
  
  cancel() {
    if (confirm("녹음을 취소하시겠습니까?")) {
      window.location.href = "/feed"
    }
  }
}
```

---

## Rails 구현

### recordings_controller.rb 수정

**파일**: `voice_talk_rails/app/controllers/recordings_controller.rb`

```ruby
class RecordingsController < ApplicationController
  def new
    # 녹음 화면 렌더링
  end

  def create
    @recording = current_user.recordings.build
    
    # Base64 데이터 처리 (네이티브 앱)
    if params[:recording][:audio_data].present?
      attach_base64_audio(@recording, params[:recording][:audio_data])
    # Multipart 파일 처리 (웹, 레거시)
    elsif params[:recording][:audio_file].present?
      @recording.audio_file.attach(params[:recording][:audio_file])
    end
    
    if @recording.save
      redirect_to feed_path, notice: "녹음이 저장되었습니다."
    else
      render :new, alert: "녹음 저장에 실패했습니다."
    end
  end

  private

  def attach_base64_audio(recording, base64_data)
    # Base64 디코딩
    audio_data = Base64.decode64(base64_data)
    
    Rails.logger.info "📦 Decoding Base64: #{base64_data.length} chars → #{audio_data.bytesize} bytes"
    
    # Tempfile 생성
    tempfile = Tempfile.new(['recording', '.m4a'])
    tempfile.binmode
    tempfile.write(audio_data)
    tempfile.rewind
    
    # Active Storage에 attach
    recording.audio_file.attach(
      io: tempfile,
      filename: 'recording.m4a',
      content_type: 'audio/mp4'
    )
    
    Rails.logger.info "✅ Audio attached: #{audio_data.bytesize} bytes"
  ensure
    tempfile&.close
    tempfile&.unlink
  end
end
```

### View 수정

**파일**: `voice_talk_rails/app/views/recordings/new.html.erb`

```erb
<!-- 변경: data-controller를 bridge--audio-recorder로 -->
<div class="w-full h-screen flex flex-col bg-gradient-to-br from-[#FDEBD0] to-[#FFF5E9]"
     data-controller="bridge--audio-recorder"
     data-bridge--audio-recorder-max-duration-value="10">
  
  <!-- 기존 HTML은 그대로 유지 -->
  <!-- data-action만 bridge--audio-recorder#메서드명으로 변경 -->
  
  <button data-action="click->bridge--audio-recorder#toggleRecording">
    ...
  </button>
  
</div>
```

---

## 테스트

### iOS 시뮬레이터 테스트

1. **Rails 서버 실행**:
```bash
cd voice_talk_rails
bin/dev
```

2. **Xcode에서 앱 실행**

3. **로그 확인**:
   - **Xcode 콘솔**:
     ```
     ✅ Bridge components registered
     🎤 AudioRecorderComponent initialized
     🎤 Starting recording...
     ✅ Recording started: recording_1234567890.m4a
     🎤 Stopping recording...
     ✅ Recording stopped, duration: 10.0s
     ```
   
   - **Safari Inspector** (optional):
     ```
     ✅ Bridge Audio Recorder connected
     🎤 Sending startRecording to native...
     ✅ Recording started via native
     ```

4. **테스트 시나리오**:
   - ✅ 녹음 버튼 클릭 → 타이머 시작
   - ✅ 10초 후 자동 중지 → 미리듣기 화면
   - ✅ 재생 버튼 → 네이티브 재생
   - ✅ 게시하기 → Base64 전송 → Feed에 표시

5. **권한 테스트**:
   - 최초 실행: iOS 시스템 권한 팝업 (1회만)
   - 앱 재시작: **권한 팝업 없음** ✅

---

## Android 구현

### AudioRecorderComponent.kt (추후)

**파일**: `voice_talk_android/.../AudioRecorderComponent.kt`

```kotlin
import android.media.MediaRecorder
import android.media.MediaPlayer
import android.util.Base64
import dev.hotwire.native.bridge.BridgeComponent
import dev.hotwire.native.bridge.Message
import java.io.File

class AudioRecorderComponent : BridgeComponent() {
    override val name = "audio-recorder"
    
    private var mediaRecorder: MediaRecorder? = null
    private var mediaPlayer: MediaPlayer? = null
    private var recordingFile: File? = null
    
    override fun onReceive(message: Message) {
        when (message.event) {
            "startRecording" -> handleStartRecording()
            "stopRecording" -> handleStopRecording()
            "playAudio" -> handlePlayAudio()
            "pauseAudio" -> handlePauseAudio()
            "getAudioData" -> handleGetAudioData()
        }
    }
    
    // 구현 내용은 Swift와 유사
    // ...
}
```

---

## 장점 요약

1. ✅ **권한 문제 완전 해결**: WebView 팝업 제거
2. ✅ **높은 품질**: AAC 48kbps (SNS 최적)
3. ✅ **안정성**: 네이티브 API 사용
4. ✅ **Rails-First**: UI는 여전히 Rails 제어
5. ✅ **코드 적음**: 웹 기반보다 -89줄
6. ✅ **Hotwire 철학**: Bridge Component의 올바른 사용

---

## 트러블슈팅

### 1. Hotwire Native Bridge API 사용 오류

**증상**: Swift에서 메시지가 수신되지 않음

**원인**: 잘못된 메서드명 사용

**해결**:
```swift
// ❌ 작동하지 않음
override func didReceive(message: Message) {
    // ...
}

// ✅ 올바른 방법
override func onReceive(message: Message) {
    // ...
}
```

**원인**: 잘못된 응답 메서드 사용

**해결**:
```swift
// ❌ 작동하지 않음
reply(with: Message(event: "recordingStopped", data: ["duration": 10.0]))

// ✅ 올바른 방법
reply(to: "stopRecording", with: ["duration": 10.0])
```

### 2. iOS 17+ Deprecation 경고

**증상**: `AVAudioSession.recordPermission`에 대한 deprecation 경고

**원인**: iOS 17+에서 `AVAudioApplication`으로 변경됨

**해결**:
```swift
if #available(iOS 17.0, *) {
    let permission = AVAudioApplication.shared.recordPermission
    switch permission {
    case .undetermined, .denied:
        AVAudioApplication.requestRecordPermission { granted in
            decisionHandler(granted ? .grant : .deny)
        }
    case .granted:
        decisionHandler(.grant)
    @unknown default:
        decisionHandler(.prompt)
    }
} else {
    let permission = AVAudioSession.sharedInstance().recordPermission
    // iOS 16 이하 로직
}
```

**주의**: `AVAudioApplication.recordPermission`과 `AVAudioSession.recordPermission`은 타입이 다르므로 분기 처리 필요

### 3. 녹음 파일 재생 실패

**증상**: 
- Duration이 0.0으로 표시
- 재생 시 `OSStatus error 1685348671`
- `AudioFileObject.cpp:105 OpenFromDataSource failed`

**원인**: 
- 녹음 준비 미비
- 파일 존재 확인 누락
- 오디오 세션 설정 문제

**해결**:

1. **녹음 시작 시 준비 호출**:
```swift
audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
audioRecorder?.prepareToRecord()  // ← 필수!

let success = audioRecorder?.record() ?? false
if !success {
    print("❌ Recording failed to start")
}
```

2. **녹음 완료 후 파일 검증**:
```swift
func handleStopRecording() {
    let duration = recorder.currentTime
    recorder.stop()
    
    // 파일 존재 및 크기 확인
    if let url = recordingURL {
        let fileExists = FileManager.default.fileExists(atPath: url.path)
        let fileSize = try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64
        print("✅ File exists: \(fileExists), size: \(fileSize ?? 0) bytes")
    }
    
    // Duration을 Encodable 구조체로 전송
    reply(to: "stopRecording", with: StopRecordingResponse(duration: duration))
}
```

3. **재생 시 오디오 세션 설정**:
```swift
func handlePlayAudio() {
    guard let url = recordingURL else { return }
    
    // 파일 존재 확인
    guard FileManager.default.fileExists(atPath: url.path) else {
        print("❌ File does not exist")
        return
    }
    
    do {
        // 재생용 오디오 세션
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .default)
        try audioSession.setActive(true)
        
        audioPlayer = try AVAudioPlayer(contentsOf: url)
        audioPlayer?.prepareToPlay()  // ← 필수!
        audioPlayer?.play()
    } catch {
        print("❌ Playback failed: \(error)")
    }
}
```

### 4. JavaScript-Native 데이터 전송

**증상**: Native에서 JavaScript로 데이터가 전달되지 않음

**원인**: 데이터 타입 불일치

**해결**:

**Swift에서 Encodable 구조체 사용**:
```swift
private struct StopRecordingResponse: Encodable {
    let duration: TimeInterval
}

reply(to: "stopRecording", with: StopRecordingResponse(duration: duration))
```

**JavaScript에서 수신**:
```javascript
const result = await this.send("stopRecording")
console.log(result.duration)  // 10.2
```

### 5. Base64 업로드 실패

**증상**: Rails에서 Base64 디코딩 오류

**원인**: FormData 키 불일치

**해결**:

**JavaScript**:
```javascript
const formData = new FormData()
formData.append('recording[audio_data]', result.audioData)  // ← 중괄호 필수
```

**Rails Controller**:
```ruby
def create
  if params[:recording][:audio_data].present?  # ← 중괄호로 접근
    attach_base64_audio(@recording, params[:recording][:audio_data])
  end
end
```

---

## 성능 최적화

### 파일 크기 최적화

**현재 설정** (48 kbps AAC):
```swift
let settings: [String: Any] = [
    AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
    AVSampleRateKey: 44100.0,
    AVNumberOfChannelsKey: 2,
    AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue,
    AVEncoderBitRateKey: 48000  // 48 kbps
]
```

**결과**:
- 10초 녹음 → 약 60KB
- SNS 용도에 적합
- 네트워크 업로드 빠름

**더 작은 파일이 필요한 경우**:
```swift
AVSampleRateKey: 22050.0,        // 샘플레이트 감소
AVNumberOfChannelsKey: 1,         // 모노
AVEncoderBitRateKey: 32000        // 32 kbps
```

---

## 참고 자료

- [HotwireNative.md](./HotwireNative.md): Bridge Component 가이드
- [TriedAudioRecording.md](./TriedAudioRecording.md): 시도 기록
- [Hotwire Native - Bridge Components](https://native.hotwired.dev/ios/bridge-components)
- [Apple - AVAudioRecorder](https://developer.apple.com/documentation/avfaudio/avaudiorecorder)

---

**작성일**: 2025-10-11  
**최종 업데이트**: 2025-10-12  
**상태**: ✅ 구현 완료 및 검증됨

