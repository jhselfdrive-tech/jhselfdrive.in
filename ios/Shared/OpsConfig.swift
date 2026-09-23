import Foundation

/// App Group shared by the app, the widget and the notification extension.
/// This is what lets all three read the same tokens and the same summary.
enum OpsConfig {
    static let appGroup = "group.in.jhselfdrive.ops"

    /// The App Group is also the Keychain access group, but the Keychain
    /// requires it **team-prefixed** — `<TeamID>.group.in.jhselfdrive.ops`.
    /// A bare app-group name is rejected at codesign, because a provisioning
    /// profile only ever grants `<TeamID>.*`.
    ///
    /// The team comes from Config.xcconfig via Info.plist, like the hosts
    /// below, so no team ID is hard-coded in source. On the free spec, where
    /// no team is set, this degrades to the bare group and TokenStore falls
    /// back to the app's private keychain.
    static var keychainGroup: String {
        let team = string("DEVELOPMENT_TEAM")
        return team.isEmpty ? appGroup : "\(team).\(appGroup)"
    }

    /// Values come from Config.xcconfig via Info.plist, so no host or key is
    /// hard-coded in source.
    static func string(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
    }

    /// The config stores a bare host (optionally with a port) and the scheme
    /// separately, because "//" starts a comment in an xcconfig file and
    /// silently truncates a pasted URL.
    static func url(host: String, scheme: String) -> URL? {
        let scheme = scheme.isEmpty ? "https" : scheme
        guard ["https", "http"].contains(scheme),
              host.range(of: "^[A-Za-z0-9.-]+(:[0-9]+)?$", options: .regularExpression) != nil,
              !host.contains("$("),
              let url = URL(string: "\(scheme)://\(host)"), url.host != nil else { return nil }
        return url
    }

    /// Set OPS_API_SCHEME to http and OPS_API_HOST to <mac-ip>:3000 to test
    /// against `npm run dev` without deploying.
    static var apiBaseURL: URL? { url(host: string("OPS_API_HOST"), scheme: string("OPS_API_SCHEME")) }
    static var supabaseURL: URL? { url(host: string("SUPABASE_HOST"), scheme: "https") }
    static var supabaseKey: String { string("SUPABASE_PUBLISHABLE_KEY") }
}
