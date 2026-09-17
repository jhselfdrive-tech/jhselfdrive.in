import SwiftUI
import WidgetKit

struct OpsEntry: TimelineEntry, Sendable {
    let date: Date
    let summary: OpsSummary
    /// Distinguishes "nothing waiting" from "we could not reach the server".
    let stale: Bool
}

struct OpsProvider: TimelineProvider {
    func placeholder(in context: Context) -> OpsEntry {
        OpsEntry(
            date: Date(),
            summary: OpsSummary(pendingRequests: 2, overdueReturns: 0, pickupsToday: 1, unsentMessages: 0),
            stale: false
        )
    }

    // The completion parameters must be declared @Sendable to match the
    // protocol. Omitting it makes the closure non-Sendable, and capturing it in
    // a Task then fails Swift 6's data-race check.
    func getSnapshot(in context: Context, completion: @escaping @Sendable (OpsEntry) -> Void) {
        let cached = SharedStore.load()
        completion(OpsEntry(date: Date(), summary: cached ?? .empty, stale: cached == nil))
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<OpsEntry>) -> Void) {
        Task {
            // Paint from the App Group cache first so the widget is never
            // blank, then try the network.
            let cached = SharedStore.load()
            var summary = cached ?? .empty
            var stale = cached == nil

            if let fresh = try? await OpsAPI.shared.summary() {
                summary = fresh
                SharedStore.save(fresh)
                stale = false
            }

            // WidgetKit grants only ~40-70 refreshes a day, so 20 minutes is
            // about as tight as is useful. Pushes are what actually keep this
            // current — see JHOpsNotify.
            let next = Date().addingTimeInterval(20 * 60)
            completion(Timeline(entries: [OpsEntry(date: Date(), summary: summary, stale: stale)], policy: .after(next)))
        }
    }
}

struct JHOpsWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: OpsEntry

    var body: some View {
        switch family {
        case .systemSmall: small
        default: medium
        }
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Requests").font(.caption2).foregroundStyle(.secondary)
            Text("\(entry.summary.pendingRequests)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundStyle(entry.summary.pendingRequests > 0 ? Color.orange : Color.secondary)
            Spacer(minLength: 0)
            if entry.summary.overdueReturns > 0 {
                Label("\(entry.summary.overdueReturns) overdue", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption2).foregroundStyle(.red)
            } else if entry.summary.pickupsToday > 0 {
                Label("\(entry.summary.pickupsToday) pickup today", systemImage: "key.fill")
                    .font(.caption2).foregroundStyle(.secondary)
            } else {
                Text(entry.stale ? "No data yet" : "All clear")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "car.fill").font(.caption)
                Text("JH Ops").font(.caption.weight(.semibold))
                Spacer()
                if entry.stale {
                    Text("offline").font(.caption2).foregroundStyle(.secondary)
                }
            }
            HStack(spacing: 0) {
                Metric(value: entry.summary.pendingRequests, label: "Requests", tint: .orange)
                Metric(value: entry.summary.pickupsToday, label: "Pickups", tint: .blue)
                Metric(value: entry.summary.overdueReturns, label: "Overdue", tint: .red)
                Metric(value: entry.summary.unsentMessages, label: "Unsent", tint: .purple)
            }
        }
    }

    private struct Metric: View {
        let value: Int
        let label: String
        let tint: Color

        var body: some View {
            VStack(spacing: 2) {
                Text("\(value)")
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(value > 0 ? tint : Color.secondary)
                Text(label).font(.caption2).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

@main
struct JHOpsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "JHOpsWidget", provider: OpsProvider()) { entry in
            JHOpsWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("JH Ops")
        .description("Booking requests, pickups and overdue returns at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
