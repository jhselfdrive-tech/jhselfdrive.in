import Foundation

struct Ack: Decodable, Sendable { let ok: Bool; let queuedMessage: QueuedMessage?; let bookingId: String?; let vehicleId: String?; let url: String? }

enum JSONValue: Encodable, Sendable {
    case null
    case string(String), number(Double), bool(Bool), array([JSONValue]), object([String:JSONValue])
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self { case .null: try c.encodeNil(); case .string(let v): try c.encode(v); case .number(let v): try c.encode(v); case .bool(let v): try c.encode(v); case .array(let v): try c.encode(v); case .object(let v): try c.encode(v) }
    }
}
