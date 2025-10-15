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
            handleHide(message: message)
        case .show:
            handleShow(message: message)
        }
    }
    
    // MARK: - Private Methods
    
    private func handleHide(message: Message) {
        guard let viewController = delegate?.destination as? UIViewController else { return }
        viewController.navigationController?.setNavigationBarHidden(true, animated: true)
        reply(to: "hide")
        print("✅ Navigation bar hidden")
    }
    
    private func handleShow(message: Message) {
        guard let viewController = delegate?.destination as? UIViewController else { return }
        viewController.navigationController?.setNavigationBarHidden(false, animated: true)
        reply(to: "show")
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

