import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
@main struct ModelChecks {
    static func main() throws {
        // Same displayed time on the 23rd/25th, different invisible seconds.
        let pickup = try Date("2026-09-23T09:00:01+05:30", strategy: .iso8601)
        let returning = try Date("2026-09-25T09:00:59+05:30", strategy: .iso8601)
        precondition(ceil(returning.timeIntervalSince(pickup) / 86400) == 3)
        precondition(ceil(returning.bookingMinute.timeIntervalSince(pickup.bookingMinute) / 86400) == 2)
        precondition(pickup.bookingMinute.ISO8601Format().hasSuffix(":00Z"))
        precondition(pickup.bookingMinute.addingTimeInterval(86400).timeIntervalSince(pickup.bookingMinute) == 86400)
        precondition(ceil(returning.bookingMinute.addingTimeInterval(60).timeIntervalSince(pickup.bookingMinute) / 86400) == 3)
        precondition(OpsConfig.url(host:"https:",scheme:"https") == nil)
        precondition(OpsConfig.url(host:"https://example.supabase.co",scheme:"https") == nil)
        precondition(OpsConfig.url(host:"example.supabase.co",scheme:"https")?.host == "example.supabase.co")
        precondition(OpsConfig.url(host:"192.168.1.2:3000",scheme:"http")?.port == 3000)
        let oldDetail = Data("""
        {"id":"b","status":"approved","statusLabel":"Approved","customerName":"Meera","phone":"+919999999999","carLabel":"Swift","vehicleLabel":null,"startAt":"2026-09-23T10:00:00+05:30","endAt":"2026-09-24T10:00:00.123+05:30","notes":null,"amountTotal":2400,"collected":1000,"balance":1400,"deposit":5000,"actions":[{"to":"confirmed","label":"Confirm"}],"dueMessages":0,"payments":[]}
        """.utf8)
        let booking = try JSONDecoder.ops.decode(BookingDetail.self,from:oldDetail)
        precondition(booking.customerId == nil && booking.media == nil && booking.handovers == nil)
        precondition(booking.endAt > booking.startAt && booking.balance == 1400)
        let roundTrip = try JSONDecoder().decode(BookingDetail.self,from:JSONEncoder().encode(booking))
        precondition(roundTrip.id == booking.id && roundTrip.endAt == booking.endAt)

        let binary = Data([0,255,13,10,22])
        let multipart = Multipart(data:binary,filename:"front\"\r\n.jpg",mime:"image/jpeg",fields:["phase":"delivery"])
        precondition(multipart.data.range(of:binary) != nil)
        let text = String(decoding:multipart.data,as:UTF8.self)
        precondition(text.contains("Content-Type: image/jpeg") && text.contains("filename=\"front.jpg\""))
        let boundary = String(multipart.contentType.split(separator:"=").last!)
        precondition(text.hasSuffix("--\(boundary)--\r\n"))

        let context = CGContext(data:nil,width:3000,height:2000,bitsPerComponent:8,bytesPerRow:0,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
        context.setFillColor(CGColor(red:0.93,green:0.41,blue:0.3,alpha:1)); context.fill(CGRect(x:0,y:0,width:3000,height:2000))
        let source = NSMutableData()
        let destination = CGImageDestinationCreateWithData(source,UTType.png.identifier as CFString,1,nil)!
        CGImageDestinationAddImage(destination,context.makeImage()!,[kCGImagePropertyGPSDictionary:[kCGImagePropertyGPSLatitude:9.37,kCGImagePropertyGPSLongitude:78.83]] as CFDictionary)
        precondition(CGImageDestinationFinalize(destination))
        let jpeg = try prepareJPEG(source as Data)
        let output = CGImageSourceCreateWithData(jpeg as CFData,nil)!
        precondition(CGImageSourceGetType(output) as String? == UTType.jpeg.identifier)
        let properties = CGImageSourceCopyPropertiesAtIndex(output,0,nil)! as NSDictionary
        precondition((properties[kCGImagePropertyPixelWidth] as! Int) == 1600)
        precondition((properties[kCGImagePropertyPixelHeight] as! Int) <= 1600)
        precondition(properties[kCGImagePropertyGPSDictionary] == nil)
        precondition(jpeg.count <= 3_500_000)
        precondition(downscale(Data("invalid image".utf8)) == nil)
        print("Swift checks passed: rental minute precision, old detail compatibility, dates, cache coding, multipart bytes, JPEG size/type and metadata stripping.")
    }
}
