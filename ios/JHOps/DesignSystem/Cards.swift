import SwiftUI

struct Card<Content: View>: View {
  let title: String?
  let collapsible: Bool
  let initiallyExpanded: Bool
  let actionTitle: String?
  let action: (() -> Void)?
  @State private var expanded: Bool
  let content: Content
  init(
    _ title: String? = nil, collapsible: Bool = false, expanded: Bool = true,
    actionTitle: String? = nil, action: (() -> Void)? = nil, @ViewBuilder content: () -> Content
  ) {
    self.title = title
    self.collapsible = collapsible
    self.initiallyExpanded = expanded
    self.actionTitle = actionTitle
    self.action = action
    _expanded = State(initialValue: expanded)
    self.content = content()
  }
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      if let title {
        HStack {
          if collapsible {
            Button {
              withAnimation { expanded.toggle() }
            } label: {
              HStack {
                Text(title.uppercased())
                Image(systemName: expanded ? "chevron.up" : "chevron.down")
              }
            }.accessibilityValue(expanded ? "Expanded" : "Collapsed")
          } else {
            Text(title.uppercased())
          }
          Spacer()
          if let actionTitle, let action {
            Button(actionTitle, action: action).foregroundStyle(Theme.coral)
          }
        }.font(Theme.Font.eyebrow).foregroundStyle(Theme.muted)
      }
      if !collapsible || expanded { content }
    }.padding(18).frame(maxWidth: .infinity, alignment: .leading)
      .background(Theme.surface, in: RoundedRectangle(cornerRadius: 20))
      .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.line, lineWidth: 0.5))
      .onChange(of: initiallyExpanded) { _, value in expanded = value }
  }
}
struct EmptyState: View {
  let title: String
  var symbol = "tray"
  var message = ""
  var body: some View {
    ContentUnavailableView(title, systemImage: symbol, description: Text(message))
  }
}
struct EditableRow: View {
  let label: String
  let value: String
  var enabled = true
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 5) {
          Text(label.uppercased()).font(Theme.Font.eyebrow).foregroundStyle(Theme.muted)
          Text(value).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
        }
        Spacer()
        if enabled { Image(systemName: "pencil").foregroundStyle(Theme.coral) }
      }.padding(.vertical, 4)
    }.disabled(!enabled)
  }
}
struct ActionBar<Actions: View>: View {
  let title: String
  var disabled = false
  let action: () -> Void
  @ViewBuilder let secondary: Actions
  var body: some View {
    HStack(spacing: 12) {
      Button(title, action: action).font(.headline).frame(maxWidth: .infinity).padding(.vertical, 8)
        .buttonStyle(.borderedProminent).disabled(disabled)
      Menu {
        secondary
      } label: {
        Image(systemName: "ellipsis").frame(width: 44, height: 44).background(
          Theme.paper, in: Circle())
      }.accessibilityLabel("More actions")
    }.padding().background(.regularMaterial)
  }
}
struct QuickContact: View {
  let phone: String
  var body: some View {
    HStack(spacing: 10) {
      if let url = callURL(phone) {
        Link(destination: url) { Image(systemName: "phone.fill").frame(width: 44, height: 44) }
          .accessibilityLabel("Call customer")
      }
      Link(destination: whatsappURL(phone: phone, text: "")) {
        Image(systemName: "message.fill").frame(width: 44, height: 44)
      }.accessibilityLabel("WhatsApp customer")
    }.foregroundStyle(Theme.teal).background(Theme.teal.opacity(0.08), in: Capsule()).opacity(
      phone.isEmpty ? 0 : 1
    ).disabled(phone.isEmpty)
  }
}
func callURL(_ phone: String) -> URL? {
  phone.isEmpty ? nil : URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })")
}
struct DiffBanner: View {
  let old: Double
  let new: Double
  @Binding var keepOld: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      ViewThatFits {
        HStack {
          Text("Price changes")
          MoneyText(value: old)
          Image(systemName: "arrow.right")
          MoneyText(value: new)
        }
        VStack(alignment: .leading) {
          Text("Price changes")
          HStack {
            MoneyText(value: old)
            Image(systemName: "arrow.right")
            MoneyText(value: new)
          }
        }
      }
      Toggle("Keep old price", isOn: $keepOld)
    }.font(.subheadline).padding().background(
      Theme.teal.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
  }
}

/// ScrollView cards retain a discoverable delete button and a horizontal swipe.
struct SwipeDeleteRow<Content: View>: View {
  var enabled = true
  let action: () -> Void
  @ViewBuilder let content: Content
  @State private var revealed = false
  var body: some View {
    ZStack(alignment: .trailing) {
      if enabled && revealed {
        Button(role: .destructive, action: action) {
          Image(systemName: "trash").frame(width: 64, height: 52)
        }.buttonStyle(.borderedProminent).tint(.red).accessibilityLabel("Delete")
      }
      content.frame(maxWidth: .infinity, alignment: .leading).padding(
        .trailing, enabled && revealed ? 76 : 0)
    }.simultaneousGesture(
      DragGesture(minimumDistance: 30).onEnded { value in
        guard enabled, abs(value.translation.width) > abs(value.translation.height) else { return }
        withAnimation { revealed = value.translation.width < -30 }
      }
    ).accessibilityAction(named: "Delete") { if enabled { action() } }
  }
}
