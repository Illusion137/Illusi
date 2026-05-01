public import Expo
import React
import ReactAppDependencyProvider
import react_native_ota_hot_update

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  // NOTE: window is now owned by PhoneSceneDelegate to support the scene-based
  // lifecycle required by CarPlay. AppDelegate exposes the factory so that
  // PhoneSceneDelegate can call startReactNative from the scene connection callback.
  var window: UIWindow?

  public var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  public var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Window creation has moved to PhoneSceneDelegate to support the
    // UIApplicationSceneManifest required for CarPlay scenes.
    // On iOS 12 and below (no scene support) fall back to the original behaviour.
    if #unavailable(iOS 13) {
      #if os(iOS) || os(tvOS)
        window = UIWindow(frame: UIScreen.main.bounds)
        factory.startReactNative(
          withModuleName: "main",
          in: window,
          launchOptions: launchOptions)
      #endif
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
      || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if RNSSSiriShortcuts.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler)
    {
      return true
    }
    let result = RCTLinkingManager.application(
      application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(
      application, continue: userActivity, restorationHandler: restorationHandler) || result
    // return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      return RCTBundleURLProvider.sharedSettings().jsBundleURL(
        forBundleRoot: ".expo/.virtual-metro-entry")
    #else
      return OtaHotUpdate.getBundle()
    #endif
  }
}
