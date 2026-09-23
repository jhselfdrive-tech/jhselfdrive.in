import SwiftUI
struct NewBookingView: View {
    var customer: CustomerRow? = nil
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionModel.self) private var session
    @State private var name = ""
    @State private var phone = ""
    @State private var city = ""
    @State private var notes = ""
    @State private var status = "approved"
    @State private var start = Date()
    @State private var end = Date().addingTimeInterval(86400)
    @State private var vehicles: [AvailableVehicle] = []
    @State private var vehicleId = ""
    @State private var quote: Quote?
    @State private var overridePrice = false
    @State private var overrideDeposit = false
    @State private var amount = ""
    @State private var deposit = ""
    @State private var busy = false
    @State private var quoting = false
    @State private var error: String?
    @State private var createdId: String?
    private var rangeKey: String { "\(start.timeIntervalSince1970):\(end.timeIntervalSince1970)" }
    var body: some View {
        NavigationStack {
            Form {
                if let createdId {
                    Section { Label("Booking recorded",systemImage:"checkmark.circle.fill").foregroundStyle(Theme.teal); NavigationLink("Open booking") { BookingDetailView(bookingId:createdId) }; Button("Done") { dismiss() } }
                } else {
                    Section("Customer") {
                        if let customer { LabeledContent(customer.fullName ?? "Customer",value:customer.phone) }
                        else { TextField("Full name",text:$name); TextField("Phone",text:$phone).keyboardType(.phonePad); TextField("City",text:$city) }
                    }
                    Section("Trip") {
                        DateRangeRow(start:$start,end:$end)
                        Picker("Vehicle",selection:$vehicleId) { Text("Choose available vehicle").tag(""); ForEach(vehicles) { Text($0.label).tag($0.id) } }
                        if vehicles.isEmpty && !quoting { Text("No vehicles available for this window.").foregroundStyle(.secondary) }
                        Picker("Status",selection:$status) { ForEach(["approved","confirmed","ongoing","completed"],id:\.self) { Text(session.label($0)).tag($0) } }
                        TextField("Trip notes",text:$notes,axis:.vertical)
                    }
                    Section("Price") {
                        if quoting { ProgressView("Updating quote") }
                        if let quote {
                            LabeledContent("Rental days",value:"\(quote.days)")
                            HStack { Text("Daily rate"); Spacer(); MoneyText(value:quote.dayRate) }
                            HStack { Text("Rental total"); Spacer(); MoneyText(value:quote.amountTotal) }
                            HStack { Text("Deposit"); Spacer(); MoneyText(value:quote.deposit) }
                            Toggle("Override rental total",isOn:$overridePrice)
                            if overridePrice { TextField("Rental total",text:$amount).keyboardType(.decimalPad) }
                            Toggle("Override deposit",isOn:$overrideDeposit)
                            if overrideDeposit { TextField("Deposit",text:$deposit).keyboardType(.decimalPad) }
                        }
                    }
                    Section { MutationError(message:error); Button { Task { await save() } } label: { if busy { ProgressView() } else { Text("Record booking") } }.disabled(busy || quoting || quote == nil || vehicleId.isEmpty || end <= start || (customer == nil && (name.isEmpty || phone.isEmpty))) }
                }
            }.navigationTitle("New booking").toolbar { ToolbarItem(placement:.cancellationAction) { Button("Close") { dismiss() }.disabled(busy) } }
                .task(id:rangeKey) { await availability() }
                .task(id:vehicleId) { await price() }
        }
    }
    private func availability() async {
        quote = nil; vehicles = []; vehicleId = ""; error = nil
        guard end > start else { return }; quoting = true
        do { let result = try await OpsAPI.shared.read("vehicles/available",query:[.init(name:"startAt",value:start.ISO8601Format()),.init(name:"endAt",value:end.ISO8601Format())],as:AvailableResponse.self); if !Task.isCancelled { vehicles = result.vehicles } }
        catch { if !Task.isCancelled { self.error = error.localizedDescription } }
        if !Task.isCancelled { quoting = false }
    }
    private func price() async {
        quote = nil; guard !vehicleId.isEmpty && end > start else { return }; quoting = true
        do {
            let result = try await OpsAPI.shared.send("api/ops/quote",method:"POST",body:["vehicleId":vehicleId,"startAt":start.ISO8601Format(),"endAt":end.ISO8601Format()],as:Quote.self)
            if !Task.isCancelled { quote = result; amount = String(result.amountTotal); deposit = String(result.deposit) }
        } catch { if !Task.isCancelled { self.error = error.localizedDescription } }
        if !Task.isCancelled { quoting = false }
    }
    private func save() async {
        busy = true; error = nil
        var body: [String:JSONValue] = ["vehicleId":.string(vehicleId),"startAt":.string(start.ISO8601Format()),"endAt":.string(end.ISO8601Format()),"status":.string(status),"notes":.string(notes)]
        if let customer { body["customerId"] = .string(customer.id) }
        else { body["customer"] = .object(["fullName":.string(name),"phone":.string(phone),"city":.string(city)]) }
        if overridePrice { guard let value = Double(amount), value >= 0 else { error = "Enter a valid rental total."; busy = false; return }; body["amountTotal"] = .number(value) }
        if overrideDeposit { guard let value = Double(deposit), value >= 0 else { error = "Enter a valid deposit."; busy = false; return }; body["deposit"] = .number(value) }
        do { let result = try await OpsAPI.shared.mutate("bookings",body:body); createdId = result.bookingId; UINotificationFeedbackGenerator().notificationOccurred(.success) }
        catch { self.error = error.localizedDescription }; busy = false
    }
}
