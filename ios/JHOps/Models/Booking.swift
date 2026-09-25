import Foundation

extension Date {
  /// Date pickers show minutes; hidden seconds must not add a rental day.
  var bookingMinute: Date {
    Date(timeIntervalSince1970: floor(timeIntervalSince1970 / 60) * 60)
  }
}

struct BookingRow: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let status: String
  let statusLabel: String
  let customerName: String
  let phone: String
  let carLabel: String
  let vehicleLabel: String?
  let startAt: Date
  let endAt: Date
  let amountTotal: Double
  let deposit: Double
  let createdAt: Date
  let balance: Double?
  let customerId: String?
  let vehicleId: String?
  let carSlug: String?
}

struct BookingAction: Codable, Hashable, Sendable {
  let to: String
  let label: String
}

struct LedgerEntry: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let kind: String
  let amount: Double
  let method: String
  let receivedAt: Date
  let note: String?
  let handoverId: String?
}

struct BookingDetail: Codable, Sendable {
  let id: String
  let status: String
  let statusLabel: String
  let customerName: String
  let phone: String
  let carLabel: String
  let vehicleLabel: String?
  let startAt: Date
  let endAt: Date
  let notes: String?
  let amountTotal: Double
  let collected: Double
  let balance: Double
  let deposit: Double
  let actions: [BookingAction]
  let dueMessages: Int
  let payments: [LedgerEntry]
  let customerId: String?
  let vehicleId: String?
  let carSlug: String?
  let depositRequired: Double?
  let depositReturned: Bool?
  let previousOdometerKm: Int?
  let checklist: Checklist?
  let handovers: [Handover]?
  let media: [BookingMedia]?
  let messages: [MessageRow]?
  let timeline: [TimelineEntry]?
  let shareLink: BookingShareLink?
}

/// A transition may leave a customer message outstanding, which the app offers
/// to send over WhatsApp — the same one-tap flow as the web panel.
struct QueuedMessage: Codable, Hashable, Sendable {
  let id: String
  let body: String
  let phone: String
}

struct TransitionResult: Codable, Sendable {
  let ok: Bool
  let status: String
  let statusLabel: String
  let queuedMessage: QueuedMessage?
}

struct BookingsResponse: Codable, Sendable {
  let bookings: [BookingRow]
  let nextCursor: String?
}

struct Checklist: Codable, Sendable {
  let gaps: [String]?
  let hasDelivery: Bool?
  let hasReturn: Bool?
  let hasLicenceFront: Bool?
  let hasLicenceBack: Bool?
  let deliveryOdometerKm: Int?
  let returnOdometerKm: Int?
  let deliveryFuelEighths: Int?
  let returnFuelEighths: Int?
}

struct Handover: Codable, Identifiable, Sendable {
  let id: String
  let phase: String
  let odometerKm: Int?
  let fuelEighths: Int?
  let paymentReceived: Bool
  let paymentAmount: Double
  let depositAmount: Double
  let damageNotes: String?
  let notes: String?
  let recordedAt: Date
}

struct BookingMedia: Codable, Identifiable, Sendable {
  let id: String
  let phase: String
  let mediaType: String
  let fileName: String
  let url: String?
  let requiresReveal: Bool
}

struct TimelineEntry: Codable, Identifiable, Sendable {
  let id: String
  let fromStatus: String?
  let toStatus: String
  let note: String?
  let createdBy: String
  let createdAt: Date
}

struct BookingShareLink: Codable, Sendable {
  let url: String
  let expiresAt: Date
}

struct Quote: Codable, Sendable {
  let days: Int
  let dayRate: Double
  let amountTotal: Double
  let deposit: Double
}
