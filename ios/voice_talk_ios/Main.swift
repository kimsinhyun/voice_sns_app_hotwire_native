import Foundation

struct Main {
    static let remote = URL(string: "https://hotwire-native-demo.dev")!
    static let local = URL(string: "http://192.168.45.20:3000")!

    /// Update this to choose which demo is run
    static var current: URL {
        local
    }
}
