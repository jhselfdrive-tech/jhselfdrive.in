import Foundation

/// App Group shared by the app, the widget and the notification extension.
/// This is what lets all three read the same tokens and the same summary.
enum OpsConfig {
    static let appGroup = "group.in.jhselfdrive.ops"

    /// Values come from Config.xcconfig via Info.plist, so no host or key is
    /// hard-coded in source.
    static func string(_ key: String) -> String {
        (Bundle.main.object(forInfoDictionaryKey: key) as? String ?? "")
            .trimmingCharacters(in: .whitespaces)
    }

    /// The config stores a bare host (optionally with a port) and the scheme
    /// separately, because "//" starts a comment in an xcconfig file and
    /// silently truncates a pasted URL.
    private static func url(host: String, scheme: String) -> URL? {
        guard !host.isEmpty else { return nil }
        return URL(string: "\(scheme.isEmpty ? "https" : scheme)://\(host)")
    }

    /// Set OPS_API_SCHEME to http and OPS_API_HOST to <mac-ip>:3000 to test
    /// against `npm run dev` without deploying.
    static var apiBaseURL: URL? { url(host: string("OPS_API_HOST"), scheme: string("OPS_API_SCHEME")) }
    static var supabaseURL: URL? { url(host: string("SUPABASE_HOST"), scheme: "https") }
    static var supabaseKey: String { string("SUPABASE_PUBLISHABLE_KEY") }
}
