import SwiftUI
import WidgetKit
struct TodayView: View {
    @Environment(SessionModel.self) private var session
    @State private var summary = ScreenModel<OpsSummary>()
    @State private var reminders = ScreenModel<RemindersResponse>()
    @State private var alerts = ScreenModel<AlertsResponse>()
    @State private var trips = ScreenModel<BookingsResponse>()
    @State private var creating = false
    @State private var error: String?
    @State private var busy: String?
    var body: some View {
        List {
            Section {
                if let counts = summary.value {
                    LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:12) {
                        StatTile(count:counts.pendingRequests,label:"Requests",symbol:"tray")
                        StatTile(count:counts.pickupsToday,label:"Pickups today",symbol:"key")
                        StatTile(count:counts.overdueReturns,label:"Overdue returns",symbol:"clock.badge.exclamationmark")
                        StatTile(count:counts.unsentMessages,label:"Unsent messages",symbol:"message")
                    }.listRowBackground(Color.clear).listRowInsets(EdgeInsets())
                } else if let error = summary.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
                Button("Record a booking",systemImage:"plus.circle.fill") { creating = true }
            }
            if let values = reminders.value?.reminders, !values.isEmpty {
                Section("Customer reminders") {
                    ForEach(values) { reminder in
                        VStack(alignment:.leading,spacing:8) {
                            NavigationLink(reminder.customerName ?? "Customer",value:Route.booking(reminder.bookingId)).font(.headline)
                            Text(reminder.reminder.replacingOccurrences(of:"_",with:" ").capitalized).font(.caption)
                            Link("Open WhatsApp",destination:whatsappURL(phone:reminder.phone,text:reminder.body))
                            HStack { Button("Sent") { Task { await resolve(reminder,"sent") } }; Button("Skip") { Task { await resolve(reminder,"skipped") } }; if busy == reminder.id { ProgressView() } }.buttonStyle(.bordered).disabled(busy != nil)
                        }
                    }
                }
            }
            if let values = alerts.value?.alerts {
                ForEach(["urgent","warning","info"],id:\.self) { urgency in
                    let group = values.filter { $0.urgency == urgency }
                    if !group.isEmpty { Section(urgency == "urgent" ? "Needs attention now" : urgency == "warning" ? "To follow up" : "Checklists") {
                        ForEach(group) { alert in
                            if let id = alert.bookingId { NavigationLink(alert.label,value:Route.booking(id)) }
                            else if let id = alert.vehicleId { NavigationLink(alert.label,value:Route.vehicle(id)) }
                            else { Text(alert.label) }
                        }
                    } }
                }
            }
            if let bookings = trips.value?.bookings {
                Section("Today’s pickups and returns") {
                    ForEach(bookings.filter { Calendar.current.isDateInToday($0.startAt) || Calendar.current.isDateInToday($0.endAt) }) { b in NavigationLink(value:Route.booking(b.id)) { BookingRowView(booking:b) } }
                }
            }
            Section { NavigationLink("Performance",value:Route.performance) }
            CacheFooter(error:summary.error ?? reminders.error ?? alerts.error ?? trips.error,date:summary.updatedAt)
            MutationError(message:error)
        }.navigationTitle("Today").scrollContentBackground(.hidden).background(Theme.paper)
            .toolbar { Menu { Button("Sign out",role:.destructive) { Task { await session.signOut() } } } label: { Image(systemName:"person.crop.circle") } }
            .sheet(isPresented:$creating) { NewBookingView() }.opsRefresh { await load() }
    }
    private func load() async {
        await summary.load("summary",cache:"today")
        if let counts = summary.value { SharedStore.save(counts); WidgetCenter.shared.reloadAllTimelines() }
        await reminders.load("reminders"); await alerts.load("alerts")
        let start = Calendar.current.startOfDay(for:Date()), end = start.addingTimeInterval(86400)
        await trips.load("bookings",query:[.init(name:"from",value:start.ISO8601Format()),.init(name:"to",value:end.ISO8601Format()),.init(name:"limit",value:"250")])
    }
    private func resolve(_ reminder: Reminder,_ outcome: String) async {
        busy = reminder.id; error = nil
        do { _ = try await OpsAPI.shared.mutate("reminders/resolve",body:["bookingId":.string(reminder.bookingId),"reminder":.string(reminder.reminder),"onDate":.string(reminder.onDate),"outcome":.string(outcome)]); await reminders.load("reminders") }
        catch { self.error = error.localizedDescription }; busy = nil
    }
}
