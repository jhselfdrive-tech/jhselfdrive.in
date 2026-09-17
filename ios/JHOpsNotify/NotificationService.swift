import UserNotifications
import WidgetKit

/// Runs before each push is shown.
///
/// WidgetKit's refresh budget is far too small to keep a widget current by
/// polling, so the push itself carries the new counts: this extension writes
/// them into the App Group store and reloads the timeline. That is what makes
/// the widget update the moment a request arrives rather than up to 20 minutes
/// later.
final class NotificationService: UNNotificationServiceExtension {
    private var handler: ((UNNotificationContent) -> Void)?
    private var content: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        handler = contentHandler
        content = request.content.mutableCopy() as? UNMutableNotificationContent

        if let payload = request.content.userInfo["summary"] as? [String: Any] {
            let summary = OpsSummary(
                pendingRequests: payload["pendingRequests"] as? Int ?? 0,
                overdueReturns: payload["overdueReturns"] as? Int ?? 0,
                pickupsToday: payload["pickupsToday"] as? Int ?? 0,
                unsentMessages: payload["unsentMessages"] as? Int ?? 0
            )
            SharedStore.save(summary)
            WidgetCenter.shared.reloadAllTimelines()
        }

        contentHandler(content ?? request.content)
    }

    /// Called if the extension runs out of time — the notification must still
    /// be delivered, or iOS drops it silently.
    override func serviceExtensionTimeWillExpire() {
        if let handler, let content { handler(content) }
    }
}
