import Foundation
extension OpsAPI {
    func requests(status: String = "requested") async throws -> [BookingRow] {
        struct Wrapper: Decodable { let bookings: [BookingRow] }
        return try await send(
            "api/ops/requests",
            query: [URLQueryItem(name: "status", value: status)],
            as: Wrapper.self
        ).bookings
    }

    func booking(id: String) async throws -> BookingDetail {
        try await send("api/ops/bookings/\(id)", as: BookingDetail.self)
    }

    func transition(id: String, to status: String, note: String = "", vehicleId: String = "") async throws -> TransitionResult {
        struct Body: Encodable { let status: String; let note: String; let vehicleId: String }
        return try await send(
            "api/ops/bookings/\(id)/transition",
            method: "POST",
            body: Body(status: status, note: note, vehicleId: vehicleId),
            as: TransitionResult.self
        )
    }

    func registerDevice(token: String, environment: String, appVersion: String) async throws {
        struct Body: Encodable { let apnsToken: String; let environment: String; let appVersion: String }
        struct Ack: Decodable { let ok: Bool }
        _ = try await send(
            "api/ops/devices",
            method: "POST",
            body: Body(apnsToken: token, environment: environment, appVersion: appVersion),
            as: Ack.self
        )
    }

    func unregisterDevice(token: String) async throws {
        struct Body: Encodable { let apnsToken: String }
        struct Ack: Decodable { let ok: Bool }
        _ = try await send("api/ops/devices", method: "DELETE", body: Body(apnsToken: token), as: Ack.self)
    }
}
