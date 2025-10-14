//
//  NavigationBarComponent.swift
//  voice_talk_ios
//
//  Navigation bar를 제어하는 Bridge Component
//

import Foundation
import HotwireNative
import UIKit

final class NavigationBarComponent: BridgeComponent {
    override class var name: String { "navigation-bar" }
    
    // MARK: - Message Handling
    
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else {
            return
        }
        
        switch event {
        case .hide:
            handleHide()
        case .show:
            handleShow()
        }
    }
    
    // MARK: - Private Methods
    
    private func handleHide() {
        guard let viewController = delegate?.destination as? UIViewController else { return }
        viewController.navigationController?.setNavigationBarHidden(true, animated: true)
        reply(to: "hide", with: ["success": true])
        print("✅ Navigation bar hidden")
    }
    
    private func handleShow() {
        guard let viewController = delegate?.destination as? UIViewController else { return }
        viewController.navigationController?.setNavigationBarHidden(false, animated: true)
        reply(to: "show", with: ["success": true])
        print("✅ Navigation bar shown")
    }
}

// MARK: - Event Types

private extension NavigationBarComponent {
    enum Event: String {
        case hide
        case show
    }
}

