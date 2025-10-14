import Foundation
import UIKit
import HotwireNative

extension HotwireTab {
    static let all: [HotwireTab] = [
        .feed,
        .messages,
        .settings
    ]

    static let feed = HotwireTab(
        title: "",
        image: UIImage(systemName: "house.fill")!,
        url: Main.current.appendingPathComponent("feed")
    )

    static let messages = HotwireTab(
        title: "",
        image: UIImage(systemName: "message.fill")!,
        url: Main.current.appendingPathComponent("messages")
    )

    static let settings = HotwireTab(
        title: "",
        image: UIImage(systemName: "gearshape.fill")!,
        url: Main.current.appendingPathComponent("settings")
    )
}
