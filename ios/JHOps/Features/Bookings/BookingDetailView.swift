import SwiftUI
import WidgetKit

struct BookingDetailView: View {
  let bookingId: String
  @Environment(SessionModel.self) private var session
  @State private var model = ScreenModel<BookingDetail>()
  @State private var customer = ScreenModel<CustomerDetail>()
  @State private var busy = false
  @State private var error: String?
  @State private var queued: QueuedMessage?
  @State private var confirming: BookingAction?
  @State private var sheet: DetailSheet?
  @State private var note = ""
  @State private var focus = "dates"
  @State private var editingPayment: LedgerEntry?
  @State private var revealURL: URL?
  @State private var afterHandover: BookingAction?
  private enum DetailSheet: String, Identifiable {
    case edit, payment, assignment, delivery, returned, media
    var id: String { rawValue }
  }
  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        if let d = model.value {
          hero(d)
          if !locked(d),
            let gaps = d.checklist?.gaps?.filter({
              d.status == "ongoing"
                ? $0.localizedCaseInsensitiveContains("return")
                : !$0.localizedCaseInsensitiveContains("return")
            }), !gaps.isEmpty, ["confirmed", "ongoing"].contains(d.status)
          {
            Card {
              Label(
                "\(gaps.count) \(gaps.count == 1 ? "thing" : "things") before handover",
                systemImage: "exclamationmark.triangle.fill"
              ).font(.headline).foregroundStyle(.orange)
              ForEach(gaps, id: \.self) { Text($0).font(.callout) }
            }
          }
          ForEach(BookingPresentation.cards(d.status), id: \.self) { key in priorityCard(key, d) }
          payments(d)
          Card("Photos and licences", collapsible: true, expanded: false) {
            mediaRows(d.media ?? [], editable: !locked(d))
            if !locked(d) { Button("Add photos or licence") { sheet = .media } }
          }
          Card("Handovers", collapsible: true, expanded: false) {
            ForEach(d.handovers ?? []) { h in
              VStack(alignment: .leading, spacing: 4) {
                Text(h.phase.capitalized).font(.headline)
                Text(
                  "\(h.odometerKm.map(String.init) ?? "—") km · Fuel \(h.fuelEighths.map(String.init) ?? "—")/8"
                ).monospacedDigit()
                if let damage = h.damageNotes { Text(damage) }
              }
            }
            if !locked(d) {
              Button("Edit delivery checklist") { sheet = .delivery }
              Button("Edit return checklist") { sheet = .returned }
            }
          }
          Card(
            "Messages · \(d.dueMessages) due", collapsible: true,
            expanded: d.dueMessages > 0 && !locked(d)
          ) {
            ForEach(d.messages ?? []) { message in
              DisclosureGroup(
                "\(message.status.capitalized) · \(message.createdAt.formatted(date:.abbreviated,time:.shortened))"
              ) {
                Text(message.body).font(.callout)
                Link("WhatsApp", destination: whatsappURL(phone: message.phone, text: message.body))
                if message.status == "due", !locked(d) {
                  HStack {
                    Button("Sent") { Task { await mutate("messages/\(message.id)/sent") } }
                    Button("Skip") { Task { await mutate("messages/\(message.id)/skip") } }
                  }
                }
              }
            }
          }
          Card("Customer link", collapsible: true, expanded: false) { shareContent(d) }
          Card("Activity", collapsible: true, expanded: false) {
            ForEach(d.timeline ?? []) { event in
              VStack(alignment: .leading, spacing: 4) {
                Text(event.note ?? session.label(event.toStatus)).font(.callout)
                Text("\(event.createdBy) · \(event.createdAt.formatted())").font(.caption)
                  .foregroundStyle(Theme.muted)
                Divider()
              }
            }
          }
        } else if let error = model.error {
          ErrorState(message: error) { Task { await load() } }
        } else {
          LoadingList()
        }
        MutationError(message: error ?? model.error)
        if busy { ProgressView("Saving…") }
      }.padding().frame(maxWidth: 760).frame(maxWidth: .infinity)
    }.background(Theme.paper).disabled(busy)
      .navigationTitle("Booking").navigationBarTitleDisplayMode(.inline)
      .toolbar {
        if let d = model.value {
          if !locked(d) { Button("Edit") { edit("dates") } }
          Menu {
            shareContent(d)
            ForEach(d.actions.filter { ["cancelled", "rejected"].contains($0.to) }, id: \.to) {
              action in Button(action.label, role: .destructive) { confirming = action }
            }
          } label: {
            Image(systemName: "ellipsis.circle")
          }
        }
      }
      .safeAreaInset(edge: .bottom) { if let d = model.value { bottomAction(d) } }
      .opsRefresh { await load() }
      .sheet(item: $confirming) { action in
        NavigationStack {
          Form {
            Text("\(action.label)?").font(.headline)
            if dIsTransition(action) {
              TextField("Operator note (optional)", text: $note, axis: .vertical)
            }
            Button(action.label) {
              confirming = nil
              Task { await apply(action) }
            }.buttonStyle(.borderedProminent)
          }.navigationTitle("Confirm change").toolbar {
            Button("Cancel") {
              confirming = nil
              note = ""
            }
          }
        }.presentationDetents([.medium, .large])
      }
      .sheet(item: $queued) { message in MessagePromptView(message: message) { queued = nil } }
      .sheet(
        item: $sheet,
        onDismiss: {
          Task {
            await load()
            if let action = afterHandover {
              afterHandover = nil
              confirming = action
            }
          }
        }
      ) { value in
        if let d = model.value {
          switch value {
          case .edit: EditBookingSheet(detail: d, focus: focus)
          case .payment: PaymentForm(bookingId: bookingId)
          case .assignment: AssignmentView(detail: d)
          case .delivery:
            HandoverForm(
              detail: d, phase: "delivery",
              onSaved: d.status == "confirmed"
                ? { afterHandover = BookingAction(to: "ongoing", label: "Start trip") } : nil)
          case .returned:
            HandoverForm(
              detail: d, phase: "return",
              onSaved: d.status == "ongoing"
                ? { afterHandover = BookingAction(to: "completed", label: "Complete trip") } : nil)
          case .media: MediaUploadView(bookingId: bookingId)
          }
        }
      }
      .sheet(item: $editingPayment) { payment in PaymentForm(bookingId: bookingId, editing: payment)
      }
      .sheet(isPresented: Binding(get: { revealURL != nil }, set: { if !$0 { revealURL = nil } })) {
        if let revealURL { LicencePreview(url: revealURL) }
      }
  }
  private func locked(_ d: BookingDetail) -> Bool { BookingPresentation.locked(d.status) }
  private func edit(_ field: String) {
    focus = field
    sheet = .edit
  }
  private func dIsTransition(_ action: BookingAction) -> Bool {
    ["approved", "confirmed", "ongoing", "completed", "cancelled", "rejected"].contains(action.to)
  }
  private func hero(_ d: BookingDetail) -> some View {
    Card {
      StatusBadge(status: d.status, label: d.statusLabel)
      ViewThatFits(in: .horizontal) {
        HStack {
          Text(d.customerName).font(Theme.Font.name)
          Spacer()
          QuickContact(phone: d.phone)
        }
        VStack(alignment: .leading) {
          Text(d.customerName).font(Theme.Font.name)
          QuickContact(phone: d.phone)
        }
      }
      if let id = d.customerId {
        NavigationLink("Customer profile", value: Route.customer(id)).font(.caption)
      }
      EditableRow(label: "Vehicle", value: d.vehicleLabel ?? d.carLabel, enabled: !locked(d)) {
        edit("vehicle")
      }
      Button {
        edit("dates")
      } label: {
        HStack(alignment: .top) {
          TripStrip(start: d.startAt, end: d.endAt, status: d.status)
          Spacer()
          if !locked(d) { Image(systemName: "pencil").foregroundStyle(Theme.coral) }
        }.foregroundStyle(Theme.ink)
      }.disabled(locked(d))
    }
  }
  @ViewBuilder private func priorityCard(_ key: String, _ d: BookingDetail) -> some View {
    switch key {
    case "customer":
      Card("Customer history") {
        if let c = customer.value?.customer {
          Text("\(c.bookingCount) bookings · \(c.completedBookingCount) completed")
          HStack {
            Text("Lifetime value")
            MoneyText(value: c.lifetimeValue)
          }
          Text(c.segments.joined(separator: " · ")).foregroundStyle(Theme.teal)
        } else if let error = customer.error {
          Text(error).font(.caption)
        } else {
          ProgressView()
        }
      }
    case "vehicle":
      Card("Vehicle assignment", actionTitle: "Edit", action: { edit("vehicle") }) {
        Label(d.vehicleLabel ?? "Assign a vehicle before confirming", systemImage: "car.side")
        if d.vehicleId == nil { Button("Choose available vehicle") { sheet = .assignment } }
      }
    case "delivery", "return":
      Card(
        key == "delivery" ? "Delivery checklist" : "Return checklist", actionTitle: "Open",
        action: { sheet = key == "delivery" ? .delivery : .returned }
      ) {
        let complete = key == "delivery" ? d.checklist?.hasDelivery : d.checklist?.hasReturn
        Label(
          complete == true ? "Checklist recorded" : "Record condition, fuel and payments",
          systemImage: complete == true ? "checkmark.circle.fill" : "checklist"
        ).foregroundStyle(Theme.teal)
      }
    case "licence":
      Card("Licence photos", actionTitle: "Add", action: { sheet = .media }) {
        mediaRows((d.media ?? []).filter { $0.mediaType.hasPrefix("licence") }, editable: true)
        if d.checklist?.hasLicenceFront != true || d.checklist?.hasLicenceBack != true {
          Label("Add both sides of the driving licence", systemImage: "person.text.rectangle")
            .foregroundStyle(.orange)
        }
      }
    case "returnDue":
      Card("Return due") {
        TripStrip(start: d.startAt, end: d.endAt, status: d.status)
        QuickContact(phone: d.phone)
      }
    case "returnPhotos":
      Card("Return photos", actionTitle: "Add", action: { sheet = .media }) {
        mediaRows(
          (d.media ?? []).filter { $0.phase == "return" && !$0.requiresReveal }, editable: true)
      }
    case "money":
      Card(
        "Money", collapsible: locked(d), expanded: !locked(d),
        actionTitle: locked(d) ? nil : "Edit", action: { edit("money") }
      ) {
        MoneyBar(paid: d.collected, total: d.amountTotal, balance: d.balance)
        HStack {
          Text(d.depositReturned == true ? "Deposit returned" : "Deposit held")
          Spacer()
          MoneyText(value: d.deposit)
        }
        if !locked(d) {
          Button("Record payment") { sheet = .payment }
          if d.deposit > 0 {
            Button(d.depositReturned == true ? "Mark deposit as held" : "Return deposit") {
              confirming = BookingAction(
                to: "deposit",
                label: d.depositReturned == true ? "Mark deposit as held" : "Return deposit")
            }
          }
        }
      }
    default:
      Card(
        "Notes", collapsible: locked(d), expanded: !locked(d),
        actionTitle: locked(d) ? nil : "Edit", action: { edit("notes") }
      ) {
        Text(d.notes?.isEmpty == false ? d.notes! : "No booking notes").foregroundStyle(Theme.muted)
      }
    }
  }
  private func payments(_ d: BookingDetail) -> some View {
    Card("Payments · \(d.payments.count)", collapsible: true, expanded: d.status == "completed") {
      ForEach(d.payments) { payment in
        SwipeDeleteRow(
          enabled: payment.handoverId == nil && !locked(d),
          action: {
            if payment.handoverId == nil && !locked(d) {
              confirming = BookingAction(to: "deletePayment:\(payment.id)", label: "Delete payment")
            }
          }
        ) {
          VStack(alignment: .leading, spacing: 6) {
            Button {
              if payment.handoverId == nil {
                editingPayment = payment
              } else {
                sheet =
                  d.handovers?.first(where: { $0.id == payment.handoverId })?.phase == "return"
                  ? .returned : .delivery
              }
            } label: {
              HStack {
                VStack(alignment: .leading) {
                  Text(payment.kind.capitalized)
                  Text(
                    "\(payment.method.uppercased()) · \(payment.receivedAt.formatted(date:.abbreviated,time:.omitted))"
                  ).font(.caption).foregroundStyle(Theme.muted)
                }
                Spacer()
                MoneyText(value: payment.amount)
                if !locked(d) { Image(systemName: "pencil") }
              }
            }.disabled(locked(d))
            if let note = payment.note { Text(note).font(.caption) }
            if payment.handoverId == nil, !locked(d) {
              Button("Delete", role: .destructive) {
                confirming = BookingAction(
                  to: "deletePayment:\(payment.id)", label: "Delete payment")
              }.font(.caption)
            }
            Divider()
          }
        }
      }
    }
  }
  @ViewBuilder private func mediaRows(_ values: [BookingMedia], editable: Bool) -> some View {
    ForEach(values) { media in
      VStack(alignment: .leading, spacing: 8) {
        Text(media.mediaType.replacingOccurrences(of: "_", with: " ").capitalized).font(.caption)
        if media.requiresReveal {
          Button("Reveal licence for 60 seconds") { Task { await reveal(media) } }
        } else if let value = media.url, let url = URL(string: value) {
          Link(destination: url) {
            AsyncImage(url: url) { image in
              image.resizable().scaledToFit()
            } placeholder: {
              Image(systemName: "photo")
            }.frame(maxHeight: 180)
          }
        }
        if editable {
          Button("Delete attachment", role: .destructive) {
            confirming = BookingAction(to: "deleteMedia:\(media.id)", label: "Delete attachment")
          }.font(.caption)
        }
      }
    }
  }
  @ViewBuilder private func shareContent(_ d: BookingDetail) -> some View {
    if let link = d.shareLink,
      let url = URL(string: link.url, relativeTo: OpsConfig.apiBaseURL)?.absoluteURL
    {
      ShareLink(item: url) { Label("Share customer link", systemImage: "square.and.arrow.up") }
      if !locked(d) {
        Button("Revoke link", role: .destructive) {
          confirming = BookingAction(to: "revoke", label: "Revoke customer link")
        }
      }
    }
    if !locked(d) {
      Button("Create fresh link") { Task { await mutate("bookings/\(bookingId)/share") } }
    }
  }
  @ViewBuilder private func bottomAction(_ d: BookingDetail) -> some View {
    if let title = BookingPresentation.primary(d.status) {
      ActionBar(
        title: title,
        disabled: busy || model.error != nil || (d.status == "approved" && d.vehicleId == nil),
        action: {
          if d.status == "confirmed" {
            sheet = .delivery
          } else if d.status == "ongoing" {
            sheet = .returned
          } else if let action = d.actions.first(where: {
            !["cancelled", "rejected"].contains($0.to)
          }) {
            confirming = action
          }
        }
      ) {
        ForEach(d.actions.filter { ["cancelled", "rejected"].contains($0.to) }, id: \.to) {
          action in Button(action.label, role: .destructive) { confirming = action }
        }
        Button("Record payment") { sheet = .payment }
      }
    } else if d.status == "completed", d.depositReturned != true, d.deposit > 0 {
      ActionBar(
        title: "Return deposit", disabled: busy,
        action: { confirming = BookingAction(to: "deposit", label: "Return deposit") }
      ) { Button("Record payment") { sheet = .payment } }
    }
  }
  private func load() async {
    await model.load("bookings/\(bookingId)")
    if model.value?.status == "requested", let id = model.value?.customerId {
      await customer.load("customers/\(id)")
    }
  }
  private func apply(_ action: BookingAction) async {
    if action.to == "deposit" {
      await mutate(
        "bookings/\(bookingId)/deposit",
        body: ["depositReturned": .bool(model.value?.depositReturned != true)])
      return
    }
    if action.to == "revoke" {
      await mutate("bookings/\(bookingId)/share", method: "DELETE")
      return
    }
    if action.to.hasPrefix("deletePayment:") {
      await mutate("payments/\(action.to.dropFirst(14))", method: "DELETE")
      return
    }
    if action.to.hasPrefix("deleteMedia:") {
      await mutate("media/\(action.to.dropFirst(12))", method: "DELETE")
      return
    }
    busy = true
    error = nil
    do {
      let result = try await OpsAPI.shared.transition(id: bookingId, to: action.to, note: note)
      queued = result.queuedMessage
      note = ""
      NotificationCenter.default.post(name: .opsDataChanged, object: nil)
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      await load()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
  private func mutate(_ path: String, method: String = "POST", body: [String: JSONValue] = [:])
    async
  {
    busy = true
    error = nil
    do {
      let result = try await OpsAPI.shared.mutate(path, method: method, body: body)
      queued = result.queuedMessage
      UINotificationFeedbackGenerator().notificationOccurred(.success)
      await load()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
  private func reveal(_ media: BookingMedia) async {
    struct Reveal: Decodable, Sendable { let url: String }
    do {
      let r = try await OpsAPI.shared.send(
        "api/ops/media/\(media.id)/reveal", method: "POST", body: [String: String](),
        as: Reveal.self)
      revealURL = URL(string: r.url)
    } catch { self.error = error.localizedDescription }
  }
}
struct MessagePromptView: View {
  let message: QueuedMessage
  let onClose: () -> Void
  @State private var busy = false
  @State private var error: String?
  var body: some View {
    NavigationStack {
      Form {
        Text(message.body)
        Link("Open WhatsApp", destination: whatsappURL(phone: message.phone, text: message.body))
        Button("Mark sent") { Task { await resolve("sent") } }
        Button("Skip message") { Task { await resolve("skip") } }
        if busy { ProgressView() }
        MutationError(message: error)
      }.disabled(busy).navigationTitle("Tell the customer").toolbar {
        Button("Close", action: onClose)
      }
    }
  }
  private func resolve(_ action: String) async {
    busy = true
    do {
      _ = try await OpsAPI.shared.mutate("messages/\(message.id)/\(action)")
      onClose()
    } catch { self.error = error.localizedDescription }
    busy = false
  }
}
func whatsappURL(phone: String, text: String) -> URL {
  var c = URLComponents(string: "https://wa.me/\(phone.filter(\.isNumber))")!
  if !text.isEmpty { c.queryItems = [.init(name: "text", value: text)] }
  return c.url!
}
extension QueuedMessage: Identifiable {}

extension BookingAction: Identifiable { var id: String { to } }
