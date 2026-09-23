import SwiftUI
import UIKit
struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (Data) -> Void
    @Environment(\.dismiss) private var dismiss
    func makeCoordinator() -> Coordinator { Coordinator(parent:self) }
    func makeUIViewController(context:Context) -> UIImagePickerController { let picker = UIImagePickerController(); picker.sourceType = .camera; picker.delegate = context.coordinator; return picker }
    func updateUIViewController(_ controller:UIImagePickerController,context:Context) {}
    @MainActor final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: CameraPicker
        init(parent:CameraPicker) { self.parent = parent }
        func imagePickerController(_ picker:UIImagePickerController,didFinishPickingMediaWithInfo info:[UIImagePickerController.InfoKey:Any]) {
            // UIKit stays on the main actor; only encoded Data enters the detached downscaler.
            if let image = info[.originalImage] as? UIImage,let data = image.jpegData(compressionQuality:0.95) { parent.onCapture(data) }; parent.dismiss()
        }
        func imagePickerControllerDidCancel(_ picker:UIImagePickerController) { parent.dismiss() }
    }
}
