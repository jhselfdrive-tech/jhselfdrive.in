import UIKit
import UserNotifications
import WidgetKit

@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate {
    /// Kept so sign-out can unregister this exact device.
    static var currentDeviceToken: String?

    /// Booking id from a notification tapped before the UI was ready.
    static var launchBookingId: String?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func registerForPush() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Self.currentDeviceToken = token
        // Keep this branch aligned with APS_ENVIRONMENT in Config.debug/release.xcconfig.
        // A debug build talks to APNs sandbox; a TestFlight/App Store build to
        // production. The server must target the matching host or Apple
        // rejects the token as BadDeviceToken.
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        Task {
            do {
                try await OpsAPI.shared.registerDevice(token: token, environment: environment, appVersion: version)
            } catch {
                print("Device registration failed: \(error.localizedDescription)")
            }
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Push registration failed: \(error.localizedDescription)")
    }
}

/// UNUserNotificationCenterDelegate is not main-actor isolated while
/// UIApplicationDelegate is, so the conformance needs @preconcurrency to bridge
/// the two without Swift 6 rejecting it as a data race.
extension AppDelegate: @preconcurrency UNUserNotificationCenterDelegate {
    /// Tapping a notification deep-links to the booking it is about.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let info = response.notification.request.content.userInfo
        if let bookingId = info["bookingId"] as? String {
            Self.launchBookingId = bookingId
            NotificationCenter.default.post(name: .openBooking, object: nil, userInfo: ["bookingId": bookingId])
        }
        WidgetCenter.shared.reloadAllTimelines()
        completionHandler()
    }

    /// Show the banner even when the app is already open, so a request that
    /// lands while the operator is on another screen is not missed.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}

extension Notification.Name {
    static let openBooking = Notification.Name("in.jhselfdrive.ops.openBooking")
}
