import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["spinner", "container"]
  static values = {
    threshold: { type: Number, default: 80 }  // 새로고침 트리거 거리 (px)
  }

  connect() {
    console.log("🔄 Custom pull to refresh connected")
    
    this.isRefreshing = false
    this.startY = 0
    this.currentY = 0
    this.isPulling = false
    
    // 터치 이벤트 바인딩 (container에)
    if (this.hasContainerTarget) {
      this.containerTarget.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true })
      this.containerTarget.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
      this.containerTarget.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true })
    }
    
    // Custom event listening (Turbo Stream에서 dispatch)
    this.handleRecordingsUpdatedBound = this.handleRecordingsUpdated.bind(this)
    window.addEventListener('feed:recordings-updated', this.handleRecordingsUpdatedBound)
  }

  disconnect() {
    if (this.hasContainerTarget) {
      this.containerTarget.removeEventListener('touchstart', this.handleTouchStart)
      this.containerTarget.removeEventListener('touchmove', this.handleTouchMove)
      this.containerTarget.removeEventListener('touchend', this.handleTouchEnd)
    }
    
    window.removeEventListener('feed:recordings-updated', this.handleRecordingsUpdatedBound)
  }

  handleTouchStart(e) {
    // 스크롤이 최상단일 때만 활성화
    if (this.containerTarget.scrollTop === 0 && !this.isRefreshing) {
      this.startY = e.touches[0].pageY
      this.isPulling = true
    }
  }

  handleTouchMove(e) {
    if (!this.isPulling || this.isRefreshing || this.startY === 0) return
    
    this.currentY = e.touches[0].pageY
    const pullDistance = this.currentY - this.startY
    
    // 아래로 당기는 동작일 때만 (스크롤 최상단에서)
    if (pullDistance > 0 && this.containerTarget.scrollTop === 0) {
      // 기본 스크롤 방지 (바운스 효과 제거)
      e.preventDefault()
      
      // 시각적 피드백 (당기는 거리에 따라 스피너 표시)
      const progress = Math.min(pullDistance / this.thresholdValue, 1)
      this.updateSpinner(progress, pullDistance)
    }
  }

  handleTouchEnd(e) {
    if (!this.isPulling || this.isRefreshing || this.startY === 0) return
    
    const pullDistance = this.currentY - this.startY
    
    // 임계값을 넘으면 새로고침 실행
    if (pullDistance > this.thresholdValue) {
      console.log(`🔄 Threshold exceeded: ${pullDistance}px > ${this.thresholdValue}px`)
      this.refresh()
    } else {
      console.log(`🔄 Threshold not met: ${pullDistance}px < ${this.thresholdValue}px`)
      this.resetSpinner()
    }
    
    // 상태 초기화
    this.startY = 0
    this.currentY = 0
    this.isPulling = false
  }

  updateSpinner(progress, pullDistance) {
    if (!this.hasSpinnerTarget) return
    
    // 스피너를 당기는 거리에 따라 이동 및 표시
    const translateY = Math.min(pullDistance * 0.5, 60)  // 최대 60px 이동
    
    this.spinnerTarget.style.opacity = progress
    this.spinnerTarget.style.transform = `translateX(-50%) translateY(${translateY}px) scale(${progress})`
  }

  resetSpinner() {
    if (!this.hasSpinnerTarget) return
    
    this.spinnerTarget.style.opacity = 0
    this.spinnerTarget.style.transform = 'translateX(-50%) translateY(0) scale(0)'
  }

  async refresh() {
    if (this.isRefreshing) return
    
    this.isRefreshing = true
    console.log("🔄 Pull to refresh triggered")
    
    // 스피너 완전히 표시하고 회전 애니메이션 시작
    if (this.hasSpinnerTarget) {
      this.spinnerTarget.style.opacity = 1
      this.spinnerTarget.style.transform = 'translateX(-50%) translateY(50px) scale(1)'
      
      // 회전 애니메이션 추가
      const svg = this.spinnerTarget.querySelector('svg')
      if (svg) {
        svg.classList.add('animate-spin')
      }
    }
    
    try {
      // 최신 recording ID 가져오기
      const latestId = this.getLatestRecordingId()
      console.log(`🔄 Fetching recordings since ID: ${latestId}`)
      
      // 새 recordings 요청
      const response = await fetch(`/feed/refresh?since_id=${latestId}`, {
        headers: {
          'Accept': 'text/vnd.turbo-stream.html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        Turbo.renderStreamMessage(html)
        console.log("✅ Feed refreshed successfully")
      } else {
        console.error("❌ Failed to refresh feed:", response.status)
      }
    } catch (error) {
      console.error("❌ Refresh error:", error)
    } finally {
      // 애니메이션과 함께 종료 (0.5초 후)
      setTimeout(() => {
        if (this.hasSpinnerTarget) {
          this.resetSpinner()
          
          // 회전 애니메이션 제거
          const svg = this.spinnerTarget.querySelector('svg')
          if (svg) {
            svg.classList.remove('animate-spin')
          }
        }
        
        this.isRefreshing = false
      }, 500)
    }
  }

  getLatestRecordingId() {
    const listElement = document.getElementById('recordings_list')
    if (listElement) {
      return parseInt(listElement.dataset.latestRecordingId) || 0
    }
    return 0
  }

  handleRecordingsUpdated(event) {
    const { latestId } = event.detail;
    if (!latestId) return;
  
    const listElement = document.getElementById('recordings_list');
    if (listElement) {
      listElement.dataset.latestRecordingId = latestId;
      console.log(`✅ [Stimulus] Latest recording ID updated to: ${latestId}`);
    }
  }
}

