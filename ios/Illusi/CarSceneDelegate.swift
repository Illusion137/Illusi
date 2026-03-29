import CarPlay

/// Manages the CarPlay scene connection/disconnection lifecycle.
/// Bridges the native CPTemplateApplicationScene events into react-native-carplay's JS layer.
/// RNCarPlay is imported via Illusi-Bridging-Header.h (Objective-C).
class CarSceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        RNCarPlay.connect(with: interfaceController, window: templateApplicationScene.carWindow)
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        RNCarPlay.disconnect()
    }
}
