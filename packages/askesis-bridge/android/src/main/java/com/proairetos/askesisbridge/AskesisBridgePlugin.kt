package com.proairetos.askesisbridge

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Protocol-v1 discovery only. Health access is deliberately not requested in Phase 7A.
 */
@CapacitorPlugin(name = "AskesisBridge")
class AskesisBridgePlugin : Plugin() {
    @PluginMethod
    fun getCapabilities(call: PluginCall) {
        val capabilities = JSObject().apply {
            put("healthWorkouts", false)
            put("heartRate", false)
            put("backgroundGps", false)
            put("haptics", false)
            put("lockScreenControls", false)
            put("watchSync", false)
        }

        val result = JSObject().apply {
            put("protocolVersion", 1)
            put("platform", "android")
            put("capabilities", capabilities)
        }

        call.resolve(result)
    }
}
