import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  // Bridge Component 이름 (Swift와 동일해야 함)
  static component = "audio-recorder"
  
  // Stimulus Targets
  static targets = [
    "timer", "recordButton", "statusText", "circleProgress",
    "recordingView", "previewView", "recordedDuration",
    "playButton", "playIcon", "pauseIcon", "submitButton",
    "playbackTime", "playbackTotal", "playbackProgress"
  ]
  
  // Stimulus Values
  static values = {
    maxDuration: { type: Number, default: 10 }
  }
  
  // 초기화
  connect() {
    super.connect()
    
    this.isRecording = false
    this.isPlaying = false
    this.currentTime = 0
    this.recordedDuration = 0
    this.timerInterval = null
    this.startTime = null
    this.circleCircumference = 2 * Math.PI * 112 // SVG circle
    this.playbackTimer = null
    this.playbackStartTime = null
    
    console.log("✅ Bridge Audio Recorder connected")
  }
  
  disconnect() {
    this.stopTimer()
    this.stopPlaybackTimer()
    super.disconnect()
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
      await this.send("startRecording")
      
      console.log("✅ Recording started via native")
      this.isRecording = true
      this.currentTime = 0
      this.startTime = Date.now()
      
      // UI 업데이트 (JavaScript만)
      this.updateUIForRecording(true)
      this.startTimer()
    } catch (error) {
      console.error("❌ Bridge message failed:", error)
      alert("녹음을 시작할 수 없습니다.")
    }
  }
  
  async stopRecording() {
    if (!this.isRecording) return
    
    console.log("🎤 Sending stopRecording to native...")
    
    try {
      // Native로 메시지 전송
      const result = await this.send("stopRecording")
      
      console.log("✅ Recording stopped, result:", result)
      console.log("📊 Duration from native:", result?.duration)
      
      this.isRecording = false
      this.recordedDuration = result?.duration || this.currentTime
      this.stopTimer()
      
      console.log("📊 Final recorded duration:", this.recordedDuration)
      
      // UI 업데이트
      this.updateUIForRecording(false)
      
      // 1초 후 미리듣기 화면으로 전환
      setTimeout(() => this.showPreviewView(), 1000)
    } catch (error) {
      console.error("❌ Stop recording failed:", error)
      // 오류 시에도 현재 시간으로 fallback
      this.recordedDuration = this.currentTime
      this.isRecording = false
      this.stopTimer()
      this.updateUIForRecording(false)
      setTimeout(() => this.showPreviewView(), 1000)
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
    
    const duration = this.recordedDuration || this.currentTime
    
    // "녹음완료! X.X초" 표시
    if (this.hasRecordedDurationTarget) {
      this.recordedDurationTarget.textContent = `${duration.toFixed(1)}초`
      console.log("📊 Recorded duration:", duration)
    }
    
    // 오디오 플레이어 시간 표시 (MM:SS 형식)
    if (this.hasPlaybackTotalTarget) {
      const minutes = Math.floor(duration / 60)
      const seconds = Math.floor(duration % 60)
      this.playbackTotalTarget.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
      console.log("⏱️ Total duration formatted:", this.playbackTotalTarget.textContent)
    }
    
    // 현재 재생 시간 초기화
    if (this.hasPlaybackTimeTarget) {
      this.playbackTimeTarget.textContent = "0:00"
    }
    
    console.log("✅ Preview view shown with duration:", duration)
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
      console.log("✅ Audio playing result:", result)
      
      // 재생 완료 시 자동으로 아이콘 토글
      if (result?.finished) {
        console.log("🎵 Playback finished, resetting UI")
        this.isPlaying = false
        this.updatePlaybackUI()
        this.stopPlaybackTimer()
      } else {
        console.log("🎵 Playback started")
        this.isPlaying = true
        this.updatePlaybackUI()
        this.startPlaybackTimer()
      }
    } catch (error) {
      console.error("❌ Play audio failed:", error)
      alert("재생할 수 없습니다.")
    }
  }
  
  async pausePlayback() {
    console.log("⏸️ Sending pauseAudio to native...")
    
    try {
      const result = await this.send("pauseAudio")
      console.log("✅ Audio paused, result:", result)
      
      this.isPlaying = false
      this.updatePlaybackUI()
      this.stopPlaybackTimer()
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
      
      console.log("✅ Audio data result:", result)
      
      if (!result?.audioData) {
        throw new Error("No audio data received from native")
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
  
  // MARK: - 재생 진행 바 타이머
  
  startPlaybackTimer() {
    this.playbackStartTime = Date.now()
    this.playbackTimer = setInterval(() => this.updatePlaybackProgress(), 100)
    console.log("🎵 Playback timer started")
  }
  
  stopPlaybackTimer() {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer)
      this.playbackTimer = null
      console.log("🎵 Playback timer stopped")
    }
  }
  
  updatePlaybackProgress() {
    const elapsed = (Date.now() - this.playbackStartTime) / 1000
    const duration = this.recordedDuration || this.currentTime
    
    // 현재 시간 표시 (MM:SS)
    if (this.hasPlaybackTimeTarget) {
      const minutes = Math.floor(elapsed / 60)
      const seconds = Math.floor(elapsed % 60)
      this.playbackTimeTarget.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    
    // 진행 바 업데이트
    if (this.hasPlaybackProgressTarget) {
      const progress = Math.min((elapsed / duration) * 100, 100)
      this.playbackProgressTarget.style.width = `${progress}%`
    }
    
    // 재생 완료 시 타이머 정리 (Native의 타이머와 동기화)
    if (elapsed >= duration) {
      this.stopPlaybackTimer()
      this.isPlaying = false
      this.updatePlaybackUI()
      console.log("🎵 Playback finished via JavaScript timer")
    }
  }
}

