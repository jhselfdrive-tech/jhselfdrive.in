import SwiftUI

struct FleetView: View {
  @State private var model = ScreenModel<FleetResponse>()
  @State private var creating = false
  @Environment(\.dynamicTypeSize) private var typeSize
  var body: some View {
    ScrollView {
      if let vehicles = model.value?.vehicles {
        LazyVGrid(
          columns: [GridItem(.adaptive(minimum: typeSize.isAccessibilitySize ? 300 : 160))],
          spacing: 12
        ) {
          ForEach(vehicles) { vehicle in
            NavigationLink(value: Route.vehicle(vehicle.id)) {
              Card {
                VStack(alignment: .leading, spacing: 8) {
                  AsyncImage(url: vehicle.photoUrl.flatMap(URL.init(string:))) { image in
                    image.resizable().scaledToFit()
                  } placeholder: {
                    Image(systemName: "car.side.fill").font(.largeTitle).foregroundStyle(Theme.sand)
                      .frame(maxWidth: .infinity, minHeight: 80)
                  }
                  Text(vehicle.label).font(.system(.headline, design: .rounded)).foregroundStyle(
                    Theme.ink)
                  Text(vehicle.registrationNumber).font(.caption).foregroundStyle(Theme.muted)
                  StatusBadge(
                    status: vehicle.status == "active" ? "approved" : "requested",
                    label: vehicle.status.capitalized)
                  if let booking = vehicle.currentBooking {
                    Text("Out with \(booking.customerName)").font(.caption)
                    if let end = booking.endAt {
                      Text("Back \(end.formatted(.dateTime.weekday(.abbreviated).hour().minute()))")
                        .font(.caption).foregroundStyle(Theme.muted)
                    }
                  } else {
                    Text(vehicle.status == "active" ? "Available" : vehicle.status.capitalized)
                      .font(.caption).foregroundStyle(Theme.teal)
                  }
                  if let count = vehicle.alertCount, count > 0 {
                    Label("\(count) expiring documents", systemImage: "exclamationmark.triangle")
                      .font(.caption).foregroundStyle(.red)
                  }
                  HStack {
                    MoneyText(value: vehicle.dayRate)
                    Text("/ day").foregroundStyle(Theme.muted)
                  }.font(.subheadline)
                }
              }
            }.buttonStyle(.plain)
          }
        }.padding()
        if vehicles.isEmpty {
          EmptyState(
            title: "No vehicles yet", symbol: "car.2",
            message: "Add your first vehicle using Add vehicle.")
        }
        CacheFooter(error: model.error, date: model.updatedAt).padding()
      } else if let error = model.error {
        ErrorState(message: error) { Task { await load() } }
      } else {
        VStack { LoadingList() }.padding()
      }
    }.background(Theme.paper).navigationTitle("Fleet").toolbar {
      Button("Add vehicle") { creating = true }
    }.sheet(isPresented: $creating) { VehicleForm() }.opsRefresh { await load() }
  }
  private func load() async { await model.load("vehicles", cache: "fleet") }
}
struct VehicleDetailView: View {
  let vehicleId: String
  @Environment(\.dismiss) private var dismiss
  @State private var model = ScreenModel<VehicleDetail>()
  @State private var sheet: Sheet?
  @State private var editingBlock: VehicleBlock?
  @State private var editingDocument: VehicleDocument?
  @State private var error: String?
  @State private var deletion: Deletion?
  @State private var busy = false
  private enum Sheet: String, Identifiable {
    case edit, document, block, photos
    var id: String { rawValue }
  }
  private struct Deletion: Identifiable {
    let path: String
    let label: String
    var id: String { path }
  }
  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        if let d = model.value {
          Card {
            if !d.photos.isEmpty {
              TabView {
                ForEach(d.photos) { photo in
                  AsyncImage(url: photo.url.flatMap(URL.init(string:))) { image in
                    image.resizable().scaledToFit()
                  } placeholder: {
                    Image(systemName: "car.side")
                  }.padding(.bottom, 24)
                }
              }.tabViewStyle(.page).frame(height: 220)
            }
            Text(d.vehicle.label).font(Theme.Font.name)
            Text(d.vehicle.registrationNumber).font(.headline).monospaced()
            StatusBadge(
              status: d.vehicle.status == "active" ? "approved" : "requested",
              label: d.vehicle.status.capitalized)
            Button("Edit vehicle") { sheet = .edit }
          }
          Card("Availability", actionTitle: "Add block", action: { sheet = .block }) {
            let active = d.bookings.filter {
              ["approved", "confirmed", "ongoing"].contains($0.status) && $0.endAt > Date()
            }.sorted { $0.startAt < $1.startAt }
            if active.isEmpty {
              Label("Available", systemImage: "checkmark.circle").foregroundStyle(Theme.teal)
            }
            ForEach(Array(active.prefix(2))) { booking in
              NavigationLink(value: Route.booking(booking.id)) {
                VStack(alignment: .leading) {
                  Text(booking.startAt <= Date() ? "Current booking" : "Next booking").font(
                    Theme.Font.eyebrow)
                  BookingRowView(booking: booking)
                }
              }
            }
            ForEach(d.blocks.sorted { $0.startAt < $1.startAt }) { block in
              SwipeDeleteRow(action: {
                deletion = Deletion(path: "vehicles/blocks/\(block.id)", label: "block")
              }) {
                VStack(alignment: .leading, spacing: 8) {
                  Button {
                    editingBlock = block
                  } label: {
                    VStack(alignment: .leading, spacing: 5) {
                      Label(block.reason, systemImage: "pencil")
                      Text(
                        "\(block.startAt.formatted(date:.abbreviated,time:.shortened)) – \(block.endAt.formatted(date:.abbreviated,time:.shortened))"
                      ).font(.caption).foregroundStyle(Theme.muted)
                    }
                  }
                  Button("Delete block", role: .destructive) {
                    deletion = Deletion(path: "vehicles/blocks/\(block.id)", label: "block")
                  }.font(.caption)
                  Divider()
                }
              }
            }
          }
          Card("Documents", actionTitle: "Add", action: { sheet = .document }) {
            ForEach(d.documents.sorted { $0.expiresOn < $1.expiresOn }) { document in
              SwipeDeleteRow(action: {
                deletion = Deletion(path: "vehicles/documents/\(document.id)", label: "document")
              }) {
                VStack(alignment: .leading, spacing: 8) {
                  Button {
                    editingDocument = document
                  } label: {
                    HStack {
                      VStack(alignment: .leading, spacing: 4) {
                        Text(document.docType.replacingOccurrences(of: "_", with: " ").capitalized)
                          .font(.headline)
                        Text("Expires \(document.expiresOn)").font(.caption).foregroundStyle(
                          document.expiringSoon ? .red : Theme.muted)
                      }
                      Spacer()
                      Image(systemName: "pencil")
                    }
                  }
                  if let value = document.url, let url = URL(string: value) {
                    Link("View document", destination: url)
                  }
                  Button("Delete document", role: .destructive) {
                    deletion = Deletion(
                      path: "vehicles/documents/\(document.id)", label: "document")
                  }.font(.caption)
                  Divider()
                }
              }
            }
          }
          Card("Specs", collapsible: true) {
            LabeledContent("Model", value: d.vehicle.model ?? "—")
            LabeledContent("Seats", value: d.vehicle.seats.map(String.init) ?? "—")
            LabeledContent("Fuel", value: d.vehicle.fuel ?? "—")
            LabeledContent("Transmission", value: d.vehicle.transmission ?? "—")
            HStack {
              Text("Daily rate")
              Spacer()
              MoneyText(value: d.vehicle.dayRate)
            }
            HStack {
              Text("Deposit")
              Spacer()
              MoneyText(value: d.vehicle.deposit)
            }
            LabeledContent("Odometer", value: d.vehicle.odometerKm.map { "\($0) km" } ?? "—")
            LabeledContent("90-day utilisation", value: "\(Int(d.utilisation))%")
          }
          Card(
            "Manage photos", collapsible: true, expanded: false, actionTitle: "Add",
            action: { sheet = .photos }
          ) {
            ForEach(d.photos) { photo in
              HStack {
                AsyncImage(url: photo.url.flatMap(URL.init(string:))) { image in
                  image.resizable().scaledToFit()
                } placeholder: {
                  Image(systemName: "photo")
                }.frame(width: 90, height: 70)
                Spacer()
                Menu {
                  if d.photos.first?.id != photo.id {
                    Button("Make cover") { Task { await reorder(photo.id) } }
                  }
                  Button("Move earlier") { Task { await movePhoto(photo.id, by: -1) } }
                  Button("Move later") { Task { await movePhoto(photo.id, by: 1) } }
                  Button("Delete", role: .destructive) {
                    deletion = Deletion(path: "vehicles/photos/\(photo.id)", label: "photo")
                  }
                } label: {
                  Image(systemName: "ellipsis.circle").frame(width: 44, height: 44)
                }
              }
            }
          }
          Card("History", collapsible: true, expanded: false) {
            ForEach(d.bookings) { b in
              NavigationLink(value: Route.booking(b.id)) { BookingRowView(booking: b) }
            }
          }
          Button("Delete vehicle", role: .destructive) {
            deletion = Deletion(path: "vehicles/\(vehicleId)", label: "vehicle")
          }
        } else if let error = model.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
        MutationError(message: error ?? model.error)
        if busy { ProgressView() }
      }.padding().frame(maxWidth: 760).frame(maxWidth: .infinity)
    }.background(Theme.paper).disabled(busy).navigationTitle(
      model.value?.vehicle.registrationNumber ?? "Vehicle"
    ).navigationBarTitleDisplayMode(.inline)
      .opsRefresh { await load() }
      .sheet(item: $sheet, onDismiss: { Task { await load() } }) { s in
        switch s {
        case .edit: VehicleForm(vehicle: model.value?.vehicle)
        case .document: VehicleDocumentForm(vehicleId: vehicleId)
        case .block: VehicleBlockForm(vehicleId: vehicleId)
        case .photos: MediaUploadView(vehicleId: vehicleId)
        }
      }
      .sheet(item: $editingBlock) { VehicleBlockForm(vehicleId: vehicleId, editing: $0) }
      .sheet(item: $editingDocument) { VehicleDocumentForm(vehicleId: vehicleId, editing: $0) }
      .alert(
        "Delete \(deletion?.label ?? "item")?",
        isPresented: Binding(get: { deletion != nil }, set: { if !$0 { deletion = nil } })
      ) {
        Button("Cancel", role: .cancel) { deletion = nil }
        Button("Delete", role: .destructive) {
          if let deletion {
            self.deletion = nil
            Task { await remove(deletion) }
          }
        }
      } message: {
        Text("This cannot be undone. Vehicles with booking history must be retired instead.")
      }
  }
  private func load() async { await model.load("vehicles/\(vehicleId)") }
  private func remove(_ deletion: Deletion) async {
    busy = true
    error = nil
    do {
      if deletion.path.hasPrefix("vehicles/blocks/") {
        try await OpsAPI.shared.deleteBlock(String(deletion.path.split(separator: "/").last!))
      } else if deletion.path.hasPrefix("vehicles/documents/") {
        try await OpsAPI.shared.deleteDocument(String(deletion.path.split(separator: "/").last!))
      } else {
        _ = try await OpsAPI.shared.mutate(deletion.path, method: "DELETE")
      }
      if deletion.label == "vehicle" { dismiss() } else { await load() }
    } catch { self.error = error.localizedDescription }
    busy = false
  }
  private func saveOrder(_ ids: [String]) async {
    busy = true
    do {
      _ = try await OpsAPI.shared.mutate(
        "vehicles/\(vehicleId)/photos/reorder",
        body: ["orderedIds": .array(ids.map(JSONValue.string))])
      await load()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
  private func reorder(_ id: String) async {
    guard let photos = model.value?.photos else { return }
    await saveOrder([id] + photos.map(\.id).filter { $0 != id })
  }
  private func movePhoto(_ id: String, by offset: Int) async {
    guard var ids = model.value?.photos.map(\.id), let index = ids.firstIndex(of: id),
      ids.indices.contains(index + offset)
    else { return }
    ids.swapAt(index, index + offset)
    await saveOrder(ids)
  }
}
extension VehicleDocument {
  var expiringSoon: Bool {
    expiresOn <= Date().addingTimeInterval(30 * 86400).ISO8601Format().prefix(10)
  }
}
