import Foundation

struct BookingRow: Decodable, Identifiable, Hashable, Sendable {
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
}

struct BookingAction: Decodable, Hashable, Sendable {
    let to: String
    let label: String
}

struct LedgerEntry: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let kind: String
    let amount: Double
    let method: String
    let receivedAt: Date
}

struct BookingDetail: Decodable, Sendable {
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
}

/// A transition may leave a customer message outstanding, which the app offers
/// to send over WhatsApp — the same one-tap flow as the web panel.
struct QueuedMessage: Decodable, Hashable, Sendable {
    let id: String
    let body: String
    let phone: String
}

struct TransitionResult: Decodable, Sendable {
    let ok: Bool
    let status: String
    let statusLabel: String
    let queuedMessage: QueuedMessage?
}

extension JSONDecoder {
    /// The API sends ISO-8601 timestamps from Postgres, which sometimes carry
    /// fractional seconds and sometimes do not, so both are accepted.
    ///
    /// Uses Date.ISO8601FormatStyle rather than ISO8601DateFormatter because the
    /// latter is not Sendable and cannot be captured by the @Sendable decoding
    /// closure under Swift 6.
    static let ops: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { inner in
            let text = try inner.singleValueContainer().decode(String.self)
            let withFraction = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
            let plain = Date.ISO8601FormatStyle(includingFractionalSeconds: false)
            if let date = try? withFraction.parse(text) { return date }
            if let date = try? plain.parse(text) { return date }
            throw DecodingError.dataCorrupted(
                .init(codingPath: inner.codingPath, debugDescription: "Unrecognised date: \(text)")
            )
        }
        return decoder
    }()
}
