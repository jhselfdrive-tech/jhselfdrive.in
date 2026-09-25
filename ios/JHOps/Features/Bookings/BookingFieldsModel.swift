import SwiftUI

@Observable @MainActor final class BookingFieldsModel {
  var start: Date
  var end: Date
  var vehicleId: String
  var vehicles: [AvailableVehicle] = []
  private var fetchedQuote: Quote?
  private var quotedKey: String?
  var quote: Quote? { quotedKey == key ? fetchedQuote : nil }
  var loading = false
  var error: String?
  private let excludeBookingId: String?
  private let currentVehicle: AvailableVehicle?
  init(detail: BookingDetail? = nil) {
    let now = Date().bookingMinute
    start = detail?.startAt ?? now
    end = detail?.endAt ?? now.addingTimeInterval(86400)
    vehicleId = detail?.vehicleId ?? ""
    excludeBookingId = detail?.id
    if let detail, let id = detail.vehicleId {
      currentVehicle = AvailableVehicle(
        id: id, registrationNumber: detail.vehicleLabel ?? detail.carLabel,
        displayName: "Current vehicle",
        categorySlug: detail.carSlug ?? "", model: nil, seats: nil)
    } else {
      currentVehicle = nil
    }
  }
  var pickup: Date { start.bookingMinute }
  var returning: Date { end.bookingMinute }
  var rangeKey: String { "\(pickup.timeIntervalSince1970):\(returning.timeIntervalSince1970)" }
  var key: String { "\(rangeKey):\(vehicleId)" }
  /// A single cancellable task owns availability and quote, preventing stale prices.
  func refresh() async {
    let requestedKey = key
    fetchedQuote = nil
    quotedKey = nil
    error = nil
    loading = true
    defer { if key == requestedKey && !Task.isCancelled { loading = false } }
    guard returning > pickup else {
      vehicles = []
      error = "Return must be after pickup."
      return
    }
    do {
      var query = [
        URLQueryItem(name: "startAt", value: pickup.ISO8601Format()),
        .init(name: "endAt", value: returning.ISO8601Format()),
      ]
      if let excludeBookingId {
        query.append(.init(name: "excludeBookingId", value: excludeBookingId))
      }
      let available = try await OpsAPI.shared.read(
        "vehicles/available", query: query, as: AvailableResponse.self)
      guard !Task.isCancelled && requestedKey == key else { return }
      vehicles = available.vehicles
      // Retain the current assignment for context; the server still rejects clashes.
      if let currentVehicle, !vehicles.contains(where: { $0.id == currentVehicle.id }) {
        vehicles.insert(currentVehicle, at: 0)
      }
      if !vehicleId.isEmpty && !vehicles.contains(where: { $0.id == vehicleId }) {
        vehicleId = ""
        return
      }
      guard !vehicleId.isEmpty else { return }
      let result = try await OpsAPI.shared.send(
        "api/ops/quote", method: "POST",
        body: [
          "vehicleId": vehicleId, "startAt": pickup.ISO8601Format(),
          "endAt": returning.ISO8601Format(),
        ], as: Quote.self)
      guard !Task.isCancelled && requestedKey == key else { return }
      fetchedQuote = result
      quotedKey = requestedKey
    } catch {
      if !Task.isCancelled && requestedKey == key { self.error = error.localizedDescription }
    }
  }
}
struct CustomerPicker: View {
  @Binding var selected: CustomerRow?
  @Environment(\.dismiss) private var dismiss
  @State private var search = ""
  @State private var model = ScreenModel<CustomersResponse>()
  var body: some View {
    NavigationStack {
      List {
        if let customers = model.value?.customers {
          ForEach(customers) { customer in
            Button {
              selected = customer
              dismiss()
            } label: {
              VStack(alignment: .leading) {
                Text(customer.fullName ?? "Customer")
                Text(customer.phone).font(.caption).foregroundStyle(Theme.muted)
              }
            }
          }
          if customers.isEmpty { EmptyState(title: "No customers found") }
        } else if let error = model.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
      }.navigationTitle("Choose customer").searchable(text: $search).toolbar {
        Button("Close") { dismiss() }
      }.task(id: search) {
        try? await Task.sleep(for: .milliseconds(250))
        if !Task.isCancelled { await load() }
      }
    }
  }
  private func load() async {
    await model.load("customers", query: [.init(name: "search", value: search)])
  }
}
