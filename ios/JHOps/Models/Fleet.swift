import Foundation

struct AvailableVehicle: Codable, Identifiable, Hashable, Sendable {
  let id: String
  let registrationNumber: String
  let displayName: String?
  let categorySlug: String
  let model: String?
  let seats: Int?
  var label: String { "\(displayName ?? model ?? registrationNumber) · \(registrationNumber)" }
}

struct AvailableResponse: Codable, Sendable { let vehicles: [AvailableVehicle] }

struct CurrentBooking: Codable, Sendable {
  let id: String
  let customerName: String
  let endAt: Date?
}

struct Vehicle: Codable, Identifiable, Sendable {
  let id: String
  let registrationNumber: String
  let displayName: String?
  let categorySlug: String
  let model: String?
  let year: Int?
  let transmission: String?
  let fuel: String?
  let seats: Int?
  let status: String
  let odometerKm: Int?
  let acquiredOn: String?
  let notes: String?
  let dayRate: Double
  let kmRate: Double?
  let includedKmPerDay: Int?
  let deposit: Double
  let tagline: String?
  let description: String?
  let isBookable: Bool
  let photoUrl: String?
  let photoCount: Int?
  let alertCount: Int?
  let currentBooking: CurrentBooking?
  var label: String { displayName ?? model ?? registrationNumber }
}

struct FleetResponse: Codable, Sendable { let vehicles: [Vehicle] }

struct VehiclePhoto: Codable, Identifiable, Sendable {
  let id: String
  let url: String?
  let sortOrder: Int
}

struct VehicleDocument: Codable, Identifiable, Sendable {
  let id: String
  let docType: String
  let provider: String?
  let referenceNumber: String?
  let issuedOn: String?
  let expiresOn: String
  let notes: String?
  let url: String?
}

struct VehicleBlock: Codable, Identifiable, Sendable {
  let id: String
  let startAt: Date
  let endAt: Date
  let reason: String
}

struct VehicleDetail: Codable, Sendable {
  let vehicle: Vehicle
  let utilisation: Double
  let revenue: Double
  let photos: [VehiclePhoto]
  let documents: [VehicleDocument]
  let blocks: [VehicleBlock]
  let bookings: [BookingRow]
}
