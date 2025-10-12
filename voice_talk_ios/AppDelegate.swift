//
//  AppDelegate.swift
//  voice_talk_ios
//
//  Created by kimsinhyun on 10/10/25.
//

import UIKit
import HotwireNative

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Path Configuration 로드
        configurePathConfiguration()
        
        // Bridge Components 등록
        configureBridgeComponents()
        
        // Debug 로깅 활성화 (개발 중)
        Hotwire.config.debugLoggingEnabled = true
        
        return true
    }
    
    private func configurePathConfiguration() {
        guard let pathConfigURL = Bundle.main.url(forResource: "path-configuration", withExtension: "json") else {
            print("⚠️ path-configuration.json not found")
            return
        }
        
        Hotwire.loadPathConfiguration(from: [
            .file(pathConfigURL)
        ])
        
        print("✅ Path configuration loaded")
    }
    
    private func configureBridgeComponents() {
        Hotwire.registerBridgeComponents([
            ButtonComponent.self,
            FormComponent.self,
            MenuComponent.self,
            AudioRecorderComponent.self
        ])
        
        print("✅ Bridge components registered (including AudioRecorder)")
    }

    // MARK: UISceneSession Lifecycle

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user discards a scene session.
        // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
        // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
    }


}

