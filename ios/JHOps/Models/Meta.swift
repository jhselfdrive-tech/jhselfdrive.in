import Foundation

struct MetaOption: Codable, Identifiable, Hashable, Sendable { let id: String; let label: String }

struct Meta: Codable, Sendable { let apiVersion: Int; let minAppBuild: Int; let categories: [MetaOption]; let statuses: [MetaOption]; let transitionLabels: [String:String]; let paymentKinds: [MetaOption]; let paymentMethods: [MetaOption]; let documentTypes: [MetaOption]; let mediaTypes: [MetaOption] }
