import SwiftUI

struct EditBookingSheet: View {
  let detail: BookingDetail
  var focus: String = "dates"
  @Environment(\.dismiss) private var dismiss
  @State private var fields: BookingFieldsModel
  @State private var customer: CustomerRow?
  @State private var choosingCustomer = false
  @State private var amount: String
  @State private var deposit: String
  @State private var notes: String
  @State private var keepOld = false
  @State private var hasRequoted = false
  @FocusState private var activeField: String?
  @State private var busy = false
  @State private var error: String?
  init(detail: BookingDetail, focus: String = "dates") {
    self.detail = detail
    self.focus = focus
    _fields = State(initialValue: BookingFieldsModel(detail: detail))
    _amount = State(initialValue: String(detail.amountTotal))
    _deposit = State(initialValue: String(detail.depositRequired ?? detail.deposit))
    _notes = State(initialValue: detail.notes ?? "")
  }
  private var tripChanged: Bool {
    fields.pickup != detail.startAt.bookingMinute || fields.returning != detail.endAt.bookingMinute
      || fields.vehicleId != (detail.vehicleId ?? "")
  }
  var body: some View {
    @Bindable var fields = fields
    NavigationStack {
      ScrollViewReader { proxy in
        Form {
          Section("Trip") { DateRangeRow(start: $fields.start, end: $fields.end) }.id("dates")
          Section("Vehicle") {
            Picker("Vehicle", selection: $fields.vehicleId) {
              Text("Choose vehicle").tag("")
              ForEach(fields.vehicles) { Text($0.label).tag($0.id) }
            }
            if fields.loading { ProgressView("Checking availability and price") }
          }.id("vehicle")
          Section("Customer") {
            Button(customer?.fullName ?? detail.customerName) { choosingCustomer = true }
          }.id("customer")
          Section("Money") {
            if tripChanged, let quote = fields.quote, quote.amountTotal != detail.amountTotal {
              DiffBanner(old: detail.amountTotal, new: quote.amountTotal, keepOld: $keepOld)
            }
            TextField("Rental amount", text: $amount).keyboardType(.decimalPad).focused(
              $activeField, equals: "money")
            TextField("Deposit", text: $deposit).keyboardType(.decimalPad)
            Text("You can enter an agreed price after reviewing the new quote.").font(.caption)
              .foregroundStyle(Theme.muted)
          }.id("money")
          Section("Notes") {
            TextField("Booking notes", text: $notes, axis: .vertical).focused(
              $activeField, equals: "notes")
          }.id("notes")
          MutationError(message: error ?? fields.error)
        }.onAppear {
          proxy.scrollTo(focus, anchor: .top)
          if ["money", "notes"].contains(focus) { activeField = focus }
        }
      }.navigationTitle("Edit booking").navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") { dismiss() }.disabled(busy)
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Save") { Task { await save() } }.disabled(
              busy || fields.loading || fields.returning <= fields.pickup
                || (tripChanged && fields.quote == nil))
          }
        }
        .task(id: fields.key) {
          await fields.refresh()
          if !Task.isCancelled, tripChanged || hasRequoted, let quote = fields.quote {
            hasRequoted = true
            amount = String(keepOld ? detail.amountTotal : quote.amountTotal)
          }
        }
        .onChange(of: keepOld) { _, value in
          amount = String(
            value ? detail.amountTotal : (fields.quote?.amountTotal ?? detail.amountTotal))
        }
        .sheet(isPresented: $choosingCustomer) { CustomerPicker(selected: $customer) }
        .disabled(busy)
    }
  }
  private func save() async {
    guard let amount = Double(amount), amount.isFinite, amount >= 0, let deposit = Double(deposit),
      deposit.isFinite, deposit >= 0
    else {
      error = "Enter valid rental and deposit amounts."
      return
    }
    var patch: [String: JSONValue] = [:]
    if tripChanged && fields.pickup != detail.startAt {
      patch["startAt"] = .string(fields.pickup.ISO8601Format())
    }
    if tripChanged && fields.returning != detail.endAt {
      patch["endAt"] = .string(fields.returning.ISO8601Format())
    }
    if fields.vehicleId != (detail.vehicleId ?? ""), !fields.vehicleId.isEmpty {
      patch["vehicleId"] = .string(fields.vehicleId)
    }
    if let customer, customer.id != detail.customerId { patch["customerId"] = .string(customer.id) }
    if amount != detail.amountTotal { patch["amountTotal"] = .number(amount) }
    if deposit != (detail.depositRequired ?? detail.deposit) { patch["deposit"] = .number(deposit) }
    if notes != (detail.notes ?? "") { patch["notes"] = .string(notes) }
    guard !patch.isEmpty else {
      dismiss()
      return
    }
    busy = true
    error = nil
    do {
      try await OpsAPI.shared.updateBooking(detail.id, fields: patch)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      dismiss()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
/// Loads a fresh detail before editing from a list swipe.
struct BookingEditor: View {
  let id: String
  @State private var model = ScreenModel<BookingDetail>()
  @Environment(\.dismiss) private var dismiss
  var body: some View {
    Group {
      if let detail = model.value {
        EditBookingSheet(detail: detail)
      } else {
        NavigationStack {
          Group {
            if let error = model.error {
              ErrorState(message: error) { Task { await load() } }
            } else {
              ProgressView()
            }
          }.toolbar { Button("Close") { dismiss() } }
        }
      }
    }.task { await load() }
  }
  private func load() async { await model.load("bookings/\(id)") }
}
