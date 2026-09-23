import Foundation

struct OpsError: LocalizedError {
    let message: String
    var status: Int? = nil
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
        guard let base = OpsConfig.supabaseURL else { throw OpsError(message: "Supabase hostname is invalid. Use the bare hostname in Config.xcconfig, without https://.") }
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
        guard let base = OpsConfig.supabaseURL else { throw OpsError(message: "Supabase hostname is invalid. Use the bare hostname in Config.xcconfig, without https://.") }
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
            NotificationCenter.default.post(name: Notification.Name("in.jhselfdrive.ops.authExpired"), object: nil)
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
    func authorised() async throws -> String {
        guard let session = TokenStore.load() else { throw OpsError(message: "Not signed in") }
        if session.isFresh { return session.accessToken }
        return try await refresh(session).accessToken
    }

    // MARK: - Ops routes

    /// Query items are passed separately, never inline in `path`:
    /// `appending(path:)` percent-encodes "?" to "%3F", which silently turns
    /// the query into part of the path and 404s.
    func send<T: Decodable>(
        _ path: String,
        query: [URLQueryItem] = [],
        method: String = "GET",
        body: (any Encodable)? = nil,
        rawBody: Data? = nil,
        contentType: String? = nil,
        as _: T.Type,
        retryOn401: Bool = true
    ) async throws -> T {
        guard let base = OpsConfig.apiBaseURL else { throw OpsError(message: "API hostname is invalid. Check OPS_API_HOST in Config.xcconfig.") }
        var url = base.appending(path: path)
        if !query.isEmpty { url = url.appending(queryItems: query) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(try await authorised())", forHTTPHeaderField: "Authorization")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        if let rawBody { request.httpBody = rawBody; request.setValue(contentType, forHTTPHeaderField: "Content-Type") }
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        // One retry covers a token that expired between the check and the call.
        if status == 401, retryOn401, let session = TokenStore.load() {
            _ = try await refresh(session)
            return try await send(path, query: query, method: method, body: body, rawBody: rawBody, contentType: contentType, as: T.self, retryOn401: false)
        }
        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder.ops.decode(ErrorBody.self, from: data))?.error
            if status == 401 || status == 403 {
                TokenStore.clear()
                NotificationCenter.default.post(name: Notification.Name("in.jhselfdrive.ops.authExpired"), object: nil)
            }
            throw OpsError(message: message ?? "Request failed (\(status))", status: status)
        }
        return try JSONDecoder.ops.decode(T.self, from: data)
    }

    func summary() async throws -> OpsSummary {
        try await send("api/ops/summary", as: OpsSummary.self)
    }


}

/// Lets `send` take a heterogeneous body without making the whole call generic
/// over the request type as well as the response.
private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) { encode = wrapped.encode }
    func encode(to encoder: Encoder) throws { try encode(encoder) }
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
