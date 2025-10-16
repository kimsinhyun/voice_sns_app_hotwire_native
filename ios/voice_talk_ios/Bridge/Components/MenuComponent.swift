//
//  MenuComponent.swift
//  voice_talk_ios
//
//  액션 시트를 네이티브로 표시하는 Bridge Component
//

import Foundation
import HotwireNative
import UIKit

final class MenuComponent: BridgeComponent {
    override class var name: String { "menu" }
    
    // MARK: - Message Handling
    
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else {
            return
        }
        
        switch event {
        case .display:
            handleDisplay(message: message)
        }
    }
    
    // MARK: - Private Methods
    
    private func handleDisplay(message: Message) {
        guard let data: MessageData = message.data() else { return }
        
        let alertController = UIAlertController(
            title: data.title,
            message: data.message,
            preferredStyle: .actionSheet
        )
        
        // 메뉴 항목 추가
        for item in data.items {
            let action = UIAlertAction(
                title: item.title,
                style: item.style == "destructive" ? .destructive : .default
            ) { [weak self] _ in
                // Rails에 선택된 항목 전송
                self?.reply(to: "display", with: ["selectedIndex": item.index])
                print("✅ Menu item selected: \(item.title)")
            }
            alertController.addAction(action)
        }
        
        // 취소 버튼 추가
        let cancelAction = UIAlertAction(title: data.cancelTitle ?? "취소", style: .cancel) { [weak self] _ in
            self?.reply(to: "display", with: ["selectedIndex": -1])
            print("✅ Menu cancelled")
        }
        alertController.addAction(cancelAction)
        
        // 액션 시트 표시
        if let viewController = delegate?.destination as? UIViewController {
            // iPad에서 액션 시트는 popover로 표시되어야 함
            if let popoverController = alertController.popoverPresentationController {
                popoverController.sourceView = viewController.view
                popoverController.sourceRect = CGRect(
                    x: viewController.view.bounds.midX,
                    y: viewController.view.bounds.midY,
                    width: 0,
                    height: 0
                )
                popoverController.permittedArrowDirections = []
            }
            
            viewController.present(alertController, animated: true)
            print("✅ Menu displayed with \(data.items.count) items")
        }
    }
}

// MARK: - Message Data

private extension MenuComponent {
    struct MessageData: Decodable {
        let title: String?
        let message: String?
        let items: [MenuItem]
        let cancelTitle: String?
    }
    
    struct MenuItem: Decodable {
        let index: Int
        let title: String
        let style: String?
    }
    
    enum Event: String {
        case display
    }
}

