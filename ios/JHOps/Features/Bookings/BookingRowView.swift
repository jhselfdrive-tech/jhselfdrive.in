import SwiftUI

struct BookingRowView: View {
  let booking: BookingRow
  var body: some View {
    HStack(spacing: 12) {
      StatusRail(status: booking.status)
      VStack(alignment: .leading, spacing: 9) {
        ViewThatFits(in: .horizontal) {
          HStack {
            Text(booking.customerName).font(.system(.headline, design: .rounded))
            Spacer()
            MoneyText(value: booking.amountTotal).font(.subheadline.weight(.semibold))
          }
          VStack(alignment: .leading) {
            Text(booking.customerName).font(.headline)
            MoneyText(value: booking.amountTotal)
          }
        }
        Text(booking.vehicleLabel ?? booking.carLabel).font(.subheadline).foregroundStyle(
          Theme.muted)
        TripStrip(start: booking.startAt, end: booking.endAt, status: booking.status, compact: true)
        HStack {
          StatusBadge(status: booking.status, label: booking.statusLabel)
          if let balance = booking.balance, balance > 0 {
            HStack(spacing: 3) {
              MoneyText(value: balance)
              Text("due")
            }.font(.caption.weight(.semibold)).foregroundStyle(Theme.coral)
          }
        }
      }
    }.padding(.vertical, 8).foregroundStyle(Theme.ink)
  }
}
