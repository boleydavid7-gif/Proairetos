package com.proairetos.askesisbridge;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AskesisBridge")
public class AskesisBridgePlugin extends Plugin {
    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject capabilities = new JSObject();
        capabilities.put("healthWorkouts", false);
        capabilities.put("heartRate", false);
        capabilities.put("backgroundGps", false);
        capabilities.put("haptics", false);
        capabilities.put("lockScreenControls", false);
        capabilities.put("watchSync", false);

        JSObject result = new JSObject();
        result.put("protocolVersion", 1);
        result.put("platform", "android");
        result.put("capabilities", capabilities);
        call.resolve(result);
    }
}
