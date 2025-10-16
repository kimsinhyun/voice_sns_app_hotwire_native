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
    
    // 다른 플레이어 중지
    window.AudioManager.play(this)
    this.isLoading = true
    this.updateButtons()
    
    try {
      await this.audioTarget.play()
      // isPlaying은 playing 이벤트에서 true로 설정됨
    } catch (error) {
      console.error("❌ Play failed:", error)
      this.isLoading = false
      this.isPlaying = false
      this.updateButtons()
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
    this.isPlaying = false
    this.isLoading = false
    this.audioTarget.currentTime = 0
    this.updateButtons()
    window.AudioManager.stop(this)
  }

  // 버퍼링 중 (재생 중 네트워크 대기)
  handleWaiting() {
    this.isLoading = true
    this.updateButtons()
  }

  // 재생 중 (버퍼링 완료)
  handlePlaying() {
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
