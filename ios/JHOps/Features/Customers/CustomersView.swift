import SwiftUI
struct CustomersView: View {
    @State private var model = ScreenModel<CustomersResponse>()
    @State private var search = ""
    var body: some View {
        List {
            if let customers = model.value?.customers {
                if customers.isEmpty { ContentUnavailableView.search(text:search) }
                ForEach(customers) { customer in NavigationLink(value:Route.customer(customer.id)) { VStack(alignment:.leading,spacing:8) { Text(customer.fullName ?? customer.phone).font(.headline); Text(customer.phone).font(.subheadline).foregroundStyle(Theme.muted); Text(customer.segments.joined(separator:" · ")).font(.caption).foregroundStyle(Theme.teal) } } }
                CacheFooter(error:model.error,date:model.updatedAt)
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
        }.navigationTitle("Customers").searchable(text:$search,prompt:"Name or phone").opsRefresh { await load() }
            .task(id:search) { try? await Task.sleep(for:.milliseconds(300)); if !Task.isCancelled { await load() } }
    }
    private func load() async { await model.load("customers",query:[.init(name:"search",value:search)],cache:search.isEmpty ? "customers" : nil) }
}
struct CustomerDetailView: View {
    let customerId: String
    @State private var model = ScreenModel<CustomerDetail>()
    @State private var tags = ""
    @State private var notes = ""
    @State private var creating = false
    @State private var editing = false
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        Form {
            if let detail = model.value {
                Section {
                    Text(detail.customer.fullName ?? "Customer").font(.system(.title2,design:.serif))
                    Text(detail.customer.phone); if let city = detail.customer.city { Text(city) }
                    Text(detail.customer.segments.joined(separator:" · ")).foregroundStyle(Theme.teal)
                    LabeledContent("Bookings",value:"\(detail.customer.bookingCount)")
                    LabeledContent("Completed",value:"\(detail.customer.completedBookingCount)")
                    HStack { Text("Lifetime value"); Spacer(); MoneyText(value:detail.customer.lifetimeValue) }
                    Button("Record a booking") { creating = true }
                }
                Section("Tags and notes") {
                    if editing {
                        TextField("Tags, separated by commas",text:$tags); TextField("Customer notes",text:$notes,axis:.vertical)
                        Button { Task { await save() } } label: { if busy { ProgressView() } else { Text("Save") } }.disabled(busy)
                        Button("Cancel") { editing = false }
                    } else {
                        Text(detail.customer.tags.joined(separator:", ")); Text(detail.customer.notes ?? "No notes")
                        Button("Edit") { tags = detail.customer.tags.joined(separator:", "); notes = detail.customer.notes ?? ""; editing = true }
                    }
                    MutationError(message:error)
                }
                Section("Booking history") { ForEach(detail.bookings) { booking in NavigationLink(value:Route.booking(booking.id)) { BookingRowView(booking:booking) } } }
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
            CacheFooter(error:model.error,date:nil)
        }.navigationTitle("Customer").opsRefresh { await load() }
            .sheet(isPresented:$creating) { if let customer = model.value?.customer { NewBookingView(customer:customer) } }
    }
    private func load() async { await model.load("customers/\(customerId)") }
    private func save() async { busy = true; error = nil
        do { _ = try await OpsAPI.shared.mutate("customers/\(customerId)",method:"PATCH",body:["tags":.array(tags.split(separator:",").map { .string($0.trimmingCharacters(in:.whitespaces)) }),"notes":.string(notes)]); editing = false; UINotificationFeedbackGenerator().notificationOccurred(.success); await load() }
        catch { self.error = error.localizedDescription }; busy = false
    }
}
