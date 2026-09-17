import Foundation

/// The four counts the widget renders. Mirrors GET /api/ops/summary.
struct OpsSummary: Codable, Equatable, Sendable {
    var pendingRequests: Int
    var overdueReturns: Int
    var pickupsToday: Int
    var unsentMessages: Int

    static let empty = OpsSummary(pendingRequests: 0, overdueReturns: 0, pickupsToday: 0, unsentMessages: 0)

    /// True when there is genuinely nothing waiting, so the widget can say so
    /// rather than showing a misleading zero next to stale labels.
    var isClear: Bool {
        pendingRequests == 0 && overdueReturns == 0 && pickupsToday == 0 && unsentMessages == 0
    }
}

/// Last-known summary in the App Group, so the widget paints instantly on
/// wake instead of showing a placeholder while it fetches.
enum SharedStore {
    private static let key = "ops.summary"
    private static let stampKey = "ops.summary.updatedAt"

    /// The App Group suite when the entitlement is available (paid membership),
    /// otherwise the app's own defaults. Only the widget genuinely needs the
    /// shared suite, and the widget requires a paid membership anyway.
    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: OpsConfig.appGroup) ?? .standard
    }

    static func save(_ summary: OpsSummary) {
        guard let defaults, let data = try? JSONEncoder().encode(summary) else { return }
        defaults.set(data, forKey: key)
        defaults.set(Date(), forKey: stampKey)
    }

    static func load() -> OpsSummary? {
        guard let defaults, let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(OpsSummary.self, from: data)
    }

    static var updatedAt: Date? { defaults?.object(forKey: stampKey) as? Date }
}
