import SwiftUI
import UniformTypeIdentifiers
struct VehicleForm: View {
    var vehicle: Vehicle? = nil
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionModel.self) private var session
    @State private var registration = ""
    @State private var name = ""
    @State private var category = ""
    @State private var model = ""
    @State private var year = ""
    @State private var transmission = ""
    @State private var fuel = ""
    @State private var seats = ""
    @State private var status = "active"
    @State private var odometer = ""
    @State private var acquired = ""
    @State private var notes = ""
    @State private var rate = ""
    @State private var kmRate = ""
    @State private var includedKm = ""
    @State private var deposit = ""
    @State private var tagline = ""
    @State private var description = ""
    @State private var bookable = true
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack { Form {
            Section("Identity") {
                TextField("Registration number",text:$registration).textInputAutocapitalization(.characters)
                TextField("Display name",text:$name)
                Picker("Category",selection:$category) { Text("Choose category").tag(""); ForEach(session.meta?.categories ?? []) { Text($0.label).tag($0.id) } }
                TextField("Model",text:$model); TextField("Year",text:$year).keyboardType(.numberPad)
                Picker("Status",selection:$status) { ForEach(["active","maintenance","retired","sold"],id:\.self) { Text($0.capitalized).tag($0) } }
                Toggle("Bookable on website",isOn:$bookable)
            }
            Section("Specifications") { TextField("Transmission",text:$transmission); TextField("Fuel",text:$fuel); TextField("Seats",text:$seats).keyboardType(.numberPad); TextField("Odometer in km",text:$odometer).keyboardType(.numberPad); TextField("Acquired on (YYYY-MM-DD)",text:$acquired) }
            Section("Rates") { TextField("Daily rate",text:$rate).keyboardType(.decimalPad); TextField("Deposit",text:$deposit).keyboardType(.decimalPad); TextField("Extra km rate",text:$kmRate).keyboardType(.decimalPad); TextField("Included km per day",text:$includedKm).keyboardType(.numberPad) }
            Section("Website and operator notes") { TextField("Tagline",text:$tagline,axis:.vertical); TextField("Description",text:$description,axis:.vertical); TextField("Notes",text:$notes,axis:.vertical) }
            Section { MutationError(message:error); Button { Task { await save() } } label: { if busy { ProgressView() } else { Text("Save vehicle") } }.disabled(busy || registration.isEmpty || category.isEmpty) }
        }.navigationTitle(vehicle == nil ? "Add vehicle" : "Edit vehicle").toolbar { Button("Close") { dismiss() }.disabled(busy) }.onAppear { populate() } }
    }
    private func populate() {
        guard let v = vehicle else { return }; registration = v.registrationNumber; name = v.displayName ?? ""; category = v.categorySlug; model = v.model ?? ""; year = v.year.map(String.init) ?? ""; transmission = v.transmission ?? ""; fuel = v.fuel ?? ""; seats = v.seats.map(String.init) ?? ""; status = v.status; odometer = v.odometerKm.map(String.init) ?? ""; acquired = v.acquiredOn ?? ""; notes = v.notes ?? ""; rate = String(v.dayRate); kmRate = v.kmRate.map { String($0) } ?? ""; includedKm = v.includedKmPerDay.map(String.init) ?? ""; deposit = String(v.deposit); tagline = v.tagline ?? ""; description = v.description ?? ""; bookable = v.isBookable
    }
    private func save() async {
        guard let rate = Double(rate),rate>=0,let deposit = Double(deposit),deposit>=0 else { error = "Enter a valid daily rate and deposit."; return }
        var body: [String:JSONValue] = ["registrationNumber":.string(registration),"displayName":.string(name),"categorySlug":.string(category),"model":.string(model),"transmission":.string(transmission),"fuel":.string(fuel),"status":.string(status),"acquiredOn":.string(acquired),"notes":.string(notes),"dayRate":.number(rate),"deposit":.number(deposit),"tagline":.string(tagline),"description":.string(description),"isBookable":.bool(bookable)]
        for (key,text) in [("year",year),("seats",seats),("odometerKm",odometer),("kmRate",kmRate),("includedKmPerDay",includedKm)] { if text.isEmpty { if vehicle != nil { body[key] = .null }; continue }; guard let value = Double(text),value>=0 else { error = "Enter valid numeric vehicle details."; return }; body[key] = .number(value) }
        busy = true; error = nil
        do { _ = try await OpsAPI.shared.mutate(vehicle.map { "vehicles/\($0.id)" } ?? "vehicles",method:vehicle == nil ? "POST" : "PATCH",body:body); UINotificationFeedbackGenerator().notificationOccurred(.success); dismiss() }
        catch { self.error = error.localizedDescription }; busy = false
    }
}
struct VehicleBlockForm: View {
    let vehicleId: String
    @Environment(\.dismiss) private var dismiss
    @State private var start = Date()
    @State private var end = Date().addingTimeInterval(86400)
    @State private var reason = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View { NavigationStack { Form { DatePicker("Starts",selection:$start); DatePicker("Ends",selection:$end); TextField("Reason",text:$reason,axis:.vertical); MutationError(message:error); Button { Task { await save() } } label: { if busy { ProgressView() } else { Text("Add block") } }.disabled(busy || end<=start || reason.count<3) }.navigationTitle("Availability block").toolbar { Button("Close") { dismiss() } } } }
    private func save() async { busy = true; error = nil; do { _ = try await OpsAPI.shared.mutate("vehicles/\(vehicleId)/blocks",body:["startAt":.string(start.ISO8601Format()),"endAt":.string(end.ISO8601Format()),"reason":.string(reason)]); UINotificationFeedbackGenerator().notificationOccurred(.success); dismiss() } catch { self.error = error.localizedDescription }; busy = false }
}
struct VehicleDocumentForm: View {
    let vehicleId: String
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionModel.self) private var session
    @State private var type = "insurance"
    @State private var provider = ""
    @State private var reference = ""
    @State private var issued = ""
    @State private var expires = ""
    @State private var notes = ""
    @State private var filename = ""
    @State private var mime = ""
    @State private var data: Data?
    @State private var choosing = false
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack { Form {
            Picker("Document type",selection:$type) { ForEach(session.meta?.documentTypes ?? []) { Text($0.label.capitalized).tag($0.id) } }
            TextField("Provider",text:$provider); TextField("Reference",text:$reference); TextField("Issued (YYYY-MM-DD, optional)",text:$issued); TextField("Expires (YYYY-MM-DD)",text:$expires); TextField("Notes",text:$notes,axis:.vertical)
            Button(filename.isEmpty ? "Choose PDF or image" : filename) { choosing = true }
            Text("Files must be under 4 MB. Use the web panel for larger files.").font(.caption).foregroundStyle(.secondary)
            MutationError(message:error)
            Button { Task { await save() } } label: { if busy { ProgressView() } else { Text("Upload document") } }.disabled(busy || data == nil || expires.isEmpty)
        }.navigationTitle("Vehicle document").toolbar { Button("Close") { dismiss() }.disabled(busy) }
            .fileImporter(isPresented:$choosing,allowedContentTypes:[.pdf,.image]) { result in
                Task { do {
                    let url = try result.get(); let access = url.startAccessingSecurityScopedResource(); defer { if access { url.stopAccessingSecurityScopedResource() } }
                    let bytes = try Data(contentsOf:url)
                    if url.pathExtension.lowercased() == "pdf" { guard bytes.count<=4_000_000 else { throw OpsError(message:"This PDF exceeds 4 MB. Use the web panel for larger files.") }; data = bytes; mime = "application/pdf"; filename = url.lastPathComponent }
                    else { data = try await Task.detached(priority:.userInitiated) { try prepareJPEG(bytes) }.value; mime = "image/jpeg"; filename = "document.jpg" }
                    error = nil
                } catch { self.error = error.localizedDescription; data = nil } }
            }
        }
    }
    private func save() async { guard let data else { return }; busy = true; error = nil
        do { _ = try await OpsAPI.shared.upload("vehicles/\(vehicleId)/documents",data:data,filename:filename,mime:mime,fields:["docType":type,"provider":provider,"referenceNumber":reference,"issuedOn":issued,"expiresOn":expires,"notes":notes]); UINotificationFeedbackGenerator().notificationOccurred(.success); dismiss() }
        catch { self.error = error.localizedDescription }; busy = false
    }
}
