import SwiftUI
import PhotosUI
import WebKit
struct PendingPhoto: Identifiable { let id = UUID(); let data: Data; var uploaded = false; var error: String? }
@Observable @MainActor final class MediaUploadModel {
    var photos: [PendingPhoto] = []
    var busy = false
    var preparing = false
    var error: String?
    func add(_ data: Data) async {
        preparing = true
        do { let jpeg = try await Task.detached(priority:.userInitiated) { try prepareJPEG(data) }.value; photos.append(PendingPhoto(data:jpeg)) }
        catch { self.error = error.localizedDescription }; preparing = false
    }
    func upload(path:String,fields:[String:String]) async {
        busy = true; error = nil
        for index in photos.indices where !photos[index].uploaded {
            do { _ = try await OpsAPI.shared.upload(path,data:photos[index].data,filename:"photo-\(photos[index].id).jpg",mime:"image/jpeg",fields:fields); photos[index].uploaded = true; photos[index].error = nil }
            catch { photos[index].error = error.localizedDescription; break }
        }
        busy = false
    }
}
struct MediaUploadView: View {
    var bookingId: String? = nil
    var vehicleId: String? = nil
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionModel.self) private var session
    @State private var model = MediaUploadModel()
    @State private var selected: [PhotosPickerItem] = []
    @State private var camera = false
    @State private var phase = "delivery"
    @State private var mediaType = "vehicle_condition"
    var body: some View {
        NavigationStack { Form {
            if bookingId != nil { Picker("Phase",selection:$phase) { Text("Delivery").tag("delivery"); Text("Return").tag("return") }; Picker("Type",selection:$mediaType) { ForEach(session.meta?.mediaTypes ?? []) { Text($0.label.capitalized).tag($0.id) } } }
            PhotosPicker(selection:$selected,maxSelectionCount:mediaType == "vehicle_condition" ? 6 : 1,matching:.images) { Label("Choose photos",systemImage:"photo.on.rectangle") }
            if UIImagePickerController.isSourceTypeAvailable(.camera) { Button("Take photo",systemImage:"camera") { camera = true } }
            if model.preparing { ProgressView("Preparing JPEG…") }
            ForEach(model.photos) { photo in
                VStack(alignment:.leading) {
                    if let image = UIImage(data:photo.data) { Image(uiImage:image).resizable().scaledToFit().frame(maxHeight:160) }
                    Label(photo.uploaded ? "Uploaded" : "Ready — \(photo.data.count/1000) KB",systemImage:photo.uploaded ? "checkmark.circle.fill" : "arrow.up.circle")
                    MutationError(message:photo.error)
                }
            }
            MutationError(message:model.error)
            Button { Task { await upload() } } label: { if model.busy { ProgressView("Uploading sequentially…") } else { Text(model.photos.contains { $0.error != nil } ? "Retry remaining photos" : "Upload photos") } }.disabled(model.photos.isEmpty || model.preparing || model.busy || model.photos.allSatisfy(\.uploaded))
        }.disabled(model.busy).navigationTitle(vehicleId == nil ? "Handover media" : "Vehicle photos")
            .toolbar { Button("Done") { dismiss() }.disabled(model.busy || model.preparing) }
            .onChange(of:selected) { _,items in Task { for item in items { do { if let data = try await item.loadTransferable(type:Data.self) { await model.add(data) } } catch { model.error = error.localizedDescription } }; selected = [] } }
            .sheet(isPresented:$camera) { CameraPicker { data in Task { await model.add(data) } } }
        }
    }
    private func upload() async {
        if mediaType != "vehicle_condition",model.photos.filter({ !$0.uploaded }).count>1 { model.error = "Upload one image per licence slot."; return }
        if let bookingId { await model.upload(path:"bookings/\(bookingId)/media",fields:["phase":phase,"mediaType":mediaType]) }
        else if let vehicleId { await model.upload(path:"vehicles/\(vehicleId)/photos",fields:[:]) }
    }
}
struct LicencePreview: View {
    let url: URL
    @State private var expired = false
    var body: some View { NavigationStack { Group { if expired { ContentUnavailableView("Preview expired",systemImage:"lock",description:Text("Reveal the licence again to view it.")) } else { RestrictedDocumentView(url:url) } }.padding().navigationTitle("Restricted licence").task { try? await Task.sleep(for:.seconds(60)); expired = true } } }
}

/// A memory-only WebKit store supports existing PDF licences as well as photos.
private struct RestrictedDocumentView: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame:.zero,configuration:config)
        view.load(URLRequest(url:url,cachePolicy:.reloadIgnoringLocalCacheData))
        return view
    }
    func updateUIView(_ view: WKWebView,context: Context) {}
}
