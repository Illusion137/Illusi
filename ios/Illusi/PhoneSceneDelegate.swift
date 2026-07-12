import React
import ReactAppDependencyProvider
import UIKit

/// Manages the main phone window in the scene-based lifecycle required by CarPlay.
/// Window creation moves here from AppDelegate so that CarPlay's CPTemplateApplicationScene
/// can coexist with the phone UI scene.
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    /// Keeps the app alive briefly after backgrounding so an in-progress OTA
    /// download (git clone/pull, driven from JS via `check_and_apply_update`)
    /// can finish instead of being frozen mid-transfer and left as a partial
    /// clone. The README places this on `AppDelegate.applicationDidEnterBackground`,
    /// but this app is scene-based (CarPlay), so that AppDelegate callback never
    /// fires — the scene lifecycle routes here instead. `beginBackgroundTask` is
    /// still an application-wide API, so we request it from the shared app.
    private var otaBackgroundTask: UIBackgroundTaskIdentifier = .invalid

    private func endOTABackgroundTask() {
        guard otaBackgroundTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(otaBackgroundTask)
        otaBackgroundTask = .invalid
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        endOTABackgroundTask()
        otaBackgroundTask = UIApplication.shared.beginBackgroundTask(withName: "OTAUpdate") { [weak self] in
            // Expiration handler — iOS is out of patience; release the task.
            self?.endOTABackgroundTask()
        }
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        endOTABackgroundTask()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let context = URLContexts.first else { return }

        let options: [UIApplication.OpenURLOptionsKey: Any] = [
            .sourceApplication: context.options.sourceApplication as Any,
            .annotation: context.options.annotation as Any,
        ]

        RCTLinkingManager.application(
            UIApplication.shared,
            open: context.url,
            options: options
        )
    }

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        guard let delegate = UIApplication.shared.delegate as? AppDelegate,
            let factory = delegate.reactNativeFactory
        else { return }

        let window = UIWindow(windowScene: windowScene)
        self.window = window

        factory.startReactNative(
            withModuleName: "main",
            in: window,
            launchOptions: nil
        )

        window.makeKeyAndVisible()

        if let urlContext = connectionOptions.urlContexts.first {
            let options: [UIApplication.OpenURLOptionsKey: Any] = [
                .sourceApplication: urlContext.options.sourceApplication as Any,
                .annotation: urlContext.options.annotation as Any,
            ]

            RCTLinkingManager.application(
                UIApplication.shared,
                open: urlContext.url,
                options: options
            )
        }
    }
}
