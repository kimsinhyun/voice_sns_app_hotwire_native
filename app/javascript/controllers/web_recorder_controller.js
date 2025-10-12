import { Controller } from "@hotwired/stimulus"

// 웹 기반 오디오 녹음 (MediaRecorder API)
export default class extends Controller {
  static targets = [
    "timer", "recordButton", "micIcon", "stopIcon", "statusText",
    "circleProgress", "pulse", "recordingView", "previewView",
    "recordedDuration", "playButton", "playIcon", "pauseIcon",
    "playbackProgress", "playbackTime", "playbackTotal", "submitButton"
  ]
  static values = {
    maxDuration: { type: Number, default: 10 }
  }

  connect() {
    this.isRecording = false
    this.mediaRecorder = null
    this.audioChunks = []
    this.audioBlob = null
    this.audioUrl = null
    this.audioElement = null
    this.startTime = null
    this.timerInterval = null
    this.currentTime = 0
    this.isPlaying = false
    this.playbackInterval = null
    
    // SVG circle 설정
    this.circleCircumference = 2 * Math.PI * 112 // ≈ 704
    
    // 브라우저 지원 확인
    if (!navigator.mediaDevices?.getUserMedia) {
      this.showError("이 브라우저는 녹음을 지원하지 않습니다.")
    }
    
    // MIME type 지원 체크
    const testTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    console.log('📱 Supported MIME types for recording:')
    testTypes.forEach(type => {
      const supported = MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(type) : false
      console.log(`  - ${type}: ${supported}`)
    })
    
    console.log('📱 Supported MIME types for playback:')
    const audio = new Audio()
    testTypes.forEach(type => {
      const canPlay = audio.canPlayType(type)
      console.log(`  - ${type}: ${canPlay}`)
    })
    
    console.log("✅ Web Recorder connected")
  }

