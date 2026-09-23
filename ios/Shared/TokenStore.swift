import Foundation
import Security

/// Supabase session tokens, stored in the Keychain under the **App Group
/// access group** (team-prefixed, see `OpsConfig.keychainGroup`) rather than
/// the app's private keychain.
///
/// This is the specific thing that makes the widget work: a widget extension is
/// a separate process with its own keychain, so a token saved privately by the
/// app would leave the widget unable to authenticate and permanently blank.
enum TokenStore {
    private static let service = "in.jhselfdrive.ops.session"
    private static let account = "supabase"
    private static let accessGroup = OpsConfig.keychainGroup

    struct Session: Codable, Sendable {
        var accessToken: String
        var refreshToken: String
        /// Unix seconds. Refreshed slightly early to avoid racing expiry.
        var expiresAt: Double

        var isFresh: Bool { expiresAt - 60 > Date().timeIntervalSince1970 }
    }

    /// App Groups is a paid-membership entitlement. On a free Personal Team the
    /// keychain rejects the access group with errSecMissingEntitlement, so every
    /// operation falls back to the app's private keychain. The app then works
    /// either way; only the widget needs the shared group, and the widget needs
    /// a paid membership regardless.
    private static func baseQuery(shared: Bool) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        if shared { query[kSecAttrAccessGroup as String] = accessGroup }
        return query
    }

    private static let missingEntitlement: OSStatus = -34018

    static func save(_ session: Session) {
        guard let data = try? JSONEncoder().encode(session) else { return }
        for shared in [true, false] {
            SecItemDelete(baseQuery(shared: shared) as CFDictionary)
            var query = baseQuery(shared: shared)
            query[kSecValueData as String] = data
            // Available after first unlock so a push arriving on a locked phone
            // can still refresh the widget.
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            let status = SecItemAdd(query as CFDictionary, nil)
            if status == errSecSuccess { return }
            if status != missingEntitlement { return }
        }
    }

    static func load() -> Session? {
        for shared in [true, false] {
            var query = baseQuery(shared: shared)
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            if status == errSecSuccess, let data = item as? Data {
                return try? JSONDecoder().decode(Session.self, from: data)
            }
            if status != missingEntitlement { return nil }
        }
        return nil
    }

    static func clear() {
        for shared in [true, false] {
            SecItemDelete(baseQuery(shared: shared) as CFDictionary)
        }
    }
}
