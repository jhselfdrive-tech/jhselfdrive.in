import Foundation

struct CustomerRow: Codable, Identifiable, Hashable, Sendable { let id: String; let phone: String; let fullName: String?; let email: String?; let city: String?; let tags: [String]; let notes: String?; let bookingCount: Int; let completedBookingCount: Int; let lifetimeValue: Double; let segments: [String]; let lastSeenAt: Date }

struct CustomersResponse: Codable, Sendable { let customers: [CustomerRow] }

struct CustomerDetail: Codable, Sendable { let customer: CustomerRow; let bookings: [BookingRow] }
