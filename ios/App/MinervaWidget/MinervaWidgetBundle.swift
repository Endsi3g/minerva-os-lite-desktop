import WidgetKit
import SwiftUI

// ── Entry point — @main for the widget extension target ──
@main
struct MinervaWidgetBundle: WidgetBundle {
    var body: some Widget {
        MinervaWidget()
    }
}

struct MinervaWidget: Widget {
    let kind: String = "MinervaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MinervaWidgetProvider()) { entry in
            MinervaWidgetEntryView(entry: entry)
                .containerBackground(.white, for: .widget)
        }
        .configurationDisplayName("Minerva OS")
        .description("Leads actifs, actions prioritaires et tâches du jour.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct MinervaWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: MinervaEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(data: entry.data)
        case .systemLarge:
            LargeWidgetView(data: entry.data)
        default:
            MediumWidgetView(data: entry.data)
        }
    }
}
