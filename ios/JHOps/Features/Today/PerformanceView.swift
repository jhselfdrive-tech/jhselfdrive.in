import SwiftUI
import Charts
struct PerformanceView: View {
    @State private var model = ScreenModel<Metrics>()
    var body: some View {
        List {
            if let m = model.value {
                Section("This month") { HStack { Text("Completed rental revenue"); Spacer(); MoneyText(value:m.revenueThisMonth) } }
                Section("Last 56 days") { LabeledContent("Active bookings",value:String(m.activeBookings)); LabeledContent("Pending bookings",value:String(m.pendingBookings)); LabeledContent("Conversion",value:"\(m.conversionRate)%") }
                Section("Bookings this week") { LabeledContent("This week",value:String(m.thisWeek)); LabeledContent("Last week",value:String(m.lastWeek)); LabeledContent("Change",value:"\(m.weekChange)%") }
                Section("Weekly bookings") { Chart(Array(m.trend.enumerated()),id:\.offset) { _,p in BarMark(x:.value("Week",p.label),y:.value("Bookings",p.value)).foregroundStyle(Theme.teal) }.frame(height:220) }
                Section("Revenue by vehicle") { ForEach(Array(m.vehicleRevenue.enumerated()),id:\.offset) { _,p in HStack { Text(p.label); Spacer(); MoneyText(value:p.value) } } }
                CacheFooter(error:model.error,date:nil)
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
        }.navigationTitle("Performance").opsRefresh { await load() }
    }
    private func load() async { await model.load("metrics") }
}
