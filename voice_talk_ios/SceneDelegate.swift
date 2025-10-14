import HotwireNative
import UIKit
import WebKit
import AVFoundation

//let rootURL = URL(string: "http://localhost:3000")!
let rootURL = URL(string: "http://192.168.1.69:3000")!


class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private lazy var navigator: Navigator = {
        let config = Navigator.Configuration(
            name: "main",
            startLocation: rootURL
        )
        return Navigator(configuration: config)
    }()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        window?.rootViewController = navigator.rootViewController
        
        // self.navigator.rootViewController.setNavigationBarHidden(true, animated: false)
        
        // WKWebView 설정을 여기서 수행 (뷰가 로드된 후)
        DispatchQueue.main.async {
            self.configureWebView()
        }
        
        performDeviceLogin()
        
        navigator.start()
    }
    
    // MARK: - WebView Configuration
    
    private func configureWebView() {
        // Navigator의 session에서 WKWebView 접근
        let webView = navigator.session.webView
        webView.configuration.allowsInlineMediaPlayback = true
        webView.configuration.mediaTypesRequiringUserActionForPlayback = []
        webView.allowsLinkPreview = false  // Link Preview 비활성화 (네이티브 앱 느낌 강화)
        
        print("✅ WKWebView configured")
    }
    
    // MARK: - Device Login
    
    private func performDeviceLogin() {
        guard let deviceId = UIDevice.current.identifierForVendor?.uuidString else {
            print("⚠️ IDFV를 가져올 수 없습니다")
            return
        }
        
        print("📱 Device ID: \(deviceId)")
        
        // Device login API 호출
        let loginURL = rootURL.appendingPathComponent("auth/device_login")
        var request = URLRequest(url: loginURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = ["device_id": deviceId]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("❌ Device login 실패: \(error.localizedDescription)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                print("✅ Device login 응답: \(httpResponse.statusCode)")
            }
        }.resume()
    }
}
