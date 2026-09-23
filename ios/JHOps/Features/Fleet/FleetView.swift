import SwiftUI
struct FleetView: View {
    @State private var model = ScreenModel<FleetResponse>()
    @State private var creating = false
    var body: some View {
        ScrollView {
            if let vehicles = model.value?.vehicles {
                LazyVGrid(columns:[GridItem(.flexible()),GridItem(.flexible())],spacing:12) {
                    ForEach(vehicles) { vehicle in NavigationLink(value:Route.vehicle(vehicle.id)) {
                        SectionCard { VStack(alignment:.leading,spacing:8) {
                            AsyncImage(url:vehicle.photoUrl.flatMap(URL.init(string:))) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName:"car.side.fill").font(.largeTitle).foregroundStyle(Theme.sand).frame(maxWidth:.infinity,minHeight:80) }
                            Text(vehicle.label).font(.headline).foregroundStyle(Theme.ink)
                            Text(vehicle.registrationNumber).font(.caption).foregroundStyle(Theme.muted)
                            StatusChip(status:vehicle.status == "active" ? "approved" : "requested",label:vehicle.status.capitalized)
                            if let booking = vehicle.currentBooking { Text("Out with \(booking.customerName)").font(.caption) }
                            if let count = vehicle.alertCount,count>0 { Label("\(count) alerts",systemImage:"exclamationmark.triangle").font(.caption).foregroundStyle(.orange) }
                            MoneyText(value:vehicle.dayRate).font(.subheadline)
                        } }
                    } }
                }.padding()
                if vehicles.isEmpty { ContentUnavailableView("No vehicles yet",systemImage:"car.2",description:Text("Add your first vehicle using +.")) }
                CacheFooter(error:model.error,date:model.updatedAt).padding()
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } }
            else { VStack { LoadingList() }.padding() }
        }.background(Theme.paper).navigationTitle("Fleet").toolbar { Button("Add vehicle",systemImage:"plus") { creating = true } }.sheet(isPresented:$creating) { VehicleForm() }.opsRefresh { await load() }
    }
    private func load() async { await model.load("vehicles",cache:"fleet") }
}
struct VehicleDetailView: View {
    let vehicleId: String
    @Environment(\.dismiss) private var dismiss
    @State private var model = ScreenModel<VehicleDetail>()
    @State private var sheet: Sheet?
    @State private var error: String?
    @State private var deleting = false
    @State private var busy = false
    @State private var photoToDelete: String?
    private enum Sheet: String,Identifiable { case edit,document,block,photos; var id: String { rawValue } }
    var body: some View {
        List {
            if let d = model.value {
                Section("Specs") {
                    Text(d.vehicle.label).font(.system(.title2,design:.serif))
                    LabeledContent("Registration",value:d.vehicle.registrationNumber); LabeledContent("Status",value:d.vehicle.status.capitalized)
                    LabeledContent("Model",value:d.vehicle.model ?? "—"); LabeledContent("Seats",value:d.vehicle.seats.map(String.init) ?? "—")
                    LabeledContent("Fuel",value:d.vehicle.fuel ?? "—"); LabeledContent("Transmission",value:d.vehicle.transmission ?? "—")
                    HStack { Text("Daily rate"); Spacer(); MoneyText(value:d.vehicle.dayRate) }
                    HStack { Text("Deposit"); Spacer(); MoneyText(value:d.vehicle.deposit) }
                    LabeledContent("Odometer",value:d.vehicle.odometerKm.map { "\($0) km" } ?? "—")
                    LabeledContent("90-day utilisation",value:"\(Int(d.utilisation))%")
                    Button("Edit vehicle") { sheet = .edit }
                }
                Section("Documents") {
                    ForEach(d.documents) { document in VStack(alignment:.leading,spacing:4) { Text(document.docType.replacingOccurrences(of:"_",with:" ").capitalized).font(.headline); Text("Expires \(document.expiresOn)").font(.caption); if let value = document.url,let url = URL(string:value) { Link("View document",destination:url) } } }
                    Button("Add document") { sheet = .document }
                }
                Section("Availability blocks") { ForEach(d.blocks) { block in VStack(alignment:.leading) { Text(block.reason); Text("\(block.startAt.formatted()) – \(block.endAt.formatted())").font(.caption).foregroundStyle(.secondary) } }; Button("Add block") { sheet = .block } }
                Section("Photos — first photo is the cover") {
                    ForEach(d.photos) { photo in HStack {
                        AsyncImage(url:photo.url.flatMap(URL.init(string:))) { image in image.resizable().scaledToFit() } placeholder:{ Image(systemName:"photo") }.frame(height:100)
                        Spacer()
                        if d.photos.first?.id != photo.id { Button("Make cover") { Task { await reorder(photo.id) } } }
                        Button("Delete",role:.destructive) { photoToDelete = photo.id }
                    }.buttonStyle(.borderless) }.onMove { source,destination in var ids = d.photos.map(\.id); ids.move(fromOffsets:source,toOffset:destination); Task { await saveOrder(ids) } }
                    Button("Add photos") { sheet = .photos }
                }
                Section("History") { ForEach(d.bookings) { b in NavigationLink(value:Route.booking(b.id)) { BookingRowView(booking:b) } } }
                Section { Button("Delete vehicle",role:.destructive) { deleting = true } }
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
            MutationError(message:error ?? model.error); if busy { ProgressView() }
        }.disabled(busy).navigationTitle(model.value?.vehicle.registrationNumber ?? "Vehicle")
            .toolbar { EditButton() }
            .opsRefresh { await load() }
            .sheet(item:$sheet,onDismiss:{ Task { await load() } }) { s in
                switch s { case .edit:VehicleForm(vehicle:model.value?.vehicle); case .document:VehicleDocumentForm(vehicleId:vehicleId); case .block:VehicleBlockForm(vehicleId:vehicleId); case .photos:MediaUploadView(vehicleId:vehicleId) }
            }
            .alert("Delete vehicle?",isPresented:$deleting) { Button("Cancel",role:.cancel) {}; Button("Delete",role:.destructive) { Task { await removeVehicle() } } } message: { Text("Vehicles with booking history cannot be deleted. You can retire them instead.") }
            .alert("Delete photo?",isPresented:Binding(get:{ photoToDelete != nil },set:{ if !$0 { photoToDelete = nil } })) { Button("Cancel",role:.cancel) { photoToDelete = nil }; Button("Delete",role:.destructive) { if let id = photoToDelete { photoToDelete = nil; Task { await removePhoto(id) } } } }
    }
    private func load() async { await model.load("vehicles/\(vehicleId)") }
    private func removeVehicle() async { busy = true; do { _ = try await OpsAPI.shared.mutate("vehicles/\(vehicleId)",method:"DELETE"); dismiss() } catch { self.error = error.localizedDescription }; busy = false }
    private func removePhoto(_ id: String) async { busy = true; do { _ = try await OpsAPI.shared.mutate("vehicles/photos/\(id)",method:"DELETE"); await load() } catch { self.error = error.localizedDescription }; busy = false }
    private func saveOrder(_ ids: [String]) async { busy = true; do { _ = try await OpsAPI.shared.mutate("vehicles/\(vehicleId)/photos/reorder",body:["orderedIds":.array(ids.map(JSONValue.string))]); await load() } catch { self.error = error.localizedDescription }; busy = false }
    private func reorder(_ id: String) async { guard let photos = model.value?.photos else { return }; busy = true; do { _ = try await OpsAPI.shared.mutate("vehicles/\(vehicleId)/photos/reorder",body:["orderedIds":.array(([id]+photos.map(\.id).filter { $0 != id }).map(JSONValue.string))]); await load() } catch { self.error = error.localizedDescription }; busy = false }
}
