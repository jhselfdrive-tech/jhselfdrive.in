import SwiftUI
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
            StatusChip(status: booking.status, label: booking.statusLabel)
            if let balance = booking.balance, balance > 0 { HStack { Text("Balance due"); MoneyText(value: balance) }.font(.caption).foregroundStyle(Theme.coral) }
            Text(booking.vehicleLabel ?? booking.carLabel)
                .font(.subheadline).foregroundStyle(.secondary)
            Text("\(booking.startAt.formatted(date: .abbreviated, time: .shortened)) → \(booking.endAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
