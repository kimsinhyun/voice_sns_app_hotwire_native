import { Controller } from "@hotwired/stimulus"

// 오디오 재생을 위한 Stimulus Controller
export default class extends Controller {
  static targets = [
    "audio", "playButton", "playIcon", "pauseIcon", 
    "progress", "currentTime", "totalTime", "duration"
  ]
  static values = {
    url: String,
    duration: Number
  }

  connect() {
    this.isPlaying = false
    this.updateInterval = null

    console.log("🎵 === Audio Player Connect ===")
    console.log("  hasAudioTarget:", this.hasAudioTarget)
    
    if (this.hasAudioTarget) {
      console.log("  Audio src:", this.audioTarget.src)
      console.log("  Audio readyState:", this.audioTarget.readyState)
      console.log("  Audio networkState:", this.audioTarget.networkState)
      console.log("  canPlayType (audio/mpeg):", this.audioTarget.canPlayType('audio/mpeg'))
      console.log("  canPlayType (audio/mp3):", this.audioTarget.canPlayType('audio/mp3'))
      console.log("  canPlayType (audio/wav):", this.audioTarget.canPlayType('audio/wav'))
      console.log("  canPlayType (audio/webm):", this.audioTarget.canPlayType('audio/webm'))
      
      // URL 테스트 - fetch로 실제 접근 가능한지 확인
      fetch(this.audioTarget.src, { method: 'HEAD' })
        .then(response => {
          console.log("📡 Audio URL fetch test:")
          console.log("  Status:", response.status)
          console.log("  Content-Type:", response.headers.get('Content-Type'))
          console.log("  Content-Length:", response.headers.get('Content-Length'))
        })
        .catch(err => {
          console.error("❌ Audio URL fetch failed:", err)
        })
    }

    // 오디오 로드 완료
    this.audioTarget.addEventListener('loadedmetadata', () => {
      console.log("✅ Audio metadata loaded")
      console.log("  Duration:", this.audioTarget.duration)
      this.updateTotalTime()
    })

    // 오디오 로드 시작
    this.audioTarget.addEventListener('loadstart', () => {
      console.log("🔄 Audio load started")
    })

    // 오디오 로드 중 에러
    this.audioTarget.addEventListener('error', (e) => {
      console.error("❌ Audio load error:", e)
      console.error("  Error code:", this.audioTarget.error?.code)
      console.error("  Error message:", this.audioTarget.error?.message)
    })

    // 재생 종료
    this.audioTarget.addEventListener('ended', () => {
      console.log("⏹️ Audio playback ended")
      this.isPlaying = false
      this.updatePlayPauseIcon()
      if (this.updateInterval) {
        clearInterval(this.updateInterval)
      }
      this.resetProgress()
    })

    console.log("✅ Audio player connected:", this.urlValue)
  }

  disconnect() {
    if (this.hasAudioTarget) {
      this.audioTarget.pause()
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }

  toggle() {
    console.log("🔘 Toggle clicked, isPlaying:", this.isPlaying)
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  async play() {
    console.log("▶️ === Play 시작 ===")
    console.log("  Audio src:", this.audioTarget.src)
    console.log("  Audio readyState:", this.audioTarget.readyState)
    console.log("  Audio paused:", this.audioTarget.paused)
    console.log("  Audio currentTime:", this.audioTarget.currentTime)
    console.log("  Audio duration:", this.audioTarget.duration)
    
    try {
      // 다른 재생 중인 오디오 모두 정지
      document.querySelectorAll('audio').forEach(audio => {
        if (audio !== this.audioTarget) {
          audio.pause()
        }
      })

      console.log("🎯 Calling audioTarget.play()...")
      const playPromise = this.audioTarget.play()
      console.log("  Play promise:", playPromise)
      
      await playPromise
      
      console.log("✅ Play succeeded!")
      this.isPlaying = true
      this.updatePlayPauseIcon()

      // 진행 상황 업데이트 시작
      this.updateInterval = setInterval(() => {
        this.updateProgress()
      }, 100)
    } catch (error) {
      console.error("❌ === 오디오 재생 실패 ===")
      console.error("  Error name:", error.name)
      console.error("  Error message:", error.message)
      console.error("  Error:", error)
      this.isPlaying = false
      this.updatePlayPauseIcon()
    }
  }

  pause() {
    console.log("⏸️ Pause called")
    this.audioTarget.pause()
    this.isPlaying = false
    this.updatePlayPauseIcon()

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }

  updatePlayPauseIcon() {
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

  updateProgress() {
    if (!this.hasAudioTarget) return

    const currentTime = this.audioTarget.currentTime
    const duration = this.audioTarget.duration

    // 진행 바 업데이트
    if (this.hasProgressTarget && duration) {
      const progress = (currentTime / duration) * 100
      this.progressTarget.style.width = `${progress}%`
    }

    // 현재 시간 업데이트
    if (this.hasCurrentTimeTarget) {
      this.currentTimeTarget.textContent = this.formatTime(currentTime)
    }
  }

  updateTotalTime() {
    if (this.hasTotalTimeTarget && this.audioTarget.duration) {
      this.totalTimeTarget.textContent = this.formatTime(this.audioTarget.duration)
    }
  }

  resetProgress() {
    if (this.hasProgressTarget) {
      this.progressTarget.style.width = "0%"
    }

    if (this.hasCurrentTimeTarget) {
      this.currentTimeTarget.textContent = "0:00"
    }

    this.audioTarget.currentTime = 0
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00"
    
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

