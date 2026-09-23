import Foundation
struct Multipart: Sendable {
    let data: Data
    let contentType: String
    init(data file: Data, filename: String, mime: String, fields: [String:String]) {
        let boundary = "JHOps-\(UUID().uuidString)"
        contentType = "multipart/form-data; boundary=\(boundary)"
        var result = Data()
        func append(_ value: String) { result.append(Data(value.utf8)) }
        func safe(_ value: String) -> String { value.replacingOccurrences(of: "\"", with: "").replacingOccurrences(of: "\r", with: "").replacingOccurrences(of: "\n", with: "") }
        for (key,value) in fields.sorted(by: { $0.key < $1.key }) {
            append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(safe(key))\"\r\n\r\n\(value)\r\n")
        }
        append("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(safe(filename))\"\r\nContent-Type: \(safe(mime))\r\n\r\n")
        result.append(file)
        append("\r\n--\(boundary)--\r\n")
        data = result
    }
}
