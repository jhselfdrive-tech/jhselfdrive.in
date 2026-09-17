import SwiftUI
import WidgetKit

@main
struct JHOpsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var session = SessionModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .onChange(of: session.isSignedIn) { _, signedIn in
                    // Registering only once signed in means the device row is
                    // always attached to a known admin.
                    if signedIn { delegate.registerForPush() }
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var session: SessionModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if session.isSignedIn {
                RequestListView()
            } else {
                LoginView()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            // The widget's own refresh budget is small, so nudge it whenever
            // the app comes forward.
            if phase == .active { WidgetCenter.shared.reloadAllTimelines() }
        }
    }
}

@MainActor
final class SessionModel: ObservableObject {
    @Published var isSignedIn: Bool = TokenStore.load() != nil
    /// Set from a notification tap so the list can push straight to it.
    @Published var pendingBookingId: String?

    func signIn(email: String, password: String) async throws {
        let session = try await OpsAPI.shared.signIn(email: email, password: password)
        TokenStore.save(session)
        isSignedIn = true
    }

    func signOut() async {
        if let token = AppDelegate.currentDeviceToken {
            // Best effort: stop this phone receiving pushes for an admin who
            // has signed out of it.
            try? await OpsAPI.shared.unregisterDevice(token: token)
        }
        TokenStore.clear()
        SharedStore.save(.empty)
        WidgetCenter.shared.reloadAllTimelines()
        isSignedIn = false
    }
}
