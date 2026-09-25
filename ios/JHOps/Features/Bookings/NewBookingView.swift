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
  @State private var fields = BookingFieldsModel()
  @State private var existingCustomer: CustomerRow?
  @State private var choosingCustomer = false
  @State private var overridePrice = false
  @State private var overrideDeposit = false
  @State private var amount = ""
  @State private var deposit = ""
  @State private var busy = false
  @State private var error: String?
  @State private var createdId: String?
  var body: some View {
    @Bindable var fields = fields
    NavigationStack {
      Form {
        if let createdId {
          Section {
            Label("Booking recorded", systemImage: "checkmark.circle.fill").foregroundStyle(
              Theme.teal)
            NavigationLink("Open booking") { BookingDetailView(bookingId: createdId) }
            Button("Done") { dismiss() }
          }
        } else {
          Section("Customer") {
            if customer == nil {
              Button("Choose existing customer") { choosingCustomer = true }
              if existingCustomer != nil {
                Button("Enter a new customer") { existingCustomer = nil }
              }
            }
            if let customer = customer ?? existingCustomer {
              LabeledContent(customer.fullName ?? "Customer", value: customer.phone)
            } else {
              TextField("Full name", text: $name)
              TextField("Phone", text: $phone).keyboardType(.phonePad).textContentType(
                .telephoneNumber)
              Text(
                "For international numbers, include the country code, e.g. +44 7700 900123. Indian mobiles can use 10 digits."
              ).font(.caption).foregroundStyle(.secondary)
              TextField("City", text: $city)
            }
          }
          Section("Trip") {
            DateRangeRow(start: $fields.start, end: $fields.end)
            Picker("Vehicle", selection: $fields.vehicleId) {
              Text("Choose available vehicle").tag("")
              ForEach(fields.vehicles) { Text($0.label).tag($0.id) }
            }
            if fields.vehicles.isEmpty && !fields.loading {
              Text("No vehicles available for this window.").foregroundStyle(.secondary)
            }
            Picker("Status", selection: $status) {
              ForEach(["approved", "confirmed", "ongoing", "completed"], id: \.self) {
                Text(session.label($0)).tag($0)
              }
            }
            TextField("Trip notes", text: $notes, axis: .vertical)
          }
          Section("Price") {
            if fields.loading { ProgressView("Updating quote") }
            if let quote = fields.quote {
              LabeledContent("Rental days", value: "\(quote.days)")
              HStack {
                Text("Daily rate")
                Spacer()
                MoneyText(value: quote.dayRate)
              }
              HStack {
                Text("Rental total")
                Spacer()
                MoneyText(value: quote.amountTotal)
              }
              HStack {
                Text("Deposit")
                Spacer()
                MoneyText(value: quote.deposit)
              }
              Toggle("Override rental total", isOn: $overridePrice)
              if overridePrice {
                TextField("Rental total", text: $amount).keyboardType(.decimalPad)
              }
              Toggle("Override deposit", isOn: $overrideDeposit)
              if overrideDeposit { TextField("Deposit", text: $deposit).keyboardType(.decimalPad) }
            }
          }
          Section {
            MutationError(message: error ?? fields.error)
            Button {
              Task { await save() }
            } label: {
              if busy { ProgressView() } else { Text("Record booking") }
            }.disabled(
              busy || fields.loading || fields.quote == nil || fields.vehicleId.isEmpty
                || fields.returning <= fields.pickup
                || (customer == nil && existingCustomer == nil && (name.isEmpty || phone.isEmpty)))
          }
        }
      }.navigationTitle("New booking").toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() }.disabled(busy) }
      }
      .task(id: fields.key) {
        await fields.refresh()
        if !Task.isCancelled, let quote = fields.quote {
          amount = String(quote.amountTotal)
          deposit = String(quote.deposit)
        }
      }
      .sheet(isPresented: $choosingCustomer) { CustomerPicker(selected: $existingCustomer) }
    }
  }
  private func save() async {
    busy = true
    error = nil
    var body: [String: JSONValue] = [
      "vehicleId": .string(fields.vehicleId), "startAt": .string(fields.pickup.ISO8601Format()),
      "endAt": .string(fields.returning.ISO8601Format()), "status": .string(status),
      "notes": .string(notes),
    ]
    if let customer = customer ?? existingCustomer {
      body["customerId"] = .string(customer.id)
    } else {
      body["customer"] = .object([
        "fullName": .string(name), "phone": .string(phone), "city": .string(city),
      ])
    }
    if overridePrice {
      guard let value = Double(amount), value >= 0 else {
        error = "Enter a valid rental total."
        busy = false
        return
      }
      body["amountTotal"] = .number(value)
    }
    if overrideDeposit {
      guard let value = Double(deposit), value >= 0 else {
        error = "Enter a valid deposit."
        busy = false
        return
      }
      body["deposit"] = .number(value)
    }
    do {
      let result = try await OpsAPI.shared.mutate("bookings", body: body)
      createdId = result.bookingId
      UINotificationFeedbackGenerator().notificationOccurred(.success)
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
