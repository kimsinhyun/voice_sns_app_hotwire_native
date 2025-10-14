//
//  AppDelegate.swift
//  voice_talk_ios
//
//  Created by kimsinhyun on 10/10/25.
//

import HotwireNative
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAppearance()
        configureHotwire()
        
        return true
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
        ])

        // Set configuration options
        Hotwire.config.backButtonDisplayMode = .minimal
        Hotwire.config.showDoneButtonOnModals = true
#if DEBUG
        Hotwire.config.debugLoggingEnabled = true
#endif
    }
}

