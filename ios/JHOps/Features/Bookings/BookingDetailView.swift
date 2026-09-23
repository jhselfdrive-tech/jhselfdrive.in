import SwiftUI
import WidgetKit
struct BookingDetailView: View {
    let bookingId: String
    @Environment(SessionModel.self) private var session
    @State private var model = ScreenModel<BookingDetail>()
    @State private var busy = false
    @State private var error: String?
    @State private var queued: QueuedMessage?
    @State private var confirming: BookingAction?
    @State private var sheet: DetailSheet?
    @State private var note = ""
    @State private var revealURL: URL?
    private enum DetailSheet: String, Identifiable { case payment,assignment,delivery,returned,media; var id: String { rawValue } }
    var body: some View {
        Form {
            if let d = model.value {
                Section {
                    StatusChip(status:d.status,label:d.statusLabel)
                    LabeledContent("Customer",value:d.customerName)
                    if let id = d.customerId { NavigationLink("Customer profile",value:Route.customer(id)) }
                    LabeledContent("Car",value:d.vehicleLabel ?? d.carLabel)
                    LabeledContent("Pickup",value:d.startAt.formatted(date:.abbreviated,time:.shortened))
                    LabeledContent("Return",value:d.endAt.formatted(date:.abbreviated,time:.shortened))
                    if let notes = d.notes, !notes.isEmpty { Text(notes).font(.callout) }
                    if !d.phone.isEmpty {
                        Link("Open WhatsApp",destination:whatsappURL(phone:d.phone,text:""))
                        if let url = URL(string:"tel:\(d.phone.filter { $0.isNumber || $0 == "+" })") { Link("Call \(d.phone)",destination:url) }
                    }
                    Button("Assign vehicle") { sheet = .assignment }
                }
                Section("Money") {
                    money("Rental",d.amountTotal); money("Collected",d.collected); money("Balance",d.balance); money("Deposit collected",d.deposit)
                    LabeledContent("Deposit returned",value:d.depositReturned == true ? "Yes" : "No")
                    Button(d.depositReturned == true ? "Mark deposit as held" : "Return deposit") { confirming = BookingAction(to:"deposit",label:d.depositReturned == true ? "Mark deposit as held" : "Return deposit") }
                }
                Section("Payments") {
                    ForEach(d.payments) { payment in
                        VStack(alignment:.leading,spacing:4) {
                            HStack { Text(payment.kind.capitalized); Spacer(); MoneyText(value:payment.amount) }
                            Text("\(payment.method.uppercased()) · \(payment.receivedAt.formatted(date:.abbreviated,time:.shortened))").font(.caption).foregroundStyle(.secondary)
                            if let note = payment.note { Text(note).font(.caption) }
                        }.swipeActions { if payment.handoverId == nil { Button("Delete",role:.destructive) { confirming = BookingAction(to:"deletePayment:\(payment.id)",label:"Delete payment") } } }
                    }
                    Button("Record payment") { sheet = .payment }
                }
                Section("Handovers") {
                    ForEach(d.handovers ?? []) { h in
                        VStack(alignment:.leading) { Text(h.phase.capitalized).font(.headline); Text("Odometer: \(h.odometerKm.map(String.init) ?? "—") km · Fuel: \(h.fuelEighths.map(String.init) ?? "—")/8").font(.caption); if let notes = h.damageNotes, !notes.isEmpty { Text(notes) } }
                    }
                    Button("Delivery checklist") { sheet = .delivery }; Button("Return checklist") { sheet = .returned }
                    if let gaps = d.checklist?.gaps, !gaps.isEmpty { DisclosureGroup("\(gaps.count) checklist gaps") { ForEach(gaps,id:\.self) { Text($0).font(.caption) } } }
                }
                Section("Photos and licences") {
                    ForEach(d.media ?? []) { media in
                        VStack(alignment:.leading,spacing:8) {
                            Text("\(media.phase.capitalized) · \(media.mediaType.replacingOccurrences(of:"_",with:" "))").font(.caption)
                            if media.requiresReveal { Button("Reveal licence for 60 seconds") { Task { await reveal(media) } } }
                            else if let value = media.url, let url = URL(string:value) { Link(destination:url) { AsyncImage(url:url) { image in image.resizable().scaledToFit() } placeholder: { Image(systemName:"photo") }.frame(maxHeight:180) } }
                            Button("Delete attachment",role:.destructive) { confirming = BookingAction(to:"deleteMedia:\(media.id)",label:"Delete attachment") }.font(.caption)
                        }
                    }
                    Button("Add photos or licence") { sheet = .media }
                }
                Section("Customer link") {
                    if let link = d.shareLink, let url = URL(string:link.url,relativeTo:OpsConfig.apiBaseURL)?.absoluteURL {
                        ShareLink(item:url) { Label("Share customer link",systemImage:"square.and.arrow.up") }
                        Text("Expires \(link.expiresAt.formatted())").font(.caption)
                        Button("Revoke link",role:.destructive) { confirming = BookingAction(to:"revoke",label:"Revoke customer link") }
                    }
                    Button("Create fresh link") { Task { await mutate("bookings/\(bookingId)/share") } }
                }
                Section("Messages") {
                    ForEach(d.messages ?? []) { message in
                        DisclosureGroup("\(message.status.capitalized) · \(message.createdAt.formatted(date:.abbreviated,time:.shortened))") {
                            Text(message.body).font(.callout)
                            Link("Open WhatsApp",destination:whatsappURL(phone:message.phone,text:message.body))
                            if message.status == "due" {
                                Button("Mark sent") { Task { await mutate("messages/\(message.id)/sent") } }
                                Button("Skip") { Task { await mutate("messages/\(message.id)/skip") } }
                            }
                        }
                    }
                }
                if !d.actions.isEmpty { Section("Next step") {
                    TextField("Operator note",text:$note,axis:.vertical)
                    ForEach(d.actions,id:\.to) { action in Button(action.label) { confirming = action }.disabled(model.error != nil) }
                } }
                Section("Timeline") { ForEach(d.timeline ?? []) { event in VStack(alignment:.leading,spacing:4) { Text(session.label(event.toStatus)).font(.headline); if let note = event.note { Text(note) }; Text("\(event.createdBy) · \(event.createdAt.formatted())").font(.caption).foregroundStyle(.secondary) } } }
            } else if let error = model.error { ErrorState(message:error) { Task { await load() } } } else { LoadingList() }
            MutationError(message:error ?? (model.value != nil ? model.error : nil))
            if busy { ProgressView("Saving…") }
        }.disabled(busy)
            .navigationTitle(model.value?.customerName ?? "Booking").navigationBarTitleDisplayMode(.inline)
            .opsRefresh { await load() }
            .alert("Confirm",isPresented:Binding(get:{ confirming != nil },set:{ if !$0 { confirming = nil } }),presenting:confirming) { action in
                Button("Cancel",role:.cancel) { confirming = nil }
                Button(action.label) { confirming = nil; Task { await apply(action) } }
            } message: { action in Text("\(action.label)?") }
            .sheet(item:$queued) { message in MessagePromptView(message:message) { queued = nil } }
            .sheet(item:$sheet,onDismiss:{ Task { await load() } }) { value in
                if let detail = model.value {
                    switch value { case .payment:PaymentForm(bookingId:bookingId); case .assignment:AssignmentView(detail:detail); case .delivery:HandoverForm(detail:detail,phase:"delivery"); case .returned:HandoverForm(detail:detail,phase:"return"); case .media:MediaUploadView(bookingId:bookingId) }
                }
            }
            .sheet(isPresented:Binding(get:{ revealURL != nil },set:{ if !$0 { revealURL = nil } })) { if let revealURL { LicencePreview(url:revealURL) } }
    }
    private func money(_ title: String,_ value: Double) -> some View { HStack { Text(title); Spacer(); MoneyText(value:value) } }
    private func load() async { await model.load("bookings/\(bookingId)") }
    private func apply(_ action: BookingAction) async {
        if action.to == "deposit" { await mutate("bookings/\(bookingId)/deposit",body:["depositReturned":.bool(model.value?.depositReturned != true)]); return }
        if action.to == "revoke" { await mutate("bookings/\(bookingId)/share",method:"DELETE"); return }
        if action.to.hasPrefix("deletePayment:") { await mutate("payments/\(action.to.dropFirst(14))",method:"DELETE"); return }
        if action.to.hasPrefix("deleteMedia:") { await mutate("media/\(action.to.dropFirst(12))",method:"DELETE"); return }
        busy = true; error = nil
        do { let result = try await OpsAPI.shared.transition(id:bookingId,to:action.to,note:note); queued = result.queuedMessage; note = ""; NotificationCenter.default.post(name:.opsDataChanged,object:nil); UINotificationFeedbackGenerator().notificationOccurred(.success); await load() }
        catch { self.error = error.localizedDescription }; busy = false
    }
    private func mutate(_ path: String,method: String = "POST",body: [String:JSONValue] = [:]) async {
        busy = true; error = nil
        do { let result = try await OpsAPI.shared.mutate(path,method:method,body:body); queued = result.queuedMessage; UINotificationFeedbackGenerator().notificationOccurred(.success); await load() }
        catch { self.error = error.localizedDescription }; busy = false
    }
    private func reveal(_ media: BookingMedia) async {
        struct Reveal: Decodable,Sendable { let url: String }
        do { let r = try await OpsAPI.shared.send("api/ops/media/\(media.id)/reveal",method:"POST",body:[String:String](),as:Reveal.self); revealURL = URL(string:r.url) }
        catch { self.error = error.localizedDescription }
    }
}
struct MessagePromptView: View {
    let message: QueuedMessage; let onClose: () -> Void
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack { Form {
            Text(message.body)
            Link("Open WhatsApp",destination:whatsappURL(phone:message.phone,text:message.body))
            Button("Mark sent") { Task { await resolve("sent") } }
            Button("Skip message") { Task { await resolve("skip") } }
            if busy { ProgressView() }; MutationError(message:error)
        }.disabled(busy).navigationTitle("Tell the customer").toolbar { Button("Close",action:onClose) } }
    }
    private func resolve(_ action: String) async { busy = true; do { _ = try await OpsAPI.shared.mutate("messages/\(message.id)/\(action)"); onClose() } catch { self.error = error.localizedDescription }; busy = false }
}
func whatsappURL(phone: String,text: String) -> URL {
    var c = URLComponents(string:"https://wa.me/\(phone.filter(\.isNumber))")!
    if !text.isEmpty { c.queryItems = [.init(name:"text",value:text)] }; return c.url!
}
extension QueuedMessage: Identifiable {}
