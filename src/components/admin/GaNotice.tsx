import { BarChart3 } from "lucide-react";

export function GaNotice({ result }: { result: { status: "unconfigured" } | { status: "error"; message: string } }) {
  return <div className="admin-notice"><BarChart3 size={18} />{result.status === "unconfigured"
    ? <div><strong>Google Analytics reporting is not connected.</strong><p>Add <code>GA4_PROPERTY_ID</code>, <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code>. See &ldquo;GA4 reporting access&rdquo; in the README.</p></div>
    : <div><strong>Could not load Google Analytics.</strong><p>{result.message}</p></div>}</div>;
}
