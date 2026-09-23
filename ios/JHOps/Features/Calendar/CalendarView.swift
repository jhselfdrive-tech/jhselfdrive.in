import SwiftUI
struct CalendarView: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var model = ScreenModel<CalendarResponse>()
    @State private var start = Date()
    @ScaledMetric(relativeTo:.body) private var dayWidth = 112.0
    @ScaledMetric(relativeTo:.body) private var laneHeight = 54.0
    private var days: Int { sizeClass == .regular ? 30 : 14 }
    private var dateString: String { var c = Calendar(identifier:.gregorian); c.timeZone = TimeZone(identifier:"Asia/Kolkata")!; let p = c.dateComponents([.year,.month,.day],from:start); return String(format:"%04d-%02d-%02d",p.year!,p.month!,p.day!) }
    var body: some View {
        VStack(spacing:0) {
            DatePicker("Start date",selection:$start,displayedComponents:.date).padding()
            if let data = model.value {
                ScrollView([.horizontal,.vertical]) {
                    VStack(alignment:.leading,spacing:16) {
                        HStack(spacing:0) { ForEach(0..<days,id:\.self) { day in Text(start.addingTimeInterval(Double(day)*86400),format:.dateTime.day().month(.abbreviated)).font(.caption.weight(.semibold)).frame(width:dayWidth) } }
                        ForEach(data.lanes) { vehicle in
                            VStack(alignment:.leading,spacing:8) {
                                NavigationLink(value:Route.vehicle(vehicle.vehicleId)) { Text("\(vehicle.label) · \(vehicle.registrationNumber)").font(.headline).foregroundStyle(Theme.ink) }
                                ZStack(alignment:.topLeading) {
                                    HStack(spacing:0) { ForEach(0..<days,id:\.self) { _ in Rectangle().fill(Theme.surface).overlay(Rectangle().stroke(Theme.line,lineWidth:0.5)).frame(width:dayWidth) } }
                                    ForEach(vehicle.spans) { span in
                                        Group {
                                            if span.kind == "booking" { NavigationLink(value:Route.booking(span.id)) { bar(span) } }
                                            else { bar(span) }
                                        }.frame(width:Double(span.dayCount)*dayWidth-4,height:laneHeight-4)
                                            .offset(x:Double(span.startDay)*dayWidth+2,y:Double(span.lane)*laneHeight+2)
                                    }
                                }.frame(width:Double(days)*dayWidth,height:Double(vehicle.laneCount)*laneHeight)
                            }
                        }
                        if data.lanes.isEmpty { ContentUnavailableView("No vehicles",systemImage:"car.2") }
                    }.padding()
                }
                if let error = model.error { Text(error).font(.caption).foregroundStyle(.red).padding() }
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } }
            else { List { LoadingList() } }
        }.background(Theme.paper).navigationTitle("Calendar").opsRefresh { await load() }.task(id:"\(dateString):\(days)") { await load() }
    }
    private func bar(_ span: CalendarSpan) -> some View { Text(span.label).font(.caption.weight(.medium)).lineLimit(2).padding(4).frame(maxWidth:.infinity,maxHeight:.infinity,alignment:.leading).foregroundStyle(Theme.ink).background((span.kind == "block" ? Theme.sand : Theme.status(span.status ?? "approved").opacity(0.22)),in:RoundedRectangle(cornerRadius:8)).accessibilityLabel("\(span.label), \(span.kind), \(span.dayCount) days") }
    private func load() async { await model.load("calendar",query:[.init(name:"start",value:dateString),.init(name:"days",value:String(days))]) }
}
