import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var session: SessionModel
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        VStack(spacing: 22) {
            Spacer()
            VStack(spacing: 8) {
                Image(systemName: "car.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.accentColor)
                Text("JH Ops").font(.largeTitle.weight(.semibold))
                Text("Booking requests and handovers")
                    .font(.subheadline).foregroundStyle(.secondary)
            }

            VStack(spacing: 12) {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                SecureField("Password", text: $password)
                    .textContentType(.password)
            }
            .textFieldStyle(.roundedBorder)

            if let error {
                Text(error).font(.footnote).foregroundStyle(.red).multilineTextAlignment(.center)
            }

            Button {
                Task { await submit() }
            } label: {
                if busy { ProgressView().tint(.white) } else { Text("Sign in").bold() }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(busy || email.isEmpty || password.isEmpty)

            Text("Use the same account as the web admin panel.")
                .font(.caption).foregroundStyle(.secondary)
            Spacer()
        }
        .padding(28)
    }

    private func submit() async {
        busy = true
        error = nil
        do {
            try await session.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
        } catch {
            self.error = error.localizedDescription
        }
        busy = false
    }
}
