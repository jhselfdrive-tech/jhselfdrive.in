import { Check } from "lucide-react";
import { updateEnquiryStatusAction } from "@/app/admin/actions/enquiries";
import type { EnquiryStatus } from "@/lib/admin/data";

export function StatusSelect({ id, status }: { id: string; status: EnquiryStatus }) {
  if (status === "converted") return <span className="admin-status admin-status-converted">Converted</span>;
  return <form className="admin-inline-form" action={updateEnquiryStatusAction}><input type="hidden" name="id" value={id} /><select name="status" defaultValue={status} aria-label="Enquiry status"><option value="new">New</option><option value="contacted">Contacted</option><option value="lost">Lost</option></select><button className="admin-icon-button" type="submit" aria-label="Save status"><Check size={14} /></button></form>;
}
