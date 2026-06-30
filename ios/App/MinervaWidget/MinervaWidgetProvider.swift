import WidgetKit
import SwiftUI

struct MinervaEntry: TimelineEntry {
    let date: Date
    let data: MinervaWidgetData
}

struct MinervaWidgetProvider: TimelineProvider {
    // Placeholder for widget gallery preview
    func placeholder(in context: Context) -> MinervaEntry {
        MinervaEntry(date: Date(), data: MinervaWidgetData(
            totalLeads: 47,
            hotLeads: 12,
            tasksToday: 3,
            leadsAddedToday: 2,
            nextActionType: "call",
            nextActionLead: "Tremblay & Fils",
            nextActionDetail: "Rappeler pour la proposition",
            updatedAt: Date().timeIntervalSince1970
        ))
    }

    // Snapshot for widget preview (quick)
    func getSnapshot(in context: Context, completion: @escaping (MinervaEntry) -> Void) {
        let data = context.isPreview
            ? placeholder(in: context).data
            : MinervaSharedStorage.read()
        completion(MinervaEntry(date: Date(), data: data))
    }

    // Full timeline — refresh every 15 minutes
    func getTimeline(in context: Context, completion: @escaping (Timeline<MinervaEntry>) -> Void) {
        let data  = MinervaSharedStorage.read()
        let entry = MinervaEntry(date: Date(), data: data)
        let next  = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(next))
        completion(timeline)
    }
}
