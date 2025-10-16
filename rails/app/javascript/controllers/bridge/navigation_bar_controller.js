import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

// Navigation bar를 제어하는 Bridge Component
export default class extends BridgeComponent {
  static component = "navigation-bar"
  static values = {
    hidden: { type: Boolean, default: false }
  }

  connect() {
    super.connect()
    
    console.log("🔵🔵🔵 UPDATED NavigationBar Controller v2.0 connected")
    console.log("  - enabled:", this.enabled)
    console.log("  - hiddenValue:", this.hiddenValue)
    
    // enabled 체크 제거 - 무조건 시도
    if (this.hiddenValue) {
      console.log("  - Calling hide()...")
      this.hide()
    } else {
      console.log("  - Not hiding because hiddenValue is false")
    }
  }

  disconnect() {
    // 페이지를 떠날 때 navigation bar 복원
    if (this.enabled && this.hiddenValue) {
      this.show()
    }
    
    super.disconnect()
  }

  async hide() {
    console.log("🔵🔵🔵 hide() called v2.0")
    try {
      console.log("  - Sending 'hide' message to native...")
      const result = await this.send("hide", {})
      console.log("  - Native response:", result)
      console.log("✅ Navigation bar hide request sent")
    } catch (error) {
      console.error("❌ hide() error:", error)
    }
  }

  async show() {
    console.log("🔵🔵🔵 show() called v2.0")
    try {
      await this.send("show", {})
      console.log("✅ Navigation bar shown")
    } catch (error) {
      console.error("❌ show() error:", error)
    }
  }
}

