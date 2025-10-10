//
//  SceneDelegate.swift
//  voice_talk_ios
//
//  Created by kimsinhyun on 10/10/25.
//
import HotwireNative
import UIKit

let rootURL = URL(string: "http://localhost:3000")!

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private lazy var navigator: Navigator = {
        let config = Navigator.Configuration(
            name: "main",
            startLocation: rootURL
        )
        return Navigator(configuration: config, delegate: self)
    }()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // Window 초기화
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigator.rootViewController
        window?.makeKeyAndVisible()
        
        // 네비게이션 바 숨기기 (content_for :title 사용 안 함)
        // 참고: https://discuss.hotwired.dev/t/how-do-you-handle-safearea-and-title-in-hotwirenative-app/6173
        navigator.rootViewController.setNavigationBarHidden(true, animated: false)
        
        // Navigator 시작 (공식 문서 권장)
        navigator.start()
    }
}

// MARK: - NavigatorDelegate
extension SceneDelegate: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        // 기본적으로 모든 방문 승인
        // 나중에 네이티브 스크린을 추가할 때 여기서 처리
        return .accept
    }
}
