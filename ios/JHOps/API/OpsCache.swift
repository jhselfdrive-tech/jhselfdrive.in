import Foundation
/// Read-only screen snapshots. No detail/calendar cache and no queued writes.
enum OpsCache {
    private static var directory: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: OpsConfig.appGroup)?
            .appending(path: "ScreenCache", directoryHint: .isDirectory)
    }
    private struct Envelope<T: Codable>: Codable { let value: T; let savedAt: Date }
    static func load<T: Codable>(_ key: String, as: T.Type) -> (T,Date)? {
        guard let dir = directory, let data = try? Data(contentsOf: dir.appending(path: key)),
              let saved = try? JSONDecoder().decode(Envelope<T>.self, from: data) else { return nil }
        return (saved.value,saved.savedAt)
    }
    static func save<T: Codable>(_ value: T, key: String) {
        guard TokenStore.load() != nil, let dir = directory, let data = try? JSONEncoder().encode(Envelope(value: value,savedAt: Date())) else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? data.write(to: dir.appending(path: key), options: [.atomic,.completeFileProtection])
    }
    static func clear() { if let dir = directory { try? FileManager.default.removeItem(at: dir) } }
}
