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
        // 특정 화면의 경우 커스텀 viewController 사용
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

