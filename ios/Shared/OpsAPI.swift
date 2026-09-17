import Foundation

struct OpsError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

/// Client for the /api/ops routes.
///
/// Lives in Shared so the widget and the notification extension can call
/// `summary()` with the same token handling as the app.
struct OpsAPI: Sendable {
    static let shared = OpsAPI()

    private struct ErrorBody: Decodable { let error: String? }
    private struct TokenResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let expires_in: Double
    }

    // MARK: - Supabase auth

    func signIn(email: String, password: String) async throws -> TokenStore.Session {
        guard let base = OpsConfig.supabaseURL else { throw OpsError(message: "Supabase URL is not configured") }
        var request = URLRequest(url: base.appending(path: "auth/v1/token").appending(queryItems: [
            URLQueryItem(name: "grant_type", value: "password"),
        ]))
        request.httpMethod = "POST"
        request.setValue(OpsConfig.supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw OpsError(message: "Sign in failed. Check your email and password.")
        }
        let token = try JSONDecoder.ops.decode(TokenResponse.self, from: data)
        return .init(
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date().timeIntervalSince1970 + token.expires_in
        )
    }

    private func refresh(_ session: TokenStore.Session) async throws -> TokenStore.Session {
        guard let base = OpsConfig.supabaseURL else { throw OpsError(message: "Supabase URL is not configured") }
        var request = URLRequest(url: base.appending(path: "auth/v1/token").appending(queryItems: [
            URLQueryItem(name: "grant_type", value: "refresh_token"),
        ]))
        request.httpMethod = "POST"
        request.setValue(OpsConfig.supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["refresh_token": session.refreshToken])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            // The refresh token is spent; the caller must sign in again.
            TokenStore.clear()
            throw OpsError(message: "Session expired. Please sign in again.")
        }
        let token = try JSONDecoder.ops.decode(TokenResponse.self, from: data)
        let fresh = TokenStore.Session(
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date().timeIntervalSince1970 + token.expires_in
        )
        TokenStore.save(fresh)
        return fresh
    }

    /// A valid access token, refreshing first if the stored one is near expiry.
    private func authorised() async throws -> String {
        guard let session = TokenStore.load() else { throw OpsError(message: "Not signed in") }
        if session.isFresh { return session.accessToken }
        return try await refresh(session).accessToken
    }

    // MARK: - Ops routes

    private func send<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        as _: T.Type,
        retryOn401: Bool = true
    ) async throws -> T {
        guard let base = OpsConfig.apiBaseURL else { throw OpsError(message: "API URL is not configured") }
        var request = URLRequest(url: base.appending(path: path))
        request.httpMethod = method
        request.setValue("Bearer \(try await authorised())", forHTTPHeaderField: "Authorization")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        // One retry covers a token that expired between the check and the call.
        if status == 401, retryOn401, let session = TokenStore.load() {
            _ = try await refresh(session)
            return try await send(path, method: method, body: body, as: T.self, retryOn401: false)
        }
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder.ops.decode(ErrorBody.self, from: data))?.error
            throw OpsError(message: message ?? "Request failed (\(status))")
        }
        return try JSONDecoder.ops.decode(T.self, from: data)
    }

    func summary() async throws -> OpsSummary {
        try await send("api/ops/summary", as: OpsSummary.self)
    }

    func requests(status: String = "requested") async throws -> [BookingRow] {
        struct Wrapper: Decodable { let bookings: [BookingRow] }
        return try await send("api/ops/requests?status=\(status)", as: Wrapper.self).bookings
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

/// Lets `send` take a heterogeneous body without making the whole call generic
/// over the request type as well as the response.
private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) { encode = wrapped.encode }
    func encode(to encoder: Encoder) throws { try encode(encoder) }
}
