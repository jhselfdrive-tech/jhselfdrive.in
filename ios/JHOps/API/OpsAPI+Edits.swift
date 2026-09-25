import Foundation

extension OpsAPI {
  @discardableResult func updateBooking(_ id: String, fields: [String: JSONValue]) async throws
    -> Ack
  { try await mutate("bookings/\(id)", method: "PATCH", body: fields) }
  @discardableResult func updateCustomer(_ id: String, fields: [String: JSONValue]) async throws
    -> Ack
  { try await mutate("customers/\(id)", method: "PATCH", body: fields) }
  @discardableResult func updatePayment(_ id: String, fields: [String: JSONValue]) async throws
    -> Ack
  { try await mutate("payments/\(id)", method: "PATCH", body: fields) }
  @discardableResult func updateBlock(_ id: String, fields: [String: JSONValue]) async throws -> Ack
  { try await mutate("vehicles/blocks/\(id)", method: "PATCH", body: fields) }
  @discardableResult func deleteBlock(_ id: String) async throws -> Ack {
    try await mutate("vehicles/blocks/\(id)", method: "DELETE")
  }
  @discardableResult func updateDocument(_ id: String, fields: [String: JSONValue]) async throws
    -> Ack
  { try await mutate("vehicles/documents/\(id)", method: "PATCH", body: fields) }
  @discardableResult func deleteDocument(_ id: String) async throws -> Ack {
    try await mutate("vehicles/documents/\(id)", method: "DELETE")
  }
}
