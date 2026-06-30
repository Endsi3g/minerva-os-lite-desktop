import Foundation
import WidgetKit

// ── Shared data model written by Capacitor app, read by widget ──
// App Group ID must be registered in both targets in Xcode: group.com.minerva.reachlite

struct MinervaWidgetData: Codable {
    var totalLeads: Int = 0
    var hotLeads: Int = 0
    var tasksToday: Int = 0
    var leadsAddedToday: Int = 0
    var nextActionType: String = ""      // "call" | "email" | "visit" | "task"
    var nextActionLead: String = ""      // business name
    var nextActionDetail: String = ""    // brief reasoning
    var updatedAt: TimeInterval = Date().timeIntervalSince1970
}

enum MinervaSharedStorage {
    static let appGroupId = "group.com.minerva.reachlite"
    static let dataKey    = "minerva_widget_data"

    static func read() -> MinervaWidgetData {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let raw      = defaults.data(forKey: dataKey),
            let decoded  = try? JSONDecoder().decode(MinervaWidgetData.self, from: raw)
        else { return MinervaWidgetData() }
        return decoded
    }

    static func write(_ data: MinervaWidgetData) {
        guard
            let defaults = UserDefaults(suiteName: appGroupId),
            let encoded  = try? JSONEncoder().encode(data)
        else { return }
        defaults.set(encoded, forKey: dataKey)
    }

    static func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
