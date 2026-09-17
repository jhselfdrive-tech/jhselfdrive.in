import SwiftUI
import WidgetKit

struct BookingDetailView: View {
    let bookingId: String

    @State private var detail: BookingDetail?
    @State private var error: String?
    @State private var busy = false
    @State private var queued: QueuedMessage?
    @State private var confirming: BookingAction?
    @State private var note = ""

    var body: some View {
        Form {
            if let detail {
                Section {
                    LabeledContent("Customer", value: detail.customerName)
                    LabeledContent("Car", value: detail.vehicleLabel ?? detail.carLabel)
                    LabeledContent("Pickup", value: detail.startAt.formatted(date: .abbreviated, time: .shortened))
                    LabeledContent("Return", value: detail.endAt.formatted(date: .abbreviated, time: .shortened))
                    LabeledContent("Status", value: detail.statusLabel)
                    if let notes = detail.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Trip note").font(.caption).foregroundStyle(.secondary)
                            Text(notes)
                        }
                    }
                }

                Section("Money") {
                    LabeledContent("Rental", value: inr(detail.amountTotal))
                    LabeledContent("Collected", value: inr(detail.collected))
                    LabeledContent("Balance", value: inr(detail.balance))
                        .foregroundStyle(detail.balance > 0 ? .orange : .primary)
                    LabeledContent("Deposit held", value: inr(detail.deposit))
                }

                if !detail.phone.isEmpty {
                    Section {
                        Link(destination: whatsappURL(phone: detail.phone, text: "")) {
                            Label("Open WhatsApp", systemImage: "message.fill")
                        }
                        Link(destination: URL(string: "tel://\(detail.phone)")!) {
                            Label("Call \(detail.phone)", systemImage: "phone.fill")
                        }
                    }
                }

                // Only the moves the server's status machine allows, so the app
                // can never offer a button that would be rejected.
                if !detail.actions.isEmpty {
                    Section("Next step") {
                        ForEach(detail.actions, id: \.to) { action in
                            Button(action.label) { confirming = action }
                                .disabled(busy)
                        }
                    }
                }

                if detail.dueMessages > 0 {
                    Section {
                        Label("\(detail.dueMessages) customer message\(detail.dueMessages == 1 ? "" : "s") not sent",
                              systemImage: "exclamationmark.bubble")
                            .foregroundStyle(.orange)
                    }
                }
            } else if error == nil {
                Section { HStack { Spacer(); ProgressView(); Spacer() } }
            }

            if let error {
                Section { Text(error).font(.footnote).foregroundStyle(.red) }
            }
        }
        .navigationTitle(detail?.customerName ?? "Booking")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .alert("Confirm", isPresented: .constant(confirming != nil), presenting: confirming) { action in
            Button("Cancel", role: .cancel) { confirming = nil }
            Button(action.label) {
                let target = action
                confirming = nil
                Task { await apply(target) }
            }
        } message: { action in
            Text("\(action.label)? The customer gets a WhatsApp update you can send straight after.")
        }
        // The transition queued a message; offer it immediately, exactly as the
        // web panel prompts.
        .sheet(item: $queued) { message in
            MessagePromptView(message: message) { queued = nil }
        }
    }

    private func inr(_ value: Double) -> String {
        value.formatted(.currency(code: "INR").precision(.fractionLength(0)))
    }

    private func load() async {
        error = nil
        do {
            detail = try await OpsAPI.shared.booking(id: bookingId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func apply(_ action: BookingAction) async {
        busy = true
        error = nil
        do {
            let result = try await OpsAPI.shared.transition(id: bookingId, to: action.to, note: note)
            note = ""
            if let message = result.queuedMessage { queued = message }
            await load()
            if let summary = try? await OpsAPI.shared.summary() {
                SharedStore.save(summary)
                WidgetCenter.shared.reloadAllTimelines()
            }
        } catch {
            self.error = error.localizedDescription
        }
        busy = false
    }
}

/// The WhatsApp hand-off: shows the composed text and opens WhatsApp with it.
struct MessagePromptView: View {
    let message: QueuedMessage
    let onClose: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                Text(message.body)
                    .font(.callout)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground), in: .rect(cornerRadius: 12))
                    .padding()
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 10) {
                    Link(destination: whatsappURL(phone: message.phone, text: message.body)) {
                        Label("Open WhatsApp", systemImage: "message.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)

                    Button("Done", action: onClose)
                }
                .padding()
                .background(.bar)
            }
            .navigationTitle("Tell the customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Close", action: onClose) }
            }
        }
    }
}

func whatsappURL(phone: String, text: String) -> URL {
    let digits = phone.filter(\.isNumber)
    var components = URLComponents(string: "https://wa.me/\(digits)")!
    if !text.isEmpty { components.queryItems = [URLQueryItem(name: "text", value: text)] }
    return components.url!
}

extension QueuedMessage: Identifiable {}
