import Foundation

/// Pure presentation rules shared by rows and detail, verified by the model checks.
enum BookingPresentation {
  static func primary(_ status: String) -> String? {
    switch status {
    case "requested": "Approve"
    case "approved": "Confirm"
    case "confirmed": "Start trip (delivery)"
    case "ongoing": "Complete trip (return)"
    default: nil
    }
  }
  static func cards(_ status: String) -> [String] {
    switch status {
    case "requested": ["customer", "money", "notes"]
    case "approved": ["vehicle", "money", "notes"]
    case "confirmed": ["delivery", "licence", "money", "notes"]
    case "ongoing": ["returnDue", "return", "money", "notes"]
    case "completed": ["money", "returnPhotos", "notes"]
    default: ["money", "notes"]
    }
  }
  static func locked(_ status: String) -> Bool { ["cancelled", "rejected"].contains(status) }
}
enum TripCountdown {
  static func text(start: Date, end: Date, status: String, now: Date) -> String? {
    guard !["completed", "cancelled", "rejected"].contains(status) else { return nil }
    let returning = status == "ongoing"
    let target = returning ? end : start
    let seconds = target.timeIntervalSince(now)
    let hours = max(1, Int(seconds < 0 ? floor(abs(seconds) / 3600) : ceil(seconds / 3600)))
    if seconds < 0 { return returning ? "Overdue \(hours)h" : "Pickup was \(hours)h ago" }
    if Calendar.current.isDateInTomorrowRelative(target, now: now) {
      return returning ? "Due back tomorrow" : "Pickup tomorrow"
    }
    if hours >= 48 {
      return "\(returning ? "Due back" : "Pickup") in \(Int(ceil(seconds/86400))) days"
    }
    return "\(returning ? "Due back" : "Pickup") in \(hours)h"
  }
}
extension Calendar {
  fileprivate func isDateInTomorrowRelative(_ date: Date, now: Date) -> Bool {
    self.isDate(date, inSameDayAs: self.date(byAdding: .day, value: 1, to: now)!)
  }
}
