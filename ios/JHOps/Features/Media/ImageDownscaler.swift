import Foundation
import ImageIO
import UniformTypeIdentifiers
/// ImageIO downsamples before decoding; JPEG re-encoding omits GPS/EXIF metadata.
nonisolated func downscale(_ data: Data,maxPixel: Int = 1600,quality: CGFloat = 0.7) -> Data? {
    guard let source = CGImageSourceCreateWithData(data as CFData,nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source,0,[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceThumbnailMaxPixelSize:maxPixel,kCGImageSourceCreateThumbnailWithTransform:true] as CFDictionary) else { return nil }
    let result = NSMutableData()
    guard let destination = CGImageDestinationCreateWithData(result,UTType.jpeg.identifier as CFString,1,nil) else { return nil }
    CGImageDestinationAddImage(destination,image,[kCGImageDestinationLossyCompressionQuality:quality] as CFDictionary)
    guard CGImageDestinationFinalize(destination) else { return nil }; return result as Data
}
nonisolated func prepareJPEG(_ data: Data) throws -> Data {
    guard var jpeg = downscale(data) else { throw OpsError(message:"Could not read this image.") }
    if jpeg.count>1_500_000 { guard let retry = downscale(data,quality:0.5) else { throw OpsError(message:"Could not convert this photo.") }; jpeg = retry }
    guard jpeg.count<=3_500_000 else { throw OpsError(message:"This photo is too large. Choose a smaller image.") }; return jpeg
}
