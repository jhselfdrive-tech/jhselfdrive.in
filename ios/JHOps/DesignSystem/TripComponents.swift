import SwiftUI

struct StatusBadge: View {
  let status: String
  let label: String
  var body: some View {
    Label {
      Text(label)
    } icon: {
      Circle().fill(Theme.status(status)).frame(width: 7, height: 7)
    }.font(.caption.weight(.semibold)).foregroundStyle(Theme.status(status)).padding(.horizontal, 9)
      .padding(.vertical, 5).background(Theme.status(status).opacity(0.09), in: Capsule())
  }
}
struct StatusRail: View {
  let status: String
  var body: some View {
    RoundedRectangle(cornerRadius: 3).fill(Theme.status(status)).frame(width: 4)
      .accessibilityHidden(true)
  }
}
struct TripStrip: View {
  let start: Date
  let end: Date
  let status: String
  var compact = false
  private var days: Int { max(1, Int(ceil(end.timeIntervalSince(start) / 86400))) }
  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      ViewThatFits(in: .horizontal) {
        tripLine
        VStack(alignment: .leading, spacing: 5) {
          Text(start.formatted(date: .abbreviated, time: .shortened))
          Label("\(days) \(days == 1 ? "day" : "days")", systemImage: "arrow.down")
          Text(end.formatted(date: .abbreviated, time: .shortened))
        }
      }
      TimelineView(.periodic(from: .now, by: 60)) { context in
        if let countdown = TripCountdown.text(
          start: start, end: end, status: status, now: context.date)
        {
          Text(countdown).font(.caption.weight(.semibold)).foregroundStyle(
            status == "ongoing" && end < context.date ? .red : Theme.teal)
        }
      }
    }.font(compact ? .caption : .subheadline).monospacedDigit()
  }
  private var tripLine: some View {
    HStack(spacing: 10) {
      VStack(alignment: .leading, spacing: 3) {
        Text(start.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)))
        Text(start, format: .dateTime.hour().minute()).foregroundStyle(Theme.muted)
      }
      VStack(spacing: 3) {
        Text("\(days) \(days == 1 ? "day" : "days")").font(.caption)
        Image(systemName: "arrow.right")
      }.foregroundStyle(Theme.muted).frame(minWidth: 36)
      VStack(alignment: .leading, spacing: 3) {
        Text(end.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated)))
        Text(end, format: .dateTime.hour().minute()).foregroundStyle(Theme.muted)
      }
    }
  }
}
struct MoneyBar: View {
  let paid: Double
  let total: Double
  let balance: Double
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        MoneyText(value: paid)
        Text("of").foregroundStyle(Theme.muted)
        MoneyText(value: total)
        Spacer()
      }.monospacedDigit()
      ProgressView(value: max(0, min(paid, total)), total: max(1, total)).tint(Theme.teal)
      HStack {
        Text(balance > 0 ? "Balance due" : "Settled")
        Spacer()
        MoneyText(value: max(0, balance))
      }.font(.headline).foregroundStyle(balance > 0 ? Theme.coral : Theme.teal)
    }
  }
}
