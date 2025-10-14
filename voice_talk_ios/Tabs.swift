import Foundation
import UIKit
import HotwireNative

extension HotwireTab {
    static let all: [HotwireTab] = {
        var tabs: [HotwireTab] = [
            .navigation,
            .bridgeComponents,
            .resources
        ]

        if Main.current == Main.local {
            tabs.append(.bugsAndFixes)
        }

        return tabs
    }()

    static let navigation = HotwireTab(
        title: "Navigation",
        image: .init(systemName: "arrow.left.arrow.right")!,
        url: Main.current
    )

    static let bridgeComponents = HotwireTab(
        title: "Bridge Components",
        image: {
            if #available(iOS 17.4, *) {
                return UIImage(systemName: "widget.small")!
            } else {
                return UIImage(systemName: "square.grid.2x2")!
            }
        }(),
        url: Main.current.appendingPathComponent("components")
    )

    static let resources = HotwireTab(
        title: "Resources",
        image: {
            if #available(iOS 17.4, *) {
                return UIImage(systemName: "questionmark.text.page")!
            } else {
                return UIImage(systemName: "book.closed")!
            }
        }(),
        url: Main.current.appendingPathComponent("resources")
    )

    static let bugsAndFixes = HotwireTab(
        title: "Bugs & Fixes",
        image: .init(systemName: "ladybug")!,
        url: Main.current.appendingPathComponent("bugs")
    )
}
