import HotwireNative
import UIKit
import WebKit
import AVFoundation

//let rootURL = URL(string: "http://localhost:3000")!

final class SceneController: UIResponder {
    var window: UIWindow?
    
    private let rootURL = Main.current
    
    private lazy var tabBarController = HotwireTabBarController(navigatorDelegate: self)
}

extension SceneController: UIWindowSceneDelegate {
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = tabBarController
        window?.makeKeyAndVisible()
        
        tabBarController.load(HotwireTab.all)
    }
}

extension SceneController: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        // Turbo Native는 기본적으로 pull-to-refresh를 지원합니다.
        // 사용자가 pull-to-refresh를 하면 현재 페이지를 자동으로 재방문(reload)합니다.
        
        // 특정 화면의 경우 커스텀 viewController 사용
        let navigationController = navigator.rootViewController
        let hidden = (proposal.properties["navigation_bar_hidden"] as? Bool) ?? false
        navigationController.setNavigationBarHidden(hidden, animated: true)
        
        // 기존 스위치 분기 유지, 참고용.
        switch proposal.viewController {
        case NumbersViewController.pathConfigurationIdentifier:
            return .acceptCustom(NumbersViewController(
                url: proposal.url,
                navigator: navigator
                )
            )

        default:
            return .accept
        }
    }
}

