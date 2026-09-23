import Foundation

struct CalendarResponse: Codable, Sendable { let start: String; let days: Int; let lanes: [CalendarLane] }

struct CalendarLane: Codable, Identifiable, Sendable { var id: String { vehicleId }; let vehicleId: String; let label: String; let registrationNumber: String; let laneCount: Int; let spans: [CalendarSpan] }

struct CalendarSpan: Codable, Identifiable, Sendable { let id: String; let kind: String; let status: String?; let label: String; let startDay: Int; let endDay: Int; let lane: Int; let dayCount: Int; let startsBeforeWindow: Bool; let endsAfterWindow: Bool }
