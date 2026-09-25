import SwiftUI

struct CustomersView: View {
  @State private var model = ScreenModel<CustomersResponse>()
  @State private var search = ""
  var body: some View {
    List {
      if let customers = model.value?.customers {
        if customers.isEmpty { EmptyState(title: "No customers found", symbol: "person.2") }
        ForEach(customers) { customer in
          NavigationLink(value: Route.customer(customer.id)) {
            HStack(alignment: .top, spacing: 12) {
              Text(customer.initials).font(.headline).frame(width: 44, height: 44).background(
                Theme.teal.opacity(0.12), in: Circle()
              ).foregroundStyle(Theme.teal)
              VStack(alignment: .leading, spacing: 6) {
                Text(customer.fullName ?? customer.phone).font(.system(.headline, design: .rounded))
                Text(customer.phone).font(.subheadline).foregroundStyle(Theme.muted)
                HStack {
                  Text("\(customer.bookingCount) trips ·")
                  MoneyText(value: customer.lifetimeValue)
                }.font(.caption)
                Text(customer.segments.joined(separator: " · ")).font(.caption.weight(.medium))
                  .foregroundStyle(Theme.teal)
              }
            }.padding(.vertical, 6)
          }.swipeActions(edge: .leading, allowsFullSwipe: false) {
            if let url = callURL(customer.phone) {
              Link(destination: url) { Label("Call", systemImage: "phone") }.tint(Theme.teal)
            }
            Link(destination: whatsappURL(phone: customer.phone, text: "")) {
              Label("WhatsApp", systemImage: "message")
            }.tint(.green)
          }.listRowBackground(Theme.surface)
        }
        CacheFooter(error: model.error, date: model.updatedAt)
      } else if let error = model.error {
        ErrorState(message: error) { Task { await load() } }
      } else {
        LoadingList()
      }
    }.scrollContentBackground(.hidden).background(Theme.paper).navigationTitle("Customers")
      .searchable(text: $search, prompt: "Name or phone").opsRefresh { await load() }
      .task(id: search) {
        try? await Task.sleep(for: .milliseconds(300))
        if !Task.isCancelled { await load() }
      }
  }
  private func load() async {
    await model.load(
      "customers", query: [.init(name: "search", value: search)],
      cache: search.isEmpty ? "customers" : nil)
  }
}
extension CustomerRow {
  var initials: String {
    (fullName ?? "Customer").split(separator: " ").prefix(2).compactMap(\.first).map(String.init)
      .joined().uppercased()
  }
}
struct CustomerDetailView: View {
  let customerId: String
  @State private var model = ScreenModel<CustomerDetail>()
  @State private var tags = ""
  @State private var notes = ""
  @State private var creating = false
  @State private var editingProfile = false
  @State private var editing = false
  @State private var busy = false
  @State private var error: String?
  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        if let d = model.value {
          Card(actionTitle: "Edit profile", action: { editingProfile = true }) {
            Text(d.customer.fullName ?? "Customer").font(Theme.Font.name)
            Text(d.customer.phone).foregroundStyle(Theme.muted)
            if let city = d.customer.city { Text(city) }
            if let email = d.customer.email { Text(email) }
            QuickContact(phone: d.customer.phone)
            Button("Edit profile") { editingProfile = true }
          }
          Card("History at a glance") {
            ViewThatFits(in: .horizontal) {
              HStack(alignment: .top, spacing: 24) { stats(d.customer) }
              VStack(alignment: .leading, spacing: 14) { stats(d.customer) }
            }
          }
          Card(
            "Tags and notes", actionTitle: editing ? nil : "Edit",
            action: {
              tags = d.customer.tags.joined(separator: ", ")
              notes = d.customer.notes ?? ""
              editing = true
            }
          ) {
            if editing {
              TextField("Tags, separated by commas", text: $tags)
              TextField("Customer notes", text: $notes, axis: .vertical)
              HStack {
                Button("Save") { Task { await save() } }.disabled(busy)
                Button("Cancel") { editing = false }
              }
            } else {
              Text(d.customer.tags.joined(separator: ", "))
              Text(d.customer.notes ?? "No notes").foregroundStyle(Theme.muted)
            }
            MutationError(message: error)
          }
          ForEach(d.bookings) { booking in
            Card {
              NavigationLink(value: Route.booking(booking.id)) { BookingRowView(booking: booking) }
            }
          }
          Button("New booking for this customer", systemImage: "plus") { creating = true }
            .buttonStyle(.borderedProminent)
        } else if let error = model.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
        CacheFooter(error: model.error, date: nil)
      }.padding().frame(maxWidth: 760).frame(maxWidth: .infinity)
    }.background(Theme.paper).navigationTitle("Customer").navigationBarTitleDisplayMode(.inline)
      .opsRefresh { await load() }
      .sheet(isPresented: $creating) {
        if let customer = model.value?.customer { NewBookingView(customer: customer) }
      }
      .sheet(isPresented: $editingProfile) {
        if let customer = model.value?.customer { EditCustomerSheet(customer: customer) }
      }
  }
  @ViewBuilder private func stats(_ customer: CustomerRow) -> some View {
    VStack(alignment: .leading) {
      Text("\(customer.bookingCount)").font(.title2.bold())
      Text("Trips").font(Theme.Font.eyebrow)
    }
    VStack(alignment: .leading) {
      Text("\(customer.completedBookingCount)").font(.title2.bold())
      Text("Completed").font(Theme.Font.eyebrow)
    }
    VStack(alignment: .leading) {
      MoneyText(value: customer.lifetimeValue).font(.title2.bold())
      Text("Lifetime value").font(Theme.Font.eyebrow)
    }
  }
  private func load() async { await model.load("customers/\(customerId)") }
  private func save() async {
    busy = true
    error = nil
    do {
      try await OpsAPI.shared.updateCustomer(
        customerId,
        fields: [
          "tags": .array(
            tags.split(separator: ",").map { .string($0.trimmingCharacters(in: .whitespaces)) }),
          "notes": .string(notes),
        ])
      editing = false
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      await load()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
struct EditCustomerSheet: View {
  let customer: CustomerRow
  @Environment(\.dismiss) private var dismiss
  @State private var name: String
  @State private var phone: String
  @State private var city: String
  @State private var email: String
  @State private var busy = false
  @State private var error: String?
  init(customer: CustomerRow) {
    self.customer = customer
    _name = State(initialValue: customer.fullName ?? "")
    _phone = State(initialValue: customer.phone)
    _city = State(initialValue: customer.city ?? "")
    _email = State(initialValue: customer.email ?? "")
  }
  var body: some View {
    NavigationStack {
      Form {
        TextField("Full name", text: $name).textContentType(.name)
        TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
        Text("Include + and the country code for international numbers.").font(.caption)
          .foregroundStyle(Theme.muted)
        TextField("City", text: $city)
        TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(
          .never
        ).autocorrectionDisabled()
        MutationError(message: error)
      }.navigationTitle("Edit profile").toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }.disabled(busy)
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Save") { Task { await save() } }.disabled(
            busy || name.trimmingCharacters(in: .whitespaces).isEmpty || phone.isEmpty)
        }
      }.disabled(busy)
    }
  }
  private func save() async {
    var fields: [String: JSONValue] = [:]
    if name != (customer.fullName ?? "") { fields["fullName"] = .string(name) }
    if phone != customer.phone { fields["phone"] = .string(phone) }
    if city != (customer.city ?? "") { fields["city"] = .string(city) }
    if email != (customer.email ?? "") { fields["email"] = .string(email) }
    guard !fields.isEmpty else {
      dismiss()
      return
    }
    busy = true
    error = nil
    do {
      try await OpsAPI.shared.updateCustomer(customer.id, fields: fields)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      dismiss()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
