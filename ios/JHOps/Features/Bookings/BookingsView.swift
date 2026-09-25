import SwiftUI

struct BookingsView: View {
  @Environment(Router.self) private var router
  @State private var model = ScreenModel<BookingsResponse>()
  @State private var search = ""
  @State private var calendarMode = false
  @State private var editing: BookingRow?
  @State private var extra: [BookingRow] = []
  @State private var nextCursor: String?
  @State private var paging = false
  private let filters = [
    ("requested", "Requests"), ("active", "Active"), ("upcoming", "Upcoming"), ("all", "All"),
  ]
  private var filter: String { router.bookingFilter }
  private var rows: [BookingRow] { (model.value?.bookings ?? []) + extra }
  private var days: [Date] {
    Set(rows.map { Calendar.current.startOfDay(for: $0.startAt) }).sorted(
      by: filter == "upcoming" ? (<) : (>))
  }
  var body: some View {
    VStack(spacing: 0) {
      if calendarMode {
        CalendarView()
      } else {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack {
            ForEach(filters, id: \.0) { key, label in
              Button(label) { router.bookingFilter = key }.buttonStyle(.bordered).tint(
                filter == key ? Theme.coral : Theme.muted)
            }
            if !filters.contains(where: { $0.0 == filter }) {
              Text(filter.capitalized).padding(10).background(
                Theme.coral.opacity(0.12), in: Capsule())
            }
          }.padding(.horizontal).padding(.vertical, 8)
        }
        List {
          if model.value != nil {
            if rows.isEmpty {
              EmptyState(
                title: "No bookings here", symbol: "calendar",
                message: search.isEmpty
                  ? "Bookings matching this view appear here." : "Try another name or phone number."
              )
            }
            if ["upcoming", "all"].contains(filter) {
              ForEach(days, id: \.self) { day in
                Section(dayLabel(day)) {
                  ForEach(rows.filter { Calendar.current.isDate($0.startAt, inSameDayAs: day) }) {
                    row($0)
                  }
                }
              }
            } else {
              ForEach(rows) { row($0) }
            }
            if nextCursor != nil {
              Button {
                Task { await more() }
              } label: {
                if paging { ProgressView() } else { Text("Load more") }
              }.disabled(paging)
            }
            CacheFooter(error: model.error, date: model.updatedAt)
          } else if let error = model.error {
            ErrorState(message: error) { Task { await load() } }
          } else {
            LoadingList()
          }
        }.scrollContentBackground(.hidden).searchable(text: $search, prompt: "Name or phone")
      }
    }.background(Theme.paper).navigationTitle("Bookings")
      .toolbar {
        Picker("Display", selection: $calendarMode) {
          Image(systemName: "list.bullet").tag(false)
          Image(systemName: "calendar").tag(true)
        }.pickerStyle(.segmented).frame(width: 120).accessibilityLabel("List or Calendar")
      }
      .sheet(item: $editing) { BookingEditor(id: $0.id) }
      .opsRefresh { await load() }
      .task(id: "\(filter):\(search)") {
        try? await Task.sleep(for: .milliseconds(300))
        if !Task.isCancelled { await load() }
      }
  }
  private func row(_ booking: BookingRow) -> some View {
    NavigationLink(value: Route.booking(booking.id)) { BookingRowView(booking: booking) }
      .listRowBackground(Theme.surface)
      .swipeActions(edge: .leading, allowsFullSwipe: false) {
        if let url = callURL(booking.phone) {
          Link(destination: url) { Label("Call", systemImage: "phone") }.tint(Theme.teal)
        }
        Link(destination: whatsappURL(phone: booking.phone, text: "")) {
          Label("WhatsApp", systemImage: "message")
        }.tint(.green)
      }
      .swipeActions(edge: .trailing, allowsFullSwipe: false) {
        if !BookingPresentation.locked(booking.status) {
          Button("Edit", systemImage: "pencil") { editing = booking }.tint(Theme.coral)
        }
      }
  }
  private func dayLabel(_ day: Date) -> String {
    Calendar.current.isDateInToday(day)
      ? "Today"
      : Calendar.current.isDateInTomorrow(day)
        ? "Tomorrow" : day.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated))
  }
  private var query: [URLQueryItem] {
    [.init(name: "status", value: filter), .init(name: "search", value: search)]
  }
  private func load() async {
    extra = []
    await model.load("bookings", query: query, cache: search.isEmpty ? "bookings-\(filter)" : nil)
    nextCursor = model.value?.nextCursor
  }
  private func more() async {
    guard let nextCursor else { return }
    let key = "\(filter):\(search)"
    paging = true
    do {
      let page = try await OpsAPI.shared.read(
        "bookings", query: query + [.init(name: "cursor", value: nextCursor)],
        as: BookingsResponse.self)
      if key == "\(filter):\(search)" {
        let ids = Set(rows.map(\.id))
        extra += page.bookings.filter { !ids.contains($0.id) }
        self.nextCursor = page.nextCursor
      }
    } catch { if key == "\(filter):\(search)" { model.error = error.localizedDescription } }
    paging = false
  }
}
