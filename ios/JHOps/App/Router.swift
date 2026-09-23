import SwiftUI
enum AppTab: String, CaseIterable { case today,bookings,calendar,fleet,customers
    var label: String { rawValue.capitalized }
    var symbol: String { switch self { case .today:"house"; case .bookings:"list.bullet.rectangle"; case .calendar:"calendar"; case .fleet:"car.2"; case .customers:"person.2" } }
}
enum Route: Hashable { case booking(String),vehicle(String),customer(String),performance }
@Observable @MainActor final class Router {
    var selected: AppTab = .today
    var paths: [AppTab:[Route]] = [:]
    func openBooking(_ id: String) { selected = .bookings; paths[.bookings] = [.booking(id)] }
}
struct TabRootView: View {
    @Environment(SessionModel.self) private var session
    @State private var router = Router()
    var body: some View {
        @Bindable var router = router
        TabView(selection:$router.selected) {
            ForEach(AppTab.allCases,id:\.self) { tab in
                NavigationStack(path:Binding(get:{ router.paths[tab] ?? [] },set:{ router.paths[tab] = $0 })) {
                    Group {
                        switch tab {
                        case .today: TodayView()
                        case .bookings: BookingsView()
                        case .calendar: CalendarView()
                        case .fleet: FleetView()
                        case .customers: CustomersView()
                        }
                    }.navigationDestination(for:Route.self) { route in
                        switch route { case .booking(let id):BookingDetailView(bookingId:id); case .vehicle(let id):VehicleDetailView(vehicleId:id); case .customer(let id):CustomerDetailView(customerId:id); case .performance:PerformanceView() }
                    }
                }.tabItem { Label(tab.label,systemImage:tab.symbol) }.tag(tab)
            }
        }.tint(Theme.coral)
        .onReceive(NotificationCenter.default.publisher(for:.openBooking)) { note in
            if let id = note.userInfo?["bookingId"] as? String { router.openBooking(id); AppDelegate.launchBookingId = nil }
        }.onAppear { if let id = AppDelegate.launchBookingId { AppDelegate.launchBookingId = nil; router.openBooking(id) } }
        .task { await session.loadMeta() }
        .overlay { if session.needsUpdate { ContentUnavailableView("Update JH Ops",systemImage:"arrow.down.app",description:Text("Install the latest build from TestFlight to continue.")).frame(maxWidth:.infinity,maxHeight:.infinity).background(Theme.paper) } }
    }
}
