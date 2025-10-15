//
//  DeviceAuthComponent.swift
//  voice_talk_ios
//
//  Created for IDFV-based device authentication
//

import HotwireNative
import UIKit

final class DeviceAuthComponent: BridgeComponent {
    override class var name: String { "device-auth" }
    
    override func onReceive(message: Message) {
        switch message.event {
        case "getDeviceId":
            handleGetDeviceId(message: message)
        default:
            break
        }
    }
    
    private func handleGetDeviceId(message: Message) {
        // IDFV 가져오기
        if let idfv = UIDevice.current.identifierForVendor?.uuidString {
            print("✅ IDFV obtained: \(idfv)")
            reply(to: message.event, with: ["deviceId": idfv])
        } else {
            print("❌ IDFV not available")
            reply(to: message.event, with: ["error": "IDFV not available"])
        }
    }
}

