import Foundation
import Capacitor
import WidgetKit

// ── Capacitor plugin: JS → App Group → WidgetKit reload ──
// Registration: AppDelegate must call CAPBridgeViewController.capacitorDefaultPlugins
// or use the auto-discovery mechanism (add to CAPConfig.plist if needed).

@objc(MinervaWidgetPlugin)
public class MinervaWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MinervaWidgetPlugin"
    public let jsName     = "MinervaWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateData",   returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidget", returnType: CAPPluginReturnPromise),
    ]

    @objc func updateData(_ call: CAPPluginCall) {
        var data = MinervaWidgetData()
        data.totalLeads      = call.getInt("totalLeads")      ?? 0
        data.hotLeads        = call.getInt("hotLeads")        ?? 0
        data.tasksToday      = call.getInt("tasksToday")      ?? 0
        data.leadsAddedToday = call.getInt("leadsAddedToday") ?? 0
        data.nextActionType  = call.getString("nextActionType")   ?? ""
        data.nextActionLead  = call.getString("nextActionLead")   ?? ""
        data.nextActionDetail = call.getString("nextActionDetail") ?? ""
        data.updatedAt       = Date().timeIntervalSince1970

        MinervaSharedStorage.write(data)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["success": true])
    }

    @objc func reloadWidget(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["success": true])
    }
}
