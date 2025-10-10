import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

// 네비게이션 바에 네이티브 버튼을 표시하는 Bridge Component
export default class extends BridgeComponent {
  static component = "button"
  static values = {
    title: String,
    style: { type: String, default: "plain" }, // plain, done
    position: { type: String, default: "right" } // left, right
  }

  connect() {
    super.connect()
    
    // 네이티브 앱에만 버튼 표시 요청
    if (this.enabled) {
      this.send("connect", {
        title: this.titleValue,
        style: this.styleValue,
        position: this.positionValue
      }, () => {
        // 네이티브 버튼이 클릭되었을 때 실행
        this.performAction()
      })
      
      console.log(`✅ Button bridge connected: ${this.titleValue}`)
    }
  }

  disconnect() {
    if (this.enabled) {
      this.send("disconnect", {}, () => {})
      console.log(`✅ Button bridge disconnected: ${this.titleValue}`)
    }
    
    super.disconnect()
  }

  performAction() {
    // 버튼이 클릭되었을 때 실행할 액션
    // 이 메서드는 상속받는 컨트롤러에서 오버라이드하거나
    // data-action으로 지정된 메서드를 실행
    if (this.element.dataset.bridgeButtonAction) {
      const action = this.element.dataset.bridgeButtonAction
      const event = new CustomEvent(action, { bubbles: true })
      this.element.dispatchEvent(event)
      console.log(`✅ Button action dispatched: ${action}`)
    }
  }
}

