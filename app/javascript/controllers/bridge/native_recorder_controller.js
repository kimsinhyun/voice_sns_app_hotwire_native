import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "audio-recorder"
  
  static targets = [
    "timer", "recordButton", "micIcon", "stopIcon", "statusText",
    "circleProgress", "pulse", "recordingView", "previewView",
    "recordedDuration", "playButton", "playIcon", "pauseIcon",
    "submitButton"
  ]
  
  static values = {
    maxDuration: { type: Number, default: 10 }
  }

  connect() {
    super.connect()
    
    this.isRecording = false
    this.startTime = null
    this.timerInterval = null
    this.currentTime = 0
    this.isPlaying = false
    
    // SVG circle 설정
    this.circleCircumference = 2 * Math.PI * 112 // ≈ 704
    
    console.log("✅ Native Recorder connected")
  }

  disconnect() {
    this.cleanup()
    super.disconnect()
  }

  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording()
    } else {
      await this.startRecording()
    }
  }

  async startRecording() {
    if (this.isRecording) return

    try {
      console.log("📤 Sending startRecording to native")
      
      const result = await this.send("startRecording")
      
      if (result.success) {
        this.isRecording = true
        this.startTime = Date.now()
        this.currentTime = 0
        
        // UI 업데이트
        this.updateUIForRecording(true)
        
        // 타이머 시작
        this.timerInterval = setInterval(() => this.updateTimer(), 100)
        
        console.log("✅ Recording started")
      } else {
        throw new Error(result.error || "Failed to start recording")
      }
    } catch (error) {
      console.error("❌ Recording error:", error)
      alert("녹음을 시작할 수 없습니다: " + error.message)
    }
  }

  async stopRecording() {
    if (!this.isRecording) return

    this.isRecording = false
    
    // 타이머 중지
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    
    try {
      console.log("📤 Sending stopRecording to native")
      
      const result = await this.send("stopRecording")
      
      if (result.success) {
        // UI 업데이트
        this.updateUIForRecording(false)
        
        console.log("✅ Recording stopped, duration:", result.duration)
        
        // 1초 후 미리듣기 화면으로 전환
        setTimeout(() => this.showPreviewView(), 1000)
      } else {
        throw new Error(result.error || "Failed to stop recording")
      }
    } catch (error) {
      console.error("❌ Stop recording error:", error)
      alert("녹음 중지 실패: " + error.message)
    }
  }

  updateTimer() {
    if (!this.isRecording) return

    const elapsed = (Date.now() - this.startTime) / 1000
    this.currentTime = elapsed
    const remaining = this.maxDurationValue - elapsed

    // 타이머 텍스트 업데이트 (카운트다운)
    if (this.hasTimerTarget) {
      this.timerTarget.textContent = Math.max(0, remaining).toFixed(1)
    }

    // 원형 진행 바 업데이트
    if (this.hasCircleProgressTarget) {
      const progress = elapsed / this.maxDurationValue
      const offset = this.circleCircumference * (1 - progress)
      this.circleProgressTarget.style.strokeDashoffset = offset
      
      // 색상 변화
      if (remaining <= 3) {
        this.circleProgressTarget.classList.remove('text-red-500', 'text-orange-500')
        this.circleProgressTarget.classList.add('text-green-500')
      } else if (remaining <= 5) {
        this.circleProgressTarget.classList.remove('text-red-500', 'text-green-500')
        this.circleProgressTarget.classList.add('text-orange-500')
      }
    }

    // 최대 시간 도달 시 자동 중지
    if (elapsed >= this.maxDurationValue) {
      this.stopRecording()
    }
  }

  updateUIForRecording(isRecording) {
    if (isRecording) {
      // 녹음 중 UI
      if (this.hasMicIconTarget) this.micIconTarget.classList.add("hidden")
      if (this.hasStopIconTarget) this.stopIconTarget.classList.remove("hidden")
      if (this.hasStatusTextTarget) this.statusTextTarget.textContent = "탭하여 중지"
      if (this.hasPulseTarget) {
        this.pulseTarget.style.display = "block"
        this.pulseTarget.classList.add("opacity-30")
      }
      if (this.hasRecordButtonTarget) {
        this.recordButtonTarget.classList.add("scale-110")
      }
    } else {
      // 중지 후 대기
      if (this.hasMicIconTarget) this.micIconTarget.classList.remove("hidden")
      if (this.hasStopIconTarget) this.stopIconTarget.classList.add("hidden")
      if (this.hasStatusTextTarget) this.statusTextTarget.textContent = "처리 중..."
      if (this.hasPulseTarget) {
        this.pulseTarget.style.display = "none"
        this.pulseTarget.classList.remove("opacity-30")
      }
      if (this.hasRecordButtonTarget) {
        this.recordButtonTarget.classList.remove("scale-110")
      }
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

  async togglePlayback() {
    if (this.isPlaying) {
      await this.pausePlayback()
    } else {
      await this.playAudio()
    }
  }

  async playAudio() {
    try {
      console.log("📤 Sending playAudio to native")
      
      const result = await this.send("playAudio")
      
      if (result.success) {
        this.isPlaying = true
        this.updatePlaybackUI()
        console.log("✅ Playing audio")
      }
    } catch (error) {
      console.error("❌ Playback error:", error)
      alert("재생 실패: " + error.message)
    }
  }

  async pausePlayback() {
    try {
      console.log("📤 Sending pauseAudio to native")
      
      const result = await this.send("pauseAudio")
      
      if (result.success) {
        this.isPlaying = false
        this.updatePlaybackUI()
        console.log("✅ Audio paused")
      }
    } catch (error) {
      console.error("❌ Pause error:", error)
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

  cancel() {
    if (confirm("녹음을 취소하시겠습니까? 저장되지 않습니다.")) {
      window.location.href = "/feed"
    }
  }

  async submit() {
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "업로드 중..."
    }

    try {
      console.log("📤 Requesting audio data from native")
      
      const result = await this.send("getAudioData")
      
      if (!result.success || !result.audioData) {
        throw new Error("Failed to get audio data")
      }
      
      console.log("✅ Received audio data, uploading to server...")
      
      // Rails 서버로 업로드
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
        console.log("✅ Recording uploaded successfully")
        window.location.href = "/feed"
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error("❌ Upload error:", error)
      alert("업로드 중 오류가 발생했습니다: " + error.message)
      
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "게시하기"
      }
    }
  }
}

