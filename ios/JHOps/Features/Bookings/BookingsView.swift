import SwiftUI
struct BookingsView: View {
    @State private var model = ScreenModel<BookingsResponse>()
    @State private var filter = "requested"
    @State private var search = ""
    @State private var creating = false
    @State private var extra: [BookingRow] = []
    @State private var nextCursor: String?
    @State private var paging = false
    var body: some View {
        List {
            Picker("View",selection:$filter) { Text("Requests").tag("requested"); Text("Active").tag("active"); Text("Upcoming").tag("upcoming"); Text("All").tag("all") }.pickerStyle(.segmented)
            if let value = model.value {
                if value.bookings.isEmpty {
                    if search.isEmpty { ContentUnavailableView { Label("No bookings here",systemImage:"calendar.badge.plus") } description: { Text("Bookings matching this view will appear here.") } actions: { Button("Record a booking") { creating = true } } }
                    else { ContentUnavailableView.search(text:search) }
                }
                ForEach(value.bookings + extra) { booking in NavigationLink(value:Route.booking(booking.id)) { BookingRowView(booking:booking) } }
                if nextCursor != nil { Button { Task { await more() } } label: { if paging { ProgressView() } else { Text("Load more") } }.disabled(paging) }
                CacheFooter(error:model.error,date:model.updatedAt)
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } }
            else { LoadingList() }
        }.navigationTitle("Bookings").searchable(text:$search,prompt:"Name or phone")
            .toolbar { Button("New booking",systemImage:"plus") { creating = true } }
            .sheet(isPresented:$creating) { NewBookingView() }
            .opsRefresh { await load() }
            .task(id:"\(filter):\(search)") { try? await Task.sleep(for:.milliseconds(300)); if !Task.isCancelled { await load() } }
    }
    private var query: [URLQueryItem] { [.init(name:"status",value:filter),.init(name:"search",value:search)] }
    private func load() async { extra = []; await model.load("bookings",query:query,cache:search.isEmpty ? "bookings-\(filter)" : nil); nextCursor = model.value?.nextCursor }
    private func more() async {
        guard let nextCursor else { return }; paging = true
        do { let page = try await OpsAPI.shared.read("bookings",query:query + [.init(name:"cursor",value:nextCursor)],as:BookingsResponse.self); let ids = Set((model.value?.bookings ?? []).map(\.id) + extra.map(\.id)); extra += page.bookings.filter { !ids.contains($0.id) }; self.nextCursor = page.nextCursor }
        catch { model.error = error.localizedDescription }; paging = false
    }
}
