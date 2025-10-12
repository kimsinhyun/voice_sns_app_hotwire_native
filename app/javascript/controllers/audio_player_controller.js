import { Controller } from "@hotwired/stimulus"

// 오디오 재생을 위한 Stimulus Controller
export default class extends Controller {
  static targets = [
    "playButton", "playIcon", "pauseIcon", 
    "progress", "currentTime", "totalTime", "duration"
  ]
  static values = {
    url: String,
    duration: Number
  }

  connect() {
    this.audio = new Audio(this.urlValue)
    this.isPlaying = false
    this.updateInterval = null

    // 오디오 로드 완료
    this.audio.addEventListener('loadedmetadata', () => {
      this.updateTotalTime()
    })

    // 재생 종료
    this.audio.addEventListener('ended', () => {
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
    if (this.audio) {
      this.audio.pause()
      this.audio = null
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  play() {
    // 다른 재생 중인 오디오 모두 정지
    document.querySelectorAll('audio').forEach(audio => {
      if (audio !== this.audio) {
        audio.pause()
      }
    })

    this.audio.play()
    this.isPlaying = true
    this.updatePlayPauseIcon()

    // 진행 상황 업데이트 시작
    this.updateInterval = setInterval(() => {
      this.updateProgress()
    }, 100)
  }

  pause() {
    this.audio.pause()
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
    if (!this.audio) return

    const currentTime = this.audio.currentTime
    const duration = this.audio.duration

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
    if (this.hasTotalTimeTarget && this.audio.duration) {
      this.totalTimeTarget.textContent = this.formatTime(this.audio.duration)
    }
  }

  resetProgress() {
    if (this.hasProgressTarget) {
      this.progressTarget.style.width = "0%"
    }

    if (this.hasCurrentTimeTarget) {
      this.currentTimeTarget.textContent = "0:00"
    }

    this.audio.currentTime = 0
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00"
    
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

