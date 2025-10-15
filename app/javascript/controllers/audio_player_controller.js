import { Controller } from "@hotwired/stimulus"

// 전역 AudioManager: 현재 재생 중인 컨트롤러 추적
window.AudioManager = {
  currentPlayer: null,
  
  play(controller) {
    // 다른 플레이어가 재생 중이면 중지
    if (this.currentPlayer && this.currentPlayer !== controller) {
      this.currentPlayer.stop()
    }
    this.currentPlayer = controller
  },
  
  stop(controller) {
    if (this.currentPlayer === controller) {
      this.currentPlayer = null
    }
  }
}

export default class extends Controller {
  static targets = ["audio", "playButton", "stopButton", "loadingButton"]
  static values = {
    url: String
  }

  connect() {
    this.isPlaying = false
    this.isLoading = false
    console.log("🎵 Audio player connected:", this.urlValue)
  }

  disconnect() {
    this.stop()
  }

  // 재생
  async play() {
    if (this.isPlaying || this.isLoading) return

    console.log("▶️ Attempting to play audio:", this.urlValue)
    
    // 다른 플레이어 중지
    window.AudioManager.play(this)
    
    // 로딩 상태 시작
    this.isLoading = true
    this.updateButtons()
    
    try {
      // 재생 시작 (preload="none"이므로 자동으로 load됨)
      await this.audioTarget.play()
      // isPlaying은 playing 이벤트에서 true로 설정됨
    } catch (error) {
      console.error("❌ Play failed:", error)
      this.isLoading = false
      this.isPlaying = false
      this.updateButtons()
      alert("오디오 재생에 실패했습니다.")
    }
  }

  // 완전 중지 (currentTime 리셋)
  stop() {
    if (!this.isPlaying) return

    console.log("⏹️ Stopping audio:", this.urlValue)
    
    this.audioTarget.pause()
    this.audioTarget.currentTime = 0
    this.isPlaying = false
    this.isLoading = false
    this.updateButtons()
    
    window.AudioManager.stop(this)
  }

  // 오디오 재생 종료 이벤트
  handleEnded() {
    console.log("✅ Audio ended:", this.urlValue)
    this.isPlaying = false
    this.isLoading = false
    this.audioTarget.currentTime = 0
    this.updateButtons()
    window.AudioManager.stop(this)
  }

  // 로딩 시작
  handleLoadStart() {
    console.log("🔄 Loading started:", this.urlValue)
    this.isLoading = true
    this.updateButtons()
  }

  // 재생 가능 상태
  handleCanPlay() {
    console.log("✅ Can play:", this.urlValue)
    // play() 함수에서 이미 처리하므로 여기서는 로그만
  }

  // 버퍼링 중 (재생 중 네트워크 대기)
  handleWaiting() {
    console.log("⏳ Waiting (buffering):", this.urlValue)
    this.isLoading = true
    this.updateButtons()
  }

  // 재생 중 (버퍼링 완료)
  handlePlaying() {
    console.log("▶️ Playing (buffering complete):", this.urlValue)
    this.isPlaying = true
    this.isLoading = false
    this.updateButtons()
  }

  // 에러 처리
  handleError(event) {
    console.error("❌ Audio error:", event)
    this.isLoading = false
    this.isPlaying = false
    this.updateButtons()
  }

  // 버튼 UI 업데이트
  updateButtons() {
    if (!this.hasPlayButtonTarget || !this.hasStopButtonTarget || !this.hasLoadingButtonTarget) return

    // 모든 버튼 숨기기
    this.playButtonTarget.classList.add("hidden")
    this.stopButtonTarget.classList.add("hidden")
    this.loadingButtonTarget.classList.add("hidden")

    // 상태에 따라 버튼 표시
    if (this.isLoading) {
      this.loadingButtonTarget.classList.remove("hidden")
    } else if (this.isPlaying) {
      this.stopButtonTarget.classList.remove("hidden")
    } else {
      this.playButtonTarget.classList.remove("hidden")
    }
  }
}
