import SwiftUI
import WidgetKit
@Observable @MainActor final class SessionModel {
    var isSignedIn = TokenStore.load() != nil
    var meta: Meta?
    var needsUpdate = false
    private var metaLoadedAt = Date.distantPast
    func signIn(email: String,password: String) async throws {
        let token = try await OpsAPI.shared.signIn(email:email,password:password)
        OpsCache.clear()
        TokenStore.save(token)
        // Summary is an established admin-only endpoint, so login also works
        // before the additive API rollout reaches the production server.
        do { _ = try await OpsAPI.shared.summary() }
        catch { TokenStore.clear(); throw error }
        isSignedIn = true
    }
    func loadMeta() async {
        guard Date().timeIntervalSince(metaLoadedAt) > 60 else { return }
        metaLoadedAt = Date()
        if let cached = OpsCache.load("meta",as:Meta.self) { meta = cached.0 }
        if let value = try? await OpsAPI.shared.read("meta",as:Meta.self) { meta = value; OpsCache.save(value,key:"meta") }
        let build = Int(Bundle.main.object(forInfoDictionaryKey:"CFBundleVersion") as? String ?? "1") ?? 1
        needsUpdate = (meta?.minAppBuild ?? 1)>build
    }
    func expire() { TokenStore.clear(); OpsCache.clear(); SharedStore.save(.empty); WidgetCenter.shared.reloadAllTimelines(); isSignedIn = false; meta = nil; needsUpdate = false; metaLoadedAt = .distantPast }
    func signOut() async {
        if let token = AppDelegate.currentDeviceToken { try? await OpsAPI.shared.unregisterDevice(token:token) }
        expire()
    }
    func label(_ status: String) -> String { meta?.statuses.first { $0.id == status }?.label ?? status.capitalized }
}
