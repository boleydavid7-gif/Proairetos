import Capacitor
import Foundation

/// Protocol-v1 discovery only. Health access is deliberately not requested in Phase 7A.
@objc(AskesisBridgePlugin)
public class AskesisBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AskesisBridgePlugin"
    public let jsName = "AskesisBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise)
    ]

    @objc public func getCapabilities(_ call: CAPPluginCall) {
        call.resolve([
            "protocolVersion": 1,
            "platform": "ios",
            "capabilities": [
                "healthWorkouts": false,
                "heartRate": false,
                "backgroundGps": false,
                "haptics": false,
                "lockScreenControls": false,
                "watchSync": false
            ]
        ])
    }
}
