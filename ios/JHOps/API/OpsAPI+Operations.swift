import Foundation
extension OpsAPI {
    func read<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = [], as type: T.Type) async throws -> T {
        try await send("api/ops/\(path)", query: query, as: type)
    }
    func mutate(_ path: String, method: String = "POST", body: [String:JSONValue] = [:]) async throws -> Ack {
        let result = try await send("api/ops/\(path)", method: method, body: body, as: Ack.self)
        NotificationCenter.default.post(name: .opsDataChanged, object: nil)
        return result
    }
    func upload(_ path: String, data: Data, filename: String, mime: String, fields: [String:String]) async throws -> Ack {
        let multipart = Multipart(data: data, filename: filename, mime: mime, fields: fields)
        let result = try await send("api/ops/\(path)", method: "POST", rawBody: multipart.data, contentType: multipart.contentType, as: Ack.self)
        NotificationCenter.default.post(name: .opsDataChanged, object: nil)
        return result
    }
}
extension Notification.Name { static let opsDataChanged = Notification.Name("in.jhselfdrive.ops.dataChanged") }
