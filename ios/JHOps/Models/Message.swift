import Foundation

struct MessageRow: Codable, Identifiable, Sendable { let id: String; let bookingId: String; let body: String; let phone: String; let status: String; let sentAt: Date?; let createdAt: Date; let skippedReason: String? }

struct Reminder: Codable, Identifiable, Sendable {
    var id: String { "\(bookingId):\(reminder):\(onDate)" }
    let bookingId: String; let reminder: String; let onDate: String; let customerName: String?; let phone: String; let startAt: Date; let endAt: Date; let vehicleLabel: String?; let body: String
}

struct RemindersResponse: Codable, Sendable { let reminders: [Reminder] }
