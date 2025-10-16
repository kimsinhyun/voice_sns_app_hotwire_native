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
      setTimeout(() => this.attemptDeviceLogin(), 1000)
    } else {
      console.log("❌ Device login 실패, Devise가 처리합니다")
    }
  }
  
  submitDeviceLogin(deviceId) {
    const csrfToken = document.querySelector('[name="csrf-token"]')?.content
    
    fetch('/auth/device_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ device_id: deviceId }),
      redirect: 'follow'
    }).then(response => {
      if (response.redirected) {
        window.location.href = response.url
      }
    }).catch(error => {
      console.error("❌ Device login 요청 실패:", error)
    })
  }
}

