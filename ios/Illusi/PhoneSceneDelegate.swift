import UIKit
import React
import ReactAppDependencyProvider

/// Manages the main phone window in the scene-based lifecycle required by CarPlay.
/// Window creation moves here from AppDelegate so that CarPlay's CPTemplateApplicationScene
/// can coexist with the phone UI scene.
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        guard let delegate = UIApplication.shared.delegate as? AppDelegate,
              let factory = delegate.reactNativeFactory else { return }

        let window = UIWindow(windowScene: windowScene)
        self.window = window

        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )

        window.makeKeyAndVisible()
    }
}
