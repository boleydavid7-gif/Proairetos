import Capacitor
import Foundation

@objc(AskesisBridgePlugin)
public class AskesisBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AskesisBridgePlugin"
    public let jsName = "AskesisBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise)
    ]

    @objc func getCapabilities(_ call: CAPPluginCall) {
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
