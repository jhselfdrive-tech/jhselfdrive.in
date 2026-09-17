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

    /// The config stores bare hostnames and the scheme is added here, because
    /// "//" starts a comment in an xcconfig file and silently truncates a
    /// pasted URL.
    private static func https(_ host: String) -> URL? {
        guard !host.isEmpty else { return nil }
        return URL(string: "https://\(host)")
    }

    static var apiBaseURL: URL? { https(string("OPS_API_HOST")) }
    static var supabaseURL: URL? { https(string("SUPABASE_HOST")) }
    static var supabaseKey: String { string("SUPABASE_PUBLISHABLE_KEY") }
}
