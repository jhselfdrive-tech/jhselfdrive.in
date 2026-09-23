import Foundation

struct OpsAlert: Codable, Identifiable, Sendable { let id: String; let bookingId: String?; let vehicleId: String?; let kind: String; let urgency: String; let label: String }

struct AlertsResponse: Codable, Sendable { let alerts: [OpsAlert] }

struct MetricPoint: Codable, Sendable { let label: String; let value: Double }

struct Metrics: Codable, Sendable { let thisWeek: Int; let lastWeek: Int; let weekChange: Int; let conversionRate: Int; let revenueThisMonth: Double; let activeBookings: Int; let pendingBookings: Int; let trend: [MetricPoint]; let vehicleRevenue: [MetricPoint] }

/// Typed JSON body values avoid passing UIKit objects or mutable dictionaries across actors.
