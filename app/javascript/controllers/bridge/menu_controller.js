import { BridgeComponent } from "@hotwired/hotwire-native-bridge"

// 액션 시트를 네이티브로 표시하는 Bridge Component
export default class extends BridgeComponent {
  static component = "menu"
  static values = {
    title: String,
    message: String,
    items: Array,
    cancelTitle: { type: String, default: "취소" }
  }

  // 메뉴 표시
  display() {
    if (this.enabled) {
      this.send("display", {
        title: this.titleValue,
        message: this.messageValue,
        items: this.itemsValue,
        cancelTitle: this.cancelTitleValue
      }, (message) => {
        // 네이티브에서 선택된 항목 처리
        this.handleSelection(message.data.selectedIndex)
      })
      
      console.log(`✅ Menu displayed with ${this.itemsValue.length} items`)
    } else {
      // 웹에서는 기본 동작 (필요시 구현)
      console.log("Menu display requested but not in native app")
    }
  }

  // 선택된 항목 처리
  handleSelection(selectedIndex) {
    if (selectedIndex === -1) {
      console.log("✅ Menu cancelled")
      this.onCancel()
      return
    }

    const selectedItem = this.itemsValue[selectedIndex]
    if (selectedItem) {
      console.log(`✅ Menu item selected: ${selectedItem.title}`)
      this.onSelect(selectedItem)
    }
  }

  // 항목 선택 시 실행 (오버라이드 가능)
  onSelect(item) {
    // 선택된 항목에 대한 액션 실행
    if (item.action) {
      // 지정된 URL로 이동 또는 이벤트 발생
      if (item.url) {
        Turbo.visit(item.url, { action: item.method || "advance" })
      } else if (item.event) {
        const event = new CustomEvent(item.event, { 
          bubbles: true,
          detail: item
        })
        this.element.dispatchEvent(event)
      }
    }
  }

  // 취소 시 실행 (오버라이드 가능)
  onCancel() {
    // 취소 시 특별한 동작이 필요하면 여기에 구현
  }
}

