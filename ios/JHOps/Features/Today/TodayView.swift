import SwiftUI
import WidgetKit

struct TodayView: View {
  @Environment(SessionModel.self) private var session
  @Environment(Router.self) private var router
  @State private var summary = ScreenModel<OpsSummary>()
  @State private var reminders = ScreenModel<RemindersResponse>()
  @State private var alerts = ScreenModel<AlertsResponse>()
  @State private var trips = ScreenModel<BookingsResponse>()
  @State private var metrics = ScreenModel<Metrics>()
  @State private var error: String?
  @State private var busy: String?
  private struct Event: Identifiable {
    let booking: BookingRow
    let returning: Bool
    var time: Date { returning ? booking.endAt : booking.startAt }
    var id: String { booking.id + (returning ? "return" : "pickup") }
  }
  private var events: [Event] {
    (trips.value?.bookings ?? []).flatMap { b -> [Event] in
      guard !["cancelled", "rejected"].contains(b.status) else { return [] }
      var result: [Event] = []
      if Calendar.current.isDateInToday(b.startAt) {
        result.append(Event(booking: b, returning: false))
      }
      if Calendar.current.isDateInToday(b.endAt) {
        result.append(Event(booking: b, returning: true))
      }
      return result
    }.sorted { $0.time < $1.time }
  }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 18) {
        Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide))).font(
          Theme.Font.eyebrow
        ).foregroundStyle(Theme.muted)
        if let counts = summary.value {
          Text(
            "\(counts.pendingRequests + counts.overdueReturns + counts.unsentMessages + counts.pickupsToday) things need you"
          ).font(.system(.largeTitle, design: .rounded).bold())
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
              chip("Overdue", counts.overdueReturns, "overdue", .red)
              chip("Requests", counts.pendingRequests, "requested", Theme.coral)
              chip("Messages", counts.unsentMessages, "messages", Theme.teal)
              chip("Pickups", counts.pickupsToday, "pickups", Theme.teal)
            }
          }
        } else if let error = summary.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
        Card("Today’s timeline") {
          if events.isEmpty { Text("No pickups or returns today.").foregroundStyle(Theme.muted) }
          ForEach(events) { event in
            VStack(alignment: .leading, spacing: 10) {
              NavigationLink(value: Route.booking(event.booking.id)) {
                HStack(alignment: .top, spacing: 12) {
                  VStack(alignment: .leading, spacing: 6) {
                    Text(event.time, format: .dateTime.hour().minute()).font(.headline)
                      .monospacedDigit()
                    Text(event.returning ? "RETURN" : "PICKUP").font(Theme.Font.eyebrow)
                      .foregroundStyle(event.returning ? Theme.coral : Theme.teal)
                  }.frame(minWidth: 70, alignment: .leading)
                  VStack(alignment: .leading, spacing: 5) {
                    Text(event.booking.customerName).font(.system(.headline, design: .rounded))
                    Text(event.booking.vehicleLabel ?? event.booking.carLabel).font(.caption)
                      .foregroundStyle(Theme.muted)
                    if let balance = event.booking.balance, balance > 0 {
                      HStack {
                        MoneyText(value: balance)
                        Text("due")
                      }.font(.caption).foregroundStyle(Theme.coral)
                    }
                  }
                  Spacer()
                  Image(systemName: "chevron.right").font(.caption)
                }.foregroundStyle(Theme.ink)
              }
              QuickContact(phone: event.booking.phone)
              Divider()
            }
          }
        }
        if let values = reminders.value?.reminders, !values.isEmpty {
          Card("Customer reminders") {
            ForEach(values) { reminder in
              VStack(alignment: .leading, spacing: 8) {
                NavigationLink(
                  reminder.customerName ?? "Customer", value: Route.booking(reminder.bookingId)
                ).font(.headline)
                Text(reminder.body).font(.callout).lineLimit(3).foregroundStyle(Theme.muted)
                ViewThatFits {
                  HStack { reminderActions(reminder) }
                  VStack(alignment: .leading) { reminderActions(reminder) }
                }
                Divider()
              }
            }
          }
        }
        if let values = alerts.value?.alerts, !values.isEmpty {
          Card("Needs attention") {
            ForEach(values.filter { $0.urgency == "urgent" }) { alertRow($0) }
            let others = values.filter { $0.urgency != "urgent" }
            if !others.isEmpty {
              DisclosureGroup("\(others.count) more") { ForEach(others) { alertRow($0) } }
            }
          }
        }
        Card("Performance") {
          NavigationLink(value: Route.performance) {
            VStack(alignment: .leading, spacing: 8) {
              if let value = metrics.value {
                MoneyText(value: value.revenueThisMonth).font(Theme.Font.name)
                Text("Revenue this month").font(.caption)
                Text("\(value.weekChange >= 0 ? "+" : "")\(value.weekChange)% bookings this week")
                  .foregroundStyle(Theme.teal)
              } else {
                Label("View performance", systemImage: "chart.line.uptrend.xyaxis")
              }
            }.foregroundStyle(Theme.ink)
          }
        }
        CacheFooter(
          error: summary.error ?? reminders.error ?? alerts.error ?? trips.error ?? metrics.error,
          date: summary.updatedAt)
        MutationError(message: error)
      }.padding().padding(.bottom, 76).frame(maxWidth: 760).frame(maxWidth: .infinity)
    }.background(Theme.paper)
      .navigationTitle("Today").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        Menu {
          Button("Sign out", role: .destructive) { Task { await session.signOut() } }
        } label: {
          Image(systemName: "person.crop.circle")
        }
      }
      .opsRefresh { await load() }
  }
  private func chip(_ label: String, _ count: Int, _ filter: String, _ color: Color) -> some View {
    Button {
      router.openBookings(filter: filter)
    } label: {
      VStack(alignment: .leading, spacing: 6) {
        Text("\(count)").font(.title2.bold()).monospacedDigit()
        Text(label).font(.caption.weight(.medium))
      }.padding(14).frame(minWidth: 96, alignment: .leading).foregroundStyle(color).background(
        color.opacity(0.09), in: RoundedRectangle(cornerRadius: 16))
    }
  }
  @ViewBuilder private func alertRow(_ alert: OpsAlert) -> some View {
    if let id = alert.bookingId {
      NavigationLink(alert.label, value: Route.booking(id))
    } else if let id = alert.vehicleId {
      NavigationLink(alert.label, value: Route.vehicle(id))
    } else {
      Text(alert.label)
    }
  }
  @ViewBuilder private func reminderActions(_ reminder: Reminder) -> some View {
    Link("WhatsApp", destination: whatsappURL(phone: reminder.phone, text: reminder.body))
    Button("Sent") { Task { await resolve(reminder, "sent") } }.disabled(busy != nil)
    Button("Skip") { Task { await resolve(reminder, "skipped") } }.disabled(busy != nil)
    if busy == reminder.id { ProgressView() }
  }
  private func load() async {
    async let s: () = summary.load("summary", cache: "today")
    async let r: () = reminders.load("reminders")
    async let a: () = alerts.load("alerts")
    async let m: () = metrics.load("metrics")
    let start = Calendar.current.startOfDay(for: Date())
    let end = start.addingTimeInterval(86400)
    async let t: () = trips.load(
      "bookings",
      query: [
        .init(name: "from", value: start.ISO8601Format()),
        .init(name: "to", value: end.ISO8601Format()), .init(name: "limit", value: "250"),
      ])
    _ = await (s, r, a, m, t)
    if let counts = summary.value {
      SharedStore.save(counts)
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
  private func resolve(_ reminder: Reminder, _ outcome: String) async {
    busy = reminder.id
    error = nil
    do {
      _ = try await OpsAPI.shared.mutate(
        "reminders/resolve",
        body: [
          "bookingId": .string(reminder.bookingId), "reminder": .string(reminder.reminder),
          "onDate": .string(reminder.onDate), "outcome": .string(outcome),
        ])
      await reminders.load("reminders")
    } catch { self.error = error.localizedDescription }
    busy = nil
  }
}