  disconnect() {
    this.cleanup()
  }

  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval)
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl)
    }
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
  }

  async toggleRecording() {
    console.log("🎤 Toggle recording called, isRecording:", this.isRecording)
    
    if (this.isRecording) {
      this.stopRecording()
    } else {
      await this.startRecording()
    }
  }

  async startRecording() {
    if (this.isRecording) return

    try {
      console.log("🎤 Requesting microphone access...")
      
      // 마이크 권한 요청 및 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("✅ Microphone stream obtained")
      
      // AAC 포맷 우선 시도 (iOS/Android 완전 호환)
      let options = {}
      const supportedTypes = [
        'audio/mp4',              // AAC in MP4
        'audio/aac',              // AAC
        'audio/webm;codecs=opus', // 폴백
        'audio/webm'              // 최종 폴백
      ]
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type
          console.log(`✅ Using MIME type: ${type}`)
          break
        }
      }
      
      // 품질 최적화: SNS 음성 메시지용 비트레이트 (48 kbps)
      // 파일 크기 약 60% 감소 (160KB → 60KB/10초)
      options.audioBitsPerSecond = 48000
      
      // MediaRecorder 생성
      this.mediaRecorder = new MediaRecorder(stream, options)
      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      this.mediaRecorder.onstop = () => {
        this.handleRecordingComplete()
      }
      
      // 녹음 시작
      this.mediaRecorder.start()
      this.isRecording = true
      this.startTime = Date.now()
      this.currentTime = 0
      
      // UI 업데이트
      this.updateUIForRecording(true)
      
      // 타이머 시작
      this.timerInterval = setInterval(() => this.updateTimer(), 100)
      
      console.log("✅ Recording started")
    } catch (error) {
      console.error("❌ Recording error:", error)
      
      // 에러 타입별 사용자 친화적 메시지
      let message = "녹음을 시작할 수 없습니다."
      
      if (error.name === 'NotAllowedError') {
        message = "마이크 권한이 필요합니다.\n\niOS 설정 > voice_talk_ios > 마이크를 활성화해주세요."
      } else if (error.name === 'NotSupportedError') {
        message = "이 브라우저는 녹음을 지원하지 않습니다.\niOS 14.3 이상이 필요합니다."
      } else if (error.name === 'NotFoundError') {
        message = "마이크를 찾을 수 없습니다.\n기기에 마이크가 연결되어 있는지 확인해주세요."
      } else if (error.name === 'NotReadableError') {
        message = "마이크에 접근할 수 없습니다.\n다른 앱에서 마이크를 사용 중일 수 있습니다."
      }
      
      this.showError(message)
    }
  }

  stopRecording() {
    if (!this.isRecording) return

    this.isRecording = false
    
    // 타이머 중지
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    
    // MediaRecorder 중지
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
      
      // 스트림 정지 (마이크 해제)
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
    
    // UI 업데이트
    this.updateUIForRecording(false)
    
    console.log("✅ Recording stopped")
  }

  handleRecordingComplete() {
    // Blob 생성 (선택된 MIME type 사용)
    const mimeType = this.mediaRecorder.mimeType || 'audio/webm'
    this.audioBlob = new Blob(this.audioChunks, { type: mimeType })
    this.audioUrl = URL.createObjectURL(this.audioBlob)
    
    console.log("📦 Recording complete:", {
      mimeType: mimeType,
      size: this.audioBlob.size,
      duration: this.currentTime.toFixed(1)
    })
    
    // 1초 후 미리듣기 화면으로 전환
    setTimeout(() => this.showPreviewView(), 1000)
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

    console.log("🎵 Creating audio element for preview")
    console.log("🎵 Blob info:", {
      type: this.audioBlob.type,
      size: this.audioBlob.size,
      url: this.audioUrl
    })
    
    // 브라우저가 이 MIME type을 재생할 수 있는지 체크
    const tempAudio = new Audio()
    const canPlay = tempAudio.canPlayType(this.audioBlob.type)
    console.log(`🎵 Can play ${this.audioBlob.type}: "${canPlay}"`)
    
    if (canPlay === '') {
      console.warn("⚠️ Browser cannot play this audio format, but will try anyway")
    }
    
    // Audio 엘리먼트를 src 없이 먼저 생성
    this.audioElement = new Audio()
    
    // 이벤트 리스너를 src 설정 전에 모두 등록 (중요!)
    this.audioElement.addEventListener('loadstart', () => {
      console.log("🎵 loadstart")
    })
    
    this.audioElement.addEventListener('loadedmetadata', () => {
      console.log("🎵 loadedmetadata - duration:", this.audioElement.duration)
      if (this.hasPlaybackTotalTarget) {
        const minutes = Math.floor(this.audioElement.duration / 60)
        const seconds = Math.floor(this.audioElement.duration % 60)
        this.playbackTotalTarget.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    })
    
    this.audioElement.addEventListener('canplay', () => {
      console.log("🎵 canplay - readyState:", this.audioElement.readyState)
    })
    
    this.audioElement.addEventListener('error', (e) => {
      console.error("❌ Audio playback error:", {
        error: this.audioElement.error,
        code: this.audioElement.error?.code,
        message: this.audioElement.error?.message,
        blobType: this.audioBlob.type,
        blobSize: this.audioBlob.size
      })
      
      // 사용자에게 알림 (미리듣기 실패해도 게시는 가능)
      alert("미리듣기를 재생할 수 없습니다.\n게시하기를 눌러 업로드해주세요.")
    })
    
    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false
      this.updatePlaybackUI()
      if (this.playbackInterval) {
        clearInterval(this.playbackInterval)
      }
    })

    // 이제 src를 설정하고 로드
    this.audioElement.src = this.audioUrl
    this.audioElement.load()

    console.log("✅ Preview view shown, audio element loading...")
  }

  togglePlayback() {
    if (!this.audioElement) {
      alert("오디오를 준비하는 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }

    if (this.isPlaying) {
      this.audioElement.pause()
      if (this.playbackInterval) {
        clearInterval(this.playbackInterval)
      }
    } else {
      this.audioElement.play()
      this.playbackInterval = setInterval(() => this.updatePlaybackProgress(), 100)
    }
    this.isPlaying = !this.isPlaying
    this.updatePlaybackUI()
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

  updatePlaybackProgress() {
    if (!this.audioElement) return

    const currentTime = this.audioElement.currentTime
    const duration = this.audioElement.duration

    if (this.hasPlaybackProgressTarget) {
      const progress = (currentTime / duration) * 100
      this.playbackProgressTarget.style.width = `${progress}%`
    }

    if (this.hasPlaybackTimeTarget) {
      const minutes = Math.floor(currentTime / 60)
      const seconds = Math.floor(currentTime % 60)
      this.playbackTimeTarget.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  cancel() {
    if (confirm("녹음을 취소하시겠습니까? 저장되지 않습니다.")) {
      window.location.href = "/feed"
    }
  }

  async submit() {
    if (!this.audioBlob) {
      alert("녹음 파일이 없습니다.")
      return
    }

    if (this.hasSubmitButtonTarget) {
      this.submitButtonTarget.disabled = true
      this.submitButtonTarget.textContent = "업로드 중..."
    }

    try {
      const formData = new FormData()
      
      // MIME type에 따라 파일 확장자 결정
      const mimeType = this.audioBlob.type
      let fileName = 'recording.webm' // 기본값
      
      if (mimeType.includes('mp4')) {
        fileName = 'recording.m4a'
      } else if (mimeType.includes('aac')) {
        fileName = 'recording.aac'
      }
      
      console.log(`📤 Uploading ${fileName} (${this.audioBlob.size} bytes)`)
      formData.append('recording[audio_file]', this.audioBlob, fileName)

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
      alert("업로드 중 오류가 발생했습니다.")
      
      if (this.hasSubmitButtonTarget) {
        this.submitButtonTarget.disabled = false
        this.submitButtonTarget.textContent = "게시하기"
      }
    }
  }

  showError(message) {
    if (this.hasStatusTextTarget) {
      this.statusTextTarget.textContent = message
      this.statusTextTarget.classList.add("text-red-500")
    }
    console.error("❌", message)
  }
}

