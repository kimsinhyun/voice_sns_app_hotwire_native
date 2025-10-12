import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  // Bridge Component 이름 (Swift와 동일해야 함)
  static component = "audio-recorder"
  
  // Stimulus Targets
  static targets = [
    "recordButton", "recordProgress",
    "playbackButton", "playIcon", "stopIcon",
    "submitButton"
  ]
  
  // Stimulus Values
  static values = {
    submitUrl: String,
    maxDuration: { type: Number, default: 10 }
  }
  
  // 초기화
  connect() {
    super.connect()
    
    this.isRecording = false
    this.isPlaying = false
    this.hasRecording = false
    this.currentTime = 0
    this.recordedDuration = 0
    this.timerInterval = null
    this.startTime = null
    
    console.log("✅ Compact Audio Recorder connected")
    console.log("📤 Submit URL:", this.submitUrlValue)
  }
  
  disconnect() {
    this.stopTimer()
    super.disconnect()
  }
  
  // MARK: - 녹음 시작/중지
  
  async toggleRecording() {
    console.log("🎤 Toggle recording, isRecording:", this.isRecording)
    
    if (this.isRecording) {
      await this.stopRecording()
    } else {
      // 재녹음 시 기존 녹음 폐기
      if (this.hasRecording) {
        console.log("♻️ Discarding previous recording")
        this.hasRecording = false
        this.hidePlaybackControls()
      }
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
      
      // 진행도 초기화
      this.resetRecordProgress()
      
      // 타이머 시작 (진행도 업데이트)
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
      this.hasRecording = true
      this.stopTimer()
      
      console.log("📊 Final recorded duration:", this.recordedDuration)
      
      // 미리듣기 및 제출 버튼 표시
      this.showPlaybackControls()
      
    } catch (error) {
      console.error("❌ Stop recording failed:", error)
      // 오류 시에도 현재 시간으로 fallback
      this.recordedDuration = this.currentTime
      this.isRecording = false
      this.hasRecording = true
      this.stopTimer()
      this.showPlaybackControls()
    }
  }
  
  // MARK: - 타이머 (진행도 업데이트)
  
  startTimer() {
    this.timerInterval = setInterval(() => this.updateRecordProgress(), 100)
  }
  
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
  
  updateRecordProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000
    this.currentTime = elapsed
    
    // 진행도 계산 (0-100%)
    const progress = Math.min((elapsed / this.maxDurationValue) * 100, 100)
    
    // clip-path 업데이트 (왼쪽에서 오른쪽으로 채워짐)
    if (this.hasRecordProgressTarget) {
      this.recordProgressTarget.style.clipPath = `inset(0 ${100 - progress}% 0 0)`
    }
    
    // 최대 시간 도달 시 자동 중지
    if (elapsed >= this.maxDurationValue) {
      this.stopRecording()
    }
  }
  
  resetRecordProgress() {
    if (this.hasRecordProgressTarget) {
      this.recordProgressTarget.style.clipPath = `inset(0 100% 0 0)`
    }
  }
  
  // MARK: - 미리듣기
  
  async togglePlayback() {
    console.log("🎵 Toggle playback, isPlaying:", this.isPlaying)
    
    if (this.isPlaying) {
      await this.stopPlayback()
    } else {
      await this.playAudio()
    }
  }
  
  async playAudio() {
    console.log("🎵 Sending playAudio to native...")
    
    try {
      const result = await this.send("playAudio")
      console.log("✅ Audio playing result:", result)
      
      this.isPlaying = true
      this.updatePlaybackUI()
      
    } catch (error) {
      console.error("❌ Play audio failed:", error)
      alert("재생할 수 없습니다.")
    }
  }
  
  async stopPlayback() {
    console.log("⏹️ Sending stopAudio to native...")
    
    try {
      const result = await this.send("stopAudio")
      console.log("✅ Audio stopped, result:", result)
      
      this.isPlaying = false
      this.updatePlaybackUI()
      
    } catch (error) {
      console.error("❌ Stop audio failed:", error)
    }
  }
  
  updatePlaybackUI() {
    if (this.hasPlayIconTarget && this.hasStopIconTarget) {
      if (this.isPlaying) {
        this.playIconTarget.classList.add("hidden")
        this.stopIconTarget.classList.remove("hidden")
      } else {
        this.playIconTarget.classList.remove("hidden")
        this.stopIconTarget.classList.add("hidden")
      }
    }
  }
  
  showPlaybackControls() {
    if (this.hasPlaybackButtonTarget) {
      this.playbackButtonTarget.classList.remove("hidden")
      this.playbackButtonTarget.classList.add("flex")
    }
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.classList.remove("hidden")
      this.submitButtonTarget.classList.add("flex")
    }
  }
  
  hidePlaybackControls() {
    if (this.hasPlaybackButtonTarget) {
      this.playbackButtonTarget.classList.add("hidden")
      this.playbackButtonTarget.classList.remove("flex")
    }
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.classList.add("hidden")
      this.submitButtonTarget.classList.remove("flex")
    }
    
    // 재생 상태 초기화
    this.isPlaying = false
    this.updatePlaybackUI()
  }
  
  // MARK: - 게시하기
  
  async submit() {
    if (!this.hasRecording) {
      alert("녹음된 파일이 없습니다.")
      return
    }
    
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.classList.add("opacity-50")
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
      
      const response = await fetch(this.submitUrlValue, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
      
      if (response.ok) {
        console.log("✅ Upload successful")
        // 페이지 새로고침 또는 성공 처리
        window.location.reload()
      } else {
        throw new Error('Upload failed')
      }
      
    } catch (error) {
      console.error("❌ Submit failed:", error)
      alert("업로드 중 오류가 발생했습니다")
      
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.classList.remove("opacity-50")
      }
    }
  }
}

