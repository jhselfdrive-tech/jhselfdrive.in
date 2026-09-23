import SwiftUI
@Observable @MainActor final class ScreenModel<T: Codable & Sendable> {
    var value: T?
    var error: String?
    var loading = false
    var updatedAt: Date?
    private var generation = 0
    private var loadedKey: String?
    func load(_ path: String, query: [URLQueryItem] = [], cache: String? = nil) async {
        let key = path + "?" + query.map { "\($0.name)=\($0.value ?? "")" }.joined(separator:"&")
        if loadedKey != key { value = nil; updatedAt = nil; loadedKey = key }
        generation += 1
        let current = generation
        if value == nil, let cache, let (saved,date) = OpsCache.load(cache,as:T.self) { value = saved; updatedAt = date }
        loading = true; error = nil
        do {
            let result = try await OpsAPI.shared.read(path,query:query,as:T.self)
            guard current == generation, !Task.isCancelled else { return }
            value = result; updatedAt = Date()
            if let cache { OpsCache.save(result,key:cache) }
        } catch {
            guard current == generation, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
        if current == generation { loading = false }
    }
}
