//
//  FormComponent.swift
//  voice_talk_ios
//
//  폼 제출을 네이티브 버튼으로 처리하는 Bridge Component
//

import Foundation
import HotwireNative
import UIKit

final class FormComponent: BridgeComponent {
    override class var name: String { "form" }
    
    private var submitButton: UIBarButtonItem?
    
    // MARK: - Message Handling
    
    override func onReceive(message: Message) {
        guard let event = Event(rawValue: message.event) else {
            return
        }
        
        switch event {
        case .connect:
            handleConnect(message: message)
        case .submitEnabled:
            handleSubmitEnabled(message: message)
        case .submitDisabled:
            handleSubmitDisabled()
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
        
        // 제출 버튼 생성 (공식 문서 권장: UIAction 사용)
        let action = UIAction { [weak self] _ in
            self?.reply(to: "connect")
            // 버튼 비활성화 (중복 제출 방지)
            self?.submitButton?.isEnabled = false
            print("✅ Form submitted")
        }
        
        let button = UIBarButtonItem(
            title: data.submitTitle,
            primaryAction: action
        )
        button.style = .done
        button.isEnabled = data.enabled ?? true
        submitButton = button
        
        // 네비게이션 바에 추가
        viewController.navigationItem.rightBarButtonItem = button
        
        print("✅ Form submit button '\(data.submitTitle)' added")
    }
    
    private func handleSubmitEnabled(message: Message) {
        submitButton?.isEnabled = true
        print("✅ Form submit button enabled")
    }
    
    private func handleSubmitDisabled() {
        submitButton?.isEnabled = false
        print("✅ Form submit button disabled")
    }
    
    private func handleDisconnect() {
        guard let viewController = viewController else { return }
        
        // 버튼 제거
        viewController.navigationItem.rightBarButtonItem = nil
        submitButton = nil
        
        print("✅ Form submit button removed")
    }
}

// MARK: - Message Data

private extension FormComponent {
    struct MessageData: Decodable {
        let submitTitle: String
        let enabled: Bool?
    }
    
    enum Event: String {
        case connect
        case submitEnabled
        case submitDisabled
        case disconnect
    }
}

