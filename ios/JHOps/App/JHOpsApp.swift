import SwiftUI
import WidgetKit
import UserNotifications
@main struct JHOpsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var session = SessionModel()
    var body: some Scene {
        WindowGroup {
            RootView().environment(session).tint(Theme.coral)
                .onChange(of:session.isSignedIn,initial:true) { _,signedIn in if signedIn { delegate.registerForPush() } }
        }
    }
}
struct RootView: View {
    @Environment(SessionModel.self) private var session
    @Environment(\.scenePhase) private var scenePhase
    var body: some View {
        Group { if session.isSignedIn { TabRootView() } else { LoginView() } }
            .onChange(of:scenePhase) { _,phase in if phase == .active { WidgetCenter.shared.reloadAllTimelines(); Task { try? await UNUserNotificationCenter.current().setBadgeCount(0); if session.isSignedIn { await session.loadMeta() } } } }
            .onReceive(NotificationCenter.default.publisher(for:Notification.Name("in.jhselfdrive.ops.authExpired"))) { _ in session.expire() }
    }
}
