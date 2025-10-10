//
//  ButtonComponent.swift
//  voice_talk_ios
//
//  네비게이션 바에 네이티브 버튼을 표시하는 Bridge Component
//

import Foundation
import HotwireNative
import UIKit

final class ButtonComponent: BridgeComponent {
    override class var name: String { "button" }
    
    private var barButtonItem: UIBarButtonItem?
    
    // MARK: - Message Handling
    
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else {
            return
        }
        
        switch event {
        case .connect:
            handleConnect(message: message)
        case .disconnect:
            handleDisconnect()
        }
    }
    
    // MARK: - Private Methods
    
    private var viewController: UIViewController? {
        delegate?.destination as? UIViewController
    }
    
    private func handleConnect(message: Message) {
        guard let data: MessageData = message.data(),
              let viewController = viewController else { return }
        
        // 버튼 생성 (공식 문서 권장: UIAction 사용)
        let action = UIAction { [weak self] _ in
            self?.reply(to: "connect")
        }
        
        let button = UIBarButtonItem(
            title: data.title,
            primaryAction: action
        )
        
        // 스타일 적용
        if data.style == "done" {
            button.style = .done
        } else {
            button.style = .plain
        }
        
        barButtonItem = button
        
        // 네비게이션 바에 추가
        if data.position == "left" {
            viewController.navigationItem.leftBarButtonItem = button
        } else {
            viewController.navigationItem.rightBarButtonItem = button
        }
        
        print("✅ Button '\(data.title)' added to navigation bar")
    }
    
    private func handleDisconnect() {
        guard let viewController = viewController else { return }
        
        // 버튼 제거
        viewController.navigationItem.rightBarButtonItem = nil
        viewController.navigationItem.leftBarButtonItem = nil
        barButtonItem = nil
        
        print("✅ Button removed from navigation bar")
    }
    
}

// MARK: - Message Data

private extension ButtonComponent {
    struct MessageData: Decodable {
        let title: String
        let style: String?
        let position: String?
    }
    
    enum Event: String {
        case connect
        case disconnect
    }
}

