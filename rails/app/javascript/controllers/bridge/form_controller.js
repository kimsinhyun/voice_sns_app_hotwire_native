import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

// 폼 제출을 네이티브 버튼으로 처리하는 Bridge Component
export default class extends BridgeComponent {
  static component = "form"
  static targets = ["submit"]
  static values = {
    submitTitle: { type: String, default: "완료" }
  }

  connect() {
    super.connect()
    
    // 네이티브 앱에서만 제출 버튼을 네비게이션 바에 표시
    if (this.enabled) {
      this.send("connect", {
        submitTitle: this.submitTitleValue,
        enabled: this.isFormValid()
      }, () => {
        // 네이티브 제출 버튼이 클릭되었을 때 폼 제출
        this.submitForm()
      })
      
      // 원래 제출 버튼 숨기기 (네이티브 앱에서만)
      this.hideSubmitButton()
      
      console.log(`✅ Form bridge connected with submit: ${this.submitTitleValue}`)
    }
  }

  disconnect() {
    if (this.enabled) {
      this.send("disconnect", {}, () => {})
      console.log(`✅ Form bridge disconnected`)
    }
    
    super.disconnect()
  }

  // 폼 유효성 검사 (필요시 오버라이드)
  isFormValid() {
    if (!this.element.checkValidity) return true
    return this.element.checkValidity()
  }

  // 제출 버튼 활성화
  enableSubmit() {
    if (this.enabled) {
      this.send("submitEnabled", {}, () => {})
      console.log(`✅ Submit button enabled`)
    }
  }

  // 제출 버튼 비활성화
  disableSubmit() {
    if (this.enabled) {
      this.send("submitDisabled", {}, () => {})
      console.log(`✅ Submit button disabled`)
    }
  }

  // 폼 제출
  submitForm() {
    if (this.element.requestSubmit) {
      this.element.requestSubmit()
    } else {
      this.element.submit()
    }
    console.log(`✅ Form submitted`)
  }

  // 네이티브 앱에서 원래 제출 버튼 숨기기
  hideSubmitButton() {
    if (this.hasSubmitTarget) {
      this.submitTarget.style.display = "none"
    }
  }

  // 입력 필드 변경 시 제출 버튼 상태 업데이트
  handleInput() {
    if (this.enabled) {
      if (this.isFormValid()) {
        this.enableSubmit()
      } else {
        this.disableSubmit()
      }
    }
  }
}

