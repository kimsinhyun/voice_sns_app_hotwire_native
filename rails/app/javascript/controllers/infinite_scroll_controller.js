import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sentinel"]
  static values = {
    loading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: true }
  }

  connect() {
    console.log("♾️ Infinite scroll connected")
    
    this.setupObserver()
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }

  setupObserver() {
    // Intersection Observer 설정
    const options = {
      root: null,  // viewport 기준
      rootMargin: '100px',  // 100px 전에 트리거 (미리 로딩)
      threshold: 0.1
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // sentinel이 화면에 보이고, 로딩 중이 아니고, 더 로드할 데이터가 있으면
        if (entry.isIntersecting && !this.loadingValue && this.hasMoreValue) {
          console.log("♾️ Sentinel visible, loading more...")
          this.loadMore()
        }
      })
    }, options)

    // sentinel 요소 관찰 시작
    if (this.hasSentinelTarget) {
      this.observer.observe(this.sentinelTarget)
    }
  }

  async loadMore() {
    if (this.loadingValue || !this.hasMoreValue) {
      console.log("♾️ Already loading or no more data")
      return
    }

    this.loadingValue = true
    console.log("♾️ Loading more echos...")

    try {
      // 현재 마지막 echo ID 가져오기
      const lastId = this.getLastEchoId()
      console.log(`♾️ Last echo ID: ${lastId}`)

      if (!lastId) {
        console.error("♾️ No last echo ID found")
        this.loadingValue = false
        return
      }

      // 스켈레톤 UI 표시
      this.showSkeleton()

      // load_more 요청
      const response = await fetch(`/feed/load_more?last_id=${lastId}`, {
        headers: {
          'Accept': 'text/vnd.turbo-stream.html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const html = await response.text()
        
        // Turbo Stream으로 렌더링
        Turbo.renderStreamMessage(html)
        
        console.log("✅ More echos loaded")
      } else {
        console.error("❌ Failed to load more:", response.status)
        this.removeSkeleton()
      }
    } catch (error) {
      console.error("❌ Load more error:", error)
      this.removeSkeleton()
    } finally {
      this.loadingValue = false
    }
  }

  getLastEchoId() {
    // echos_list 내의 모든 echo 카드에서 마지막 ID 추출
    const listElement = document.getElementById('echos_list')
    if (!listElement) return null

    const echoCards = listElement.querySelectorAll('[data-recording-id]')
    if (echoCards.length === 0) return null

    // 마지막 카드의 data-recording-id 반환
    const lastCard = echoCards[echoCards.length - 1]
    return parseInt(lastCard.dataset.recordingId)
  }

  showSkeleton() {
    const container = document.getElementById('skeleton_loader')
    if (container) {
      container.classList.remove('hidden')
    }
  }

  removeSkeleton() {
    const container = document.getElementById('skeleton_loader')
    if (container) {
      container.classList.add('hidden')
    }
  }

  // Turbo Stream에서 호출: 더 이상 데이터가 없을 때
  markNoMoreData() {
    this.hasMoreValue = false
    console.log("♾️ No more data to load")
    
    // Observer 정리
    if (this.observer && this.hasSentinelTarget) {
      this.observer.unobserve(this.sentinelTarget)
    }
  }
}

