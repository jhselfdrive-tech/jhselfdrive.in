import SwiftUI

struct PaymentForm: View {
  let bookingId: String
  var editing: LedgerEntry? = nil
  @Environment(\.dismiss) private var dismiss
  @Environment(SessionModel.self) private var session
  @State private var kind = "rental"
  @State private var method = "cash"
  @State private var amount = ""
  @State private var note = ""
  @State private var busy = false
  @State private var error: String?
  @State private var queued: QueuedMessage?
  var body: some View {
    NavigationStack {
      Form {
        Picker("Kind", selection: $kind) {
          ForEach(session.meta?.paymentKinds ?? [], id: \.id) { Text($0.label).tag($0.id) }
        }
        TextField("Amount in INR", text: $amount).keyboardType(.decimalPad)
        Picker("Method", selection: $method) {
          ForEach(session.meta?.paymentMethods ?? [], id: \.id) { Text($0.label).tag($0.id) }
        }
        TextField("Note", text: $note, axis: .vertical)
        MutationError(message: error)
        Button {
          Task { await save() }
        } label: {
          if busy {
            ProgressView()
          } else {
            Text(editing == nil ? "Record payment" : "Save payment")
          }
        }.disabled(busy || (Double(amount) ?? 0) <= 0)
      }.navigationTitle(editing == nil ? "Payment" : "Edit payment").onAppear {
        if let editing {
          kind = editing.kind
          method = editing.method
          amount = String(editing.amount)
          note = editing.note ?? ""
        }
      }.toolbar { Button("Cancel") { dismiss() }.disabled(busy) }
        .sheet(item: $queued, onDismiss: { dismiss() }) { message in
          MessagePromptView(message: message) { queued = nil }
        }
    }
  }
  private func save() async {
    guard let amount = Double(amount), amount > 0 else { return }
    busy = true
    error = nil
    do {
      let fields: [String: JSONValue] = [
        "kind": .string(kind), "method": .string(method), "amount": .number(amount),
        "note": .string(note),
      ]
      let result: Ack
      if let editing {
        result = try await OpsAPI.shared.updatePayment(editing.id, fields: fields)
      } else {
        result = try await OpsAPI.shared.mutate("bookings/\(bookingId)/payments", body: fields)
      }
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      if let message = result.queuedMessage { queued = message } else { dismiss() }
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
struct AssignmentView: View {
  let detail: BookingDetail
  @Environment(\.dismiss) private var dismiss
  @State private var model = ScreenModel<AvailableResponse>()
  @State private var busy = false
  @State private var error: String?
  var body: some View {
    NavigationStack {
      List {
        if let values = model.value?.vehicles {
          if values.isEmpty {
            ContentUnavailableView(
              "No available vehicles", systemImage: "car.2",
              description: Text("All vehicles are reserved or blocked for these dates."))
          }
          ForEach(values) { vehicle in
            Button(vehicle.label) { Task { await assign(vehicle.id) } }.disabled(busy)
          }
        } else if let error = model.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
        if busy { ProgressView() }
        MutationError(message: error)
      }.navigationTitle("Assign vehicle").toolbar { Button("Close") { dismiss() } }.opsRefresh {
        await load()
      }
    }
  }
  private func load() async {
    var query = [
      URLQueryItem(name: "startAt", value: detail.startAt.ISO8601Format()),
      .init(name: "endAt", value: detail.endAt.ISO8601Format()),
      .init(name: "excludeBookingId", value: detail.id),
    ]
    if let slug = detail.carSlug { query.append(.init(name: "categorySlug", value: slug)) }
    await model.load("vehicles/available", query: query)
  }
  private func assign(_ id: String) async {
    busy = true
    error = nil
    do {
      _ = try await OpsAPI.shared.mutate(
        "bookings/\(detail.id)/vehicle", body: ["vehicleId": .string(id)])
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      dismiss()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
struct HandoverForm: View {
  let detail: BookingDetail
  let phase: String
  var onSaved: (() -> Void)? = nil
  @Environment(\.dismiss) private var dismiss
  @State private var odometer = ""
  @State private var fuel = -1
  @State private var payment = ""
  @State private var deposit = ""
  @State private var damage = ""
  @State private var notes = ""
  @State private var received = false
  @State private var busy = false
  @State private var error: String?
  @State private var queued: QueuedMessage?
  var body: some View {
    NavigationStack {
      Form {
        Section("Vehicle condition") {
          TextField("Odometer in km", text: $odometer).keyboardType(.numberPad)
          if let previous = detail.previousOdometerKm, let entered = Int(odometer),
            entered < previous
          {
            Label(
              "Entered odometer is \(previous-entered) km below the previous reading.",
              systemImage: "exclamationmark.triangle"
            ).foregroundStyle(.orange)
          }
          Picker("Fuel", selection: $fuel) {
            Text("Not recorded").tag(-1)
            ForEach(0...8, id: \.self) {
              Text($0 == 0 ? "Empty" : $0 == 8 ? "Full" : "\($0)/8").tag($0)
            }
          }
          TextField("Damage notes", text: $damage, axis: .vertical)
          TextField("Notes", text: $notes, axis: .vertical)
        }
        Section("Money collected at handover") {
          Toggle("Payment received", isOn: $received)
          TextField("Rental amount", text: $payment).keyboardType(.decimalPad)
          TextField("Deposit amount", text: $deposit).keyboardType(.decimalPad)
        }
        Section {
          MutationError(message: error)
          Button {
            Task { await save() }
          } label: {
            if busy { ProgressView() } else { Text("Save checklist") }
          }.disabled(busy)
        }
      }.navigationTitle("\(phase.capitalized) checklist").toolbar {
        Button("Close") { dismiss() }.disabled(busy)
      }
      .onAppear {
        if let h = detail.handovers?.first(where: { $0.phase == phase }) {
          odometer = h.odometerKm.map(String.init) ?? ""
          fuel = h.fuelEighths ?? -1
          received = h.paymentReceived
          payment = String(h.paymentAmount)
          deposit = String(h.depositAmount)
          damage = h.damageNotes ?? ""
          notes = h.notes ?? ""
        }
      }
      .sheet(item: $queued, onDismiss: { dismiss() }) { message in
        MessagePromptView(message: message) { queued = nil }
      }
    }
  }
  private func save() async {
    guard odometer.isEmpty || (Int(odometer) ?? -1) >= 0,
      payment.isEmpty || (Double(payment) ?? -1) >= 0,
      deposit.isEmpty || (Double(deposit) ?? -1) >= 0
    else {
      error = "Enter valid non-negative readings and amounts."
      return
    }
    busy = true
    error = nil
    var body: [String: JSONValue] = [
      "phase": .string(phase), "paymentReceived": .bool(received),
      "paymentAmount": .number(Double(payment) ?? 0),
      "depositAmount": .number(Double(deposit) ?? 0), "damageNotes": .string(damage),
      "notes": .string(notes),
    ]
    if let value = Double(odometer) { body["odometerKm"] = .number(value) }
    if fuel >= 0 { body["fuelEighths"] = .number(Double(fuel)) }
    do {
      let result = try await OpsAPI.shared.mutate("bookings/\(detail.id)/handover", body: body)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      if let onSaved {
        onSaved()
        dismiss()
      } else if let message = result.queuedMessage {
        queued = message
      } else {
        dismiss()
      }
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
