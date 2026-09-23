import SwiftUI
struct LoginView: View {
    @Environment(SessionModel.self) private var session
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing:24) {
                    Spacer(minLength:24)
                    VStack(spacing:12) {
                        Image(systemName:"car.fill").font(.largeTitle).foregroundStyle(Theme.coral)
                        Text("JH Ops").font(.system(.largeTitle,design:.serif).weight(.semibold))
                        Text("Your fleet. Your day. In one place.").font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).fixedSize(horizontal:false,vertical:true)
                    }
                    VStack(spacing:12) {
                        TextField("Email",text:$email).textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled()
                        SecureField("Password",text:$password).textContentType(.password)
                    }.textFieldStyle(.roundedBorder)
                    if let error { Text(error).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center).fixedSize(horizontal:false,vertical:true) }
                    Button { Task { await submit() } } label: { if busy { ProgressView().tint(.white) } else { Text("Sign in").bold() } }
                        .buttonStyle(.borderedProminent).controlSize(.large).disabled(busy || email.isEmpty || password.isEmpty)
                    Text("Use the same account as the web admin panel.").font(.caption).foregroundStyle(Theme.muted).multilineTextAlignment(.center).fixedSize(horizontal:false,vertical:true)
                    Spacer(minLength:24)
                }.padding(24).frame(maxWidth:560).frame(maxWidth:.infinity,minHeight:geometry.size.height)
            }.scrollDismissesKeyboard(.interactively).background(Theme.paper)
        }
    }
    private func submit() async { busy = true; error = nil
        do { try await session.signIn(email:email.trimmingCharacters(in:.whitespaces),password:password) }
        catch { self.error = error.localizedDescription }; busy = false
    }
}
