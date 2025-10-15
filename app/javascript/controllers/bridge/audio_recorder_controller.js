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
    this.playbackTimer = null
    this.startTime = null
    
    console.log("✅ Audio Recorder connected")
    console.log("📤 Submit URL:", this.submitUrlValue)
  }
  
  disconnect() {
    this.stopTimer()
    this.stopPlaybackTimer()
    super.disconnect()
  }
  
  // MARK: - 녹음 시작/중지
  
  toggleRecording() {
    console.log("🎤 Toggle recording, isRecording:", this.isRecording)
    
    if (this.isRecording) {
      this.stopRecording()
    } else {
      // 재녹음 시 기존 녹음 폐기
      if (this.hasRecording) {
        console.log("♻️ Discarding previous recording")
        this.hasRecording = false
        this.hidePlaybackControls()
      }
      this.startRecording()
    }
  }
  
  startRecording() {
    if (this.isRecording) return
    
    console.log("🎤 Sending startRecording to native...")
    
    this.send("startRecording", {}, (result) => {
      console.log("✅ Recording started via native")
      this.isRecording = true
      this.currentTime = 0
      this.startTime = Date.now()
      
      // 진행도 초기화
      this.resetRecordProgress()
      
      // 타이머 시작 (진행도 업데이트)
      this.startTimer()
    })
  }
  
  stopRecording() {
    if (!this.isRecording) return
    
    console.log("🎤 Sending stopRecording to native...")
    
    this.send("stopRecording", {}, (result) => {
      console.log("✅ Recording stopped, result:", result)
      console.log("📊 Duration from native:", result?.data?.duration)
      
      this.isRecording = false
      this.recordedDuration = result?.data?.duration || this.currentTime
      this.hasRecording = true
      this.stopTimer()
      
      console.log("📊 Final recorded duration:", this.recordedDuration)
      
      // 미리듣기 및 제출 버튼 표시
      this.showPlaybackControls()
    })
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
  
  togglePlayback() {
    console.log("🎵 Toggle playback, isPlaying:", this.isPlaying)
    
    if (this.isPlaying) {
      this.stopPlayback()
    } else {
      this.playAudio()
    }
  }
  
  playAudio() {
    console.log("🎵 Sending playAudio to native...")
    
    this.send("playAudio", {}, (result) => {
      console.log("✅ Audio playing result:", result)
      
      this.isPlaying = true
      this.updatePlaybackUI()
      
      // 재생 완료 타이머 시작 (recordedDuration 사용)
      if (this.recordedDuration > 0) {
        this.startPlaybackTimer()
      }
    })
  }
  
  stopPlayback() {
    console.log("⏹️ Sending stopAudio to native...")
    
    this.send("stopAudio", {}, (result) => {
      console.log("✅ Audio stopped, result:", result)
      
      this.isPlaying = false
      this.stopPlaybackTimer()
      this.updatePlaybackUI()
    })
  }
  
  startPlaybackTimer() {
    this.stopPlaybackTimer()
    
    console.log(`⏱️ Starting playback timer for ${this.recordedDuration}s`)
    
    this.playbackTimer = setTimeout(() => {
      console.log("🎵 Audio playback finished (via timer)")
      this.handlePlaybackFinished()
    }, this.recordedDuration * 1000)
  }
  
  stopPlaybackTimer() {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer)
      this.playbackTimer = null
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
      this.playbackButtonTarget.classList.remove("invisible")
      this.playbackButtonTarget.classList.add("visible")
    }
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.classList.remove("invisible")
      this.submitButtonTarget.classList.add("visible")
    }
  }
  
  hidePlaybackControls() {
    if (this.hasPlaybackButtonTarget) {
      this.playbackButtonTarget.classList.add("invisible")
      this.playbackButtonTarget.classList.remove("visible")
    }
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.classList.add("invisible")
      this.submitButtonTarget.classList.remove("visible")
    }
    
    // 재생 상태 초기화
    this.isPlaying = false
    this.updatePlaybackUI()
  }
  
  // 재생 완료 처리 (타이머에서 호출됨)
  handlePlaybackFinished() {
    console.log("🎵 Audio playback finished")
    this.isPlaying = false
    this.stopPlaybackTimer()
    this.updatePlaybackUI()
  }
  
  // MARK: - 게시하기
  
  submit() {
    if (!this.hasRecording) {
      alert("녹음된 파일이 없습니다.")
      return
    }
    
    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.classList.add("opacity-50")
    }
    
    console.log("📤 Requesting audio data from native...")
    
    // Native에서 Base64 데이터 가져오기 (callback 방식)
    this.send("getAudioData", {}, (result) => {
      console.log("✅ Audio data result:", result)
      console.log("📊 Result type:", typeof result)
      console.log("📊 Result keys:", result ? Object.keys(result) : "null")
      console.log("📊 Result.data:", result?.data)
      
      // 에러 응답 확인
      if (result?.data?.error) {
        console.error("❌ Native error:", result.data.error)
        alert(`업로드 중 오류가 발생했습니다: ${result.data.error}`)
        
        if (this.hasSubmitButtonTarget) {
          this.submitButtonTarget.disabled = false
          this.submitButtonTarget.classList.remove("opacity-50")
        }
        return
      }
      
      // audioData 확인
      if (!result?.data?.audioData) {
        console.error("❌ No audioData in result:", result)
        alert("업로드 중 오류가 발생했습니다: No audio data received from native")
        
        if (this.hasSubmitButtonTarget) {
          this.submitButtonTarget.disabled = false
          this.submitButtonTarget.classList.remove("opacity-50")
        }
        return
      }
      
      const audioData = result.data.audioData
      console.log("✅ Audio data received:", audioData.length, "chars")
      console.log("✅ Audio data sample:", audioData.substring(0, 50))
      
      // Rails 서버로 전송
      const formData = new FormData()
      formData.append('recording[audio_data]', audioData)
      
      console.log("📤 Uploading to server:", this.submitUrlValue)
      
      fetch(this.submitUrlValue, {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
        }
      })
      .then(response => {
        console.log("📥 Server response status:", response.status)
        
        if (response.ok) {
          console.log("✅ Upload successful")
          window.location.reload()
        } else {
          return response.text().then(errorText => {
            console.error("❌ Server error:", errorText)
            throw new Error(`Upload failed: ${response.status}`)
          })
        }
      })
      .catch(error => {
        console.error("❌ Upload failed:", error)
        alert(`업로드 중 오류가 발생했습니다: ${error.message}`)
        
        if (this.hasSubmitButtonTarget) {
          this.submitButtonTarget.disabled = false
          this.submitButtonTarget.classList.remove("opacity-50")
        }
      })
    })
  }
}

