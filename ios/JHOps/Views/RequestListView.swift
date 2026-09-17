import SwiftUI
import WidgetKit

struct RequestListView: View {
    @EnvironmentObject private var session: SessionModel
    @State private var bookings: [BookingRow] = []
    @State private var summary: OpsSummary = SharedStore.load() ?? .empty
    @State private var error: String?
    @State private var loading = false
    @State private var path: [String] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section {
                    SummaryStrip(summary: summary)
                }

                Section("Awaiting approval") {
                    if bookings.isEmpty && !loading {
                        Text("Nothing waiting. You're all caught up.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(bookings) { booking in
                        NavigationLink(value: booking.id) {
                            BookingRowView(booking: booking)
                        }
                    }
                }

                if let error {
                    Section { Text(error).font(.footnote).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Requests")
            .navigationDestination(for: String.self) { BookingDetailView(bookingId: $0) }
            .refreshable { await load() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                            Task { await session.signOut() }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .task { await load() }
        // A tapped notification jumps straight to its booking.
        .onReceive(NotificationCenter.default.publisher(for: .openBooking)) { note in
            guard let bookingId = note.userInfo?["bookingId"] as? String else { return }
            if path.last != bookingId { path.append(bookingId) }
        }
        .onAppear {
            if let pending = AppDelegate.launchBookingId {
                AppDelegate.launchBookingId = nil
                path.append(pending)
            }
        }
    }

    private func load() async {
        loading = true
        error = nil
        do {
            async let rows = OpsAPI.shared.requests()
            async let counts = OpsAPI.shared.summary()
            bookings = try await rows
            summary = try await counts
            SharedStore.save(summary)
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

struct SummaryStrip: View {
    let summary: OpsSummary

    var body: some View {
        HStack(spacing: 10) {
            Tile(value: summary.pendingRequests, label: "Requests", tint: .orange)
            Tile(value: summary.pickupsToday, label: "Pickups", tint: .blue)
            Tile(value: summary.overdueReturns, label: "Overdue", tint: .red)
            Tile(value: summary.unsentMessages, label: "Unsent", tint: .purple)
        }
        .padding(.vertical, 4)
    }

    private struct Tile: View {
        let value: Int
        let label: String
        let tint: Color

        var body: some View {
            VStack(spacing: 2) {
                Text("\(value)")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(value > 0 ? tint : Color.secondary)
                Text(label).font(.caption2).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

struct BookingRowView: View {
    let booking: BookingRow

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(booking.customerName).font(.headline)
                Spacer()
                Text(booking.amountTotal, format: .currency(code: "INR").precision(.fractionLength(0)))
                    .font(.subheadline.weight(.semibold))
            }
            Text(booking.vehicleLabel ?? booking.carLabel)
                .font(.subheadline).foregroundStyle(.secondary)
            Text("\(booking.startAt.formatted(date: .abbreviated, time: .shortened)) → \(booking.endAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
