import SwiftUI
import WidgetKit

// ── Brand tokens ──
private let brandGreen  = Color(red: 0.02, green: 0.59, blue: 0.41)   // #059669
private let brandDark   = Color(red: 0.15, green: 0.15, blue: 0.12)   // #26251e
private let brandMuted  = Color(red: 0.48, green: 0.48, blue: 0.46)   // #7a7a76
private let brandBg     = Color(red: 0.96, green: 0.96, blue: 0.94)   // #f4f4f3

// ── Action icon helper ──
private func actionIcon(_ type: String) -> String {
    switch type {
    case "call":   return "phone.fill"
    case "email":  return "envelope.fill"
    case "visit":  return "mappin.circle.fill"
    default:       return "bolt.fill"
    }
}

// ── Small widget (2×2) ──
struct SmallWidgetView: View {
    let data: MinervaWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 4) {
                Image(systemName: "sparkles")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(brandGreen)
                Text("MINERVA")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(brandDark)
                    .kerning(0.8)
                Spacer()
            }
            .padding(.bottom, 8)

            // Main stat
            Text("\(data.totalLeads)")
                .font(.system(size: 34, weight: .black, design: .rounded))
                .foregroundColor(brandDark)
                .lineLimit(1)
            Text("leads actifs")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(brandMuted)

            Spacer()

            // Hot leads
            HStack(spacing: 4) {
                Circle()
                    .fill(brandGreen)
                    .frame(width: 6, height: 6)
                Text("\(data.hotLeads) chauds")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(brandGreen)
            }
            .padding(.vertical, 4)

            // Next action pill
            if !data.nextActionLead.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: actionIcon(data.nextActionType))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                    Text(data.nextActionLead)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(brandGreen)
                .cornerRadius(20)
            } else {
                Text("\(data.tasksToday) tâches")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(brandMuted)
            }
        }
        .padding(14)
        .background(Color.white)
    }
}

// ── Medium widget (4×2) ──
struct MediumWidgetView: View {
    let data: MinervaWidgetData

    private var dateStr: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "fr_CA")
        f.dateFormat = "EEE d MMM"
        return f.string(from: Date()).capitalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header row
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(brandGreen)
                    Text("Minerva OS")
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(brandDark)
                        .kerning(0.4)
                }
                Spacer()
                Text(dateStr)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(brandMuted)
            }
            .padding(.bottom, 10)

            // Stats row
            HStack(spacing: 0) {
                StatCell(value: "\(data.totalLeads)", label: "Leads")
                Divider().frame(height: 28).opacity(0.3)
                StatCell(value: "\(data.hotLeads)", label: "Chauds", accent: true)
                Divider().frame(height: 28).opacity(0.3)
                StatCell(value: "\(data.tasksToday)", label: "Tâches")
                if data.leadsAddedToday > 0 {
                    Divider().frame(height: 28).opacity(0.3)
                    StatCell(value: "+\(data.leadsAddedToday)", label: "Nouveau", accent: true)
                }
            }
            .padding(.bottom, 10)

            Divider().opacity(0.15)

            // Next action
            if !data.nextActionLead.isEmpty {
                HStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(brandGreen.opacity(0.12))
                            .frame(width: 28, height: 28)
                        Image(systemName: actionIcon(data.nextActionType))
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(brandGreen)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(data.nextActionLead)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(brandDark)
                            .lineLimit(1)
                        if !data.nextActionDetail.isEmpty {
                            Text(data.nextActionDetail)
                                .font(.system(size: 10, weight: .regular))
                                .foregroundColor(brandMuted)
                                .lineLimit(1)
                        }
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(brandMuted)
                }
                .padding(.top, 8)
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 13))
                        .foregroundColor(brandGreen)
                    Text("Tout est à jour ✓")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(brandMuted)
                }
                .padding(.top, 8)
            }
        }
        .padding(14)
        .background(Color.white)
    }
}

// ── Large widget (4×4) ──
struct LargeWidgetView: View {
    let data: MinervaWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(brandGreen)
                    Text("Minerva OS Reach")
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(brandDark)
                }
                Spacer()
            }

            // Big stats
            HStack(spacing: 12) {
                BigStatCard(value: "\(data.totalLeads)", label: "Leads actifs", icon: "person.2.fill")
                BigStatCard(value: "\(data.hotLeads)", label: "Leads chauds", icon: "flame.fill", accent: true)
            }
            HStack(spacing: 12) {
                BigStatCard(value: "\(data.tasksToday)", label: "Tâches auj.", icon: "checkmark.circle.fill")
                BigStatCard(value: "+\(data.leadsAddedToday)", label: "Nouveaux auj.", icon: "plus.circle.fill", accent: true)
            }

            Divider().opacity(0.15)

            // Next action section
            VStack(alignment: .leading, spacing: 6) {
                Text("PROCHAINE ACTION")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(brandMuted)
                    .kerning(0.8)

                if !data.nextActionLead.isEmpty {
                    HStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(brandGreen)
                                .frame(width: 36, height: 36)
                            Image(systemName: actionIcon(data.nextActionType))
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(data.nextActionLead)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(brandDark)
                            if !data.nextActionDetail.isEmpty {
                                Text(data.nextActionDetail)
                                    .font(.system(size: 11))
                                    .foregroundColor(brandMuted)
                                    .lineLimit(2)
                            }
                        }
                        Spacer()
                    }
                    .padding(10)
                    .background(brandBg)
                    .cornerRadius(10)
                } else {
                    Text("Aucune action prioritaire — bonne journée ! ✓")
                        .font(.system(size: 12))
                        .foregroundColor(brandMuted)
                }
            }
        }
        .padding(16)
        .background(Color.white)
    }
}

// ── Reusable sub-views ──
private struct StatCell: View {
    let value: String
    let label: String
    var accent: Bool = false

    var body: some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundColor(accent ? brandGreen : brandDark)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(brandMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct BigStatCard: View {
    let value: String
    let label: String
    let icon: String
    var accent: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(accent ? brandGreen : brandDark.opacity(0.6))
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(accent ? brandGreen : brandDark)
                Text(label)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(brandMuted)
            }
            Spacer()
        }
        .padding(10)
        .background(brandBg)
        .cornerRadius(10)
        .frame(maxWidth: .infinity)
    }
}
