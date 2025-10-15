//
//  AppDelegate.swift
//  voice_talk_ios
//
//  Created by kimsinhyun on 10/10/25.
//

import HotwireNative
import UIKit
import AVFoundation

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        configureAppearance()
        configureHotwire()

        return true
    }

    // MARK: Audio Session Configuration
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            // 오디오 재생과 녹음을 모두 지원하는 카테고리
            // mixWithOthers: 다른 앱의 오디오와 믹싱 허용
            // allowBluetooth: 블루투스 오디오 지원
            try audioSession.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .mixWithOthers, .allowBluetooth]
            )
            try audioSession.setActive(true)
            print("✅ Audio session configured successfully")
        } catch {
            print("❌ Failed to configure audio session: \(error)")
        }
    }

    // MARK: UISceneSession Lifecycle
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    // Make navigation and tab bars opaque.
    private func configureAppearance() {
        UINavigationBar.appearance().scrollEdgeAppearance = .init()
        UITabBar.appearance().scrollEdgeAppearance = .init()
    }



    private func configureHotwire() {
        // Load the path configuration
        Hotwire.loadPathConfiguration(from: [
            .file(Bundle.main.url(forResource: "path-configuration", withExtension: "json")!)
        ])

        // Set an optional custom user agent application prefix.
        Hotwire.config.applicationUserAgentPrefix = "VoiceTalk Turbo Native;"

        // Register bridge components
        Hotwire.registerBridgeComponents([
            FormComponent.self,
            MenuComponent.self,
            AudioRecorderComponent.self,
            NavigationBarComponent.self,
        ])

        // Set configuration options
        Hotwire.config.backButtonDisplayMode = .minimal
        Hotwire.config.showDoneButtonOnModals = true
        #if DEBUG
        Hotwire.config.debugLoggingEnabled = true
        #endif
    }
}
