import SwiftUI
enum Theme {
    static let coral = Color("Coral"), teal = Color("Teal"), paper = Color("Paper"), surface = Color("Surface"), ink = Color("Ink"), muted = Color("Muted"), sand = Color("Sand"), line = Color("Line")
    static func status(_ status: String) -> Color {
        switch status { case "requested": .orange; case "approved": teal; case "confirmed": .blue; case "ongoing": .green; case "completed": muted; case "cancelled", "rejected": .red; default: muted }
    }
}
struct MoneyText: View { let value: Double; var body: some View { Text(value,format:.currency(code:"INR").precision(.fractionLength(0))) } }
struct StatusChip: View { let status: String; let label: String; var body: some View { Text(label).font(.caption.weight(.semibold)).padding(.horizontal,8).padding(.vertical,4).foregroundStyle(Theme.status(status)).background(Theme.status(status).opacity(0.12),in:Capsule()) } }
struct SectionCard<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View { content.padding(16).frame(maxWidth:.infinity,alignment:.leading).background(Theme.surface,in:RoundedRectangle(cornerRadius:16)).overlay(RoundedRectangle(cornerRadius:16).stroke(Theme.line,lineWidth:0.5)) }
}
struct StatTile: View { let count: Int; let label: String; let symbol: String; var body: some View { SectionCard { VStack(alignment:.leading,spacing:8) { Image(systemName:symbol).foregroundStyle(Theme.teal); Text(count,format:.number).font(.title.bold()); Text(label).font(.caption).foregroundStyle(Theme.muted) } } } }
struct LoadingList: View { var body: some View { ForEach(0..<4,id:\.self) { _ in VStack(alignment:.leading,spacing:8) { Text("Customer and vehicle").font(.headline); Text("Pickup and return details").font(.subheadline) }.redacted(reason:.placeholder).padding(.vertical,8) } } }
struct ErrorState: View { let message: String; let retry: () -> Void; var body: some View { ContentUnavailableView { Label("Couldn’t load this screen",systemImage:"wifi.exclamationmark") } description: { Text(message) } actions: { Button("Retry",action:retry).buttonStyle(.borderedProminent) } } }
struct CacheFooter: View { let error: String?; let date: Date?; var body: some View { if let error { VStack(alignment:.leading,spacing:4) { Text(error); if let date { Text("Showing saved data as of \(date.formatted(date:.omitted,time:.shortened))") } }.font(.caption).foregroundStyle(Theme.muted) } } }
struct DateRangeRow: View { @Binding var start: Date; @Binding var end: Date; var body: some View { DatePicker("Pickup",selection:$start); DatePicker("Return",selection:$end) } }
struct MutationError: View { let message: String?; var body: some View { if let message { Text(message).font(.callout).foregroundStyle(.red).accessibilityLabel("Error: \(message)") } } }
extension View {
    func opsRefresh(_ action: @escaping @MainActor () async -> Void) -> some View { modifier(OpsRefresh(action:action)) }
}
private struct OpsRefresh: ViewModifier {
    @Environment(\.scenePhase) private var phase
    @State private var lastRefresh = Date.distantPast
    let action: @MainActor () async -> Void
    func body(content: Content) -> some View {
        content.task { await refresh() }.refreshable { await refresh() }
            .onReceive(NotificationCenter.default.publisher(for:.opsDataChanged)) { _ in Task { await refresh() } }
            .onChange(of:phase) { _,p in if p == .active && Date().timeIntervalSince(lastRefresh)>60 { Task { await refresh() } } }
    }
    private func refresh() async { lastRefresh = Date(); await action() }
}
