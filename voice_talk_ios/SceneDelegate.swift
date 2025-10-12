import HotwireNative
import UIKit
import WebKit
import AVFoundation

let rootURL = URL(string: "http://localhost:3000")!

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
        
        self.navigator.rootViewController.setNavigationBarHidden(true, animated: false)
        
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
        webView.uiDelegate = self
        
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

// MARK: - WKUIDelegate (미디어 권한 처리)

extension SceneDelegate: WKUIDelegate {
    // iOS 15+ 미디어 캡처 권한 처리
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        print("📱 Media capture permission requested for: \(origin.protocol)://\(origin.host)")
        
        // 마이크 권한인 경우
        if type == .microphone {
            // iOS 17 버전별 분기 처리 (타입이 다르므로 분리)
            if #available(iOS 17.0, *) {
                // iOS 17+: AVAudioApplication 사용
                let permissionStatus = AVAudioApplication.shared.recordPermission
                print("🎤 Current microphone permission status (iOS 17+): \(permissionStatus.rawValue)")
                
                switch permissionStatus {
                case .granted:
                    print("✅ Microphone permission already granted - auto approving")
                    decisionHandler(.grant)
                    
                case .denied:
                    print("❌ Microphone permission denied by user")
                    decisionHandler(.deny)
                    
                case .undetermined:
                    print("❓ Microphone permission undetermined - requesting...")
                    AVAudioApplication.requestRecordPermission { granted in
                        DispatchQueue.main.async {
                            if granted {
                                print("✅ Microphone permission granted by user")
                                decisionHandler(.grant)
                            } else {
                                print("❌ Microphone permission denied by user")
                                decisionHandler(.deny)
                            }
                        }
                    }
                    
                @unknown default:
                    print("⚠️ Unknown microphone permission status")
                    decisionHandler(.deny)
                }
            } else {
                // iOS 17 미만: AVAudioSession 사용
                let permissionStatus = AVAudioSession.sharedInstance().recordPermission
                print("🎤 Current microphone permission status: \(permissionStatus.rawValue)")
                
                switch permissionStatus {
                case .granted:
                    print("✅ Microphone permission already granted - auto approving")
                    decisionHandler(.grant)
                    
                case .denied:
                    print("❌ Microphone permission denied by user")
                    decisionHandler(.deny)
                    
                case .undetermined:
                    print("❓ Microphone permission undetermined - requesting...")
                    AVAudioSession.sharedInstance().requestRecordPermission { granted in
                        DispatchQueue.main.async {
                            if granted {
                                print("✅ Microphone permission granted by user")
                                decisionHandler(.grant)
                            } else {
                                print("❌ Microphone permission denied by user")
                                decisionHandler(.deny)
                            }
                        }
                    }
                    
                @unknown default:
                    print("⚠️ Unknown microphone permission status")
                    decisionHandler(.deny)
                }
            }
        } else {
            // 기타 미디어 (카메라 등)는 승인
            print("✅ Other media type approved: \(type)")
            decisionHandler(.grant)
        }
    }
}
