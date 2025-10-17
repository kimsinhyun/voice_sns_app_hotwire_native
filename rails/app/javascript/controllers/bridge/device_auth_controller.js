import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

export default class extends BridgeComponent {
  static component = "device-auth"
  
  // 최대 3번 재시도
  maxRetries = 3
  currentRetry = 0
  
  connect() {
    super.connect()
    this.attemptDeviceLogin()
  }
  
  attemptDeviceLogin() {
    // Callback 방식 사용 (BridgeComponent.md 참고)
    this.send("getDeviceId", {}, (result) => {
      if (result?.data?.deviceId) {
        this.submitDeviceLogin(result.data.deviceId)
      } else {
        this.handleRetry(result?.data?.error)
      }
    })
  }
  
  handleRetry(error) {
    this.currentRetry++
    console.log(`⚠️ Device ID 가져오기 실패 (${this.currentRetry}/${this.maxRetries}):`, error)
    
    if (this.currentRetry < this.maxRetries) {
      setTimeout(() => this.attemptDeviceLogin(), 0) // 즉시 재시도
    } else {
      console.log("❌ Device login 실패 (3회 시도)")
      // 3번 실패 시 에러 메시지 표시
      const errorEl = document.getElementById('auth_error')
      if (errorEl) {
        errorEl.classList.remove('hidden')
      }
    }
  }
  
  async submitDeviceLogin(deviceId) {
    const csrfToken = document.querySelector('[name="csrf-token"]')?.content
    
    try {
      const response = await fetch('/auth/device_login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ device_id: deviceId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log("✅ Device login 성공, feed로 이동")
        // Turbo Visit로 인증된 상태로 feed 다시 방문
        Turbo.visit(data.redirect_url, { action: 'replace' })
      } else {
        this.handleRetry(data.error)
      }
    } catch (error) {
      console.error("❌ Device login 요청 실패:", error)
      this.handleRetry(error.message)
    }
  }
}

