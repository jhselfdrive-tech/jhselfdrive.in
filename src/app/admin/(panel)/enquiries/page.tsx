import { Filter, Inbox } from "lucide-react";
import { site } from "@/content/site";
import { listEnquiries } from "@/lib/admin/data";
import { EnquiryRow } from "@/components/admin/EnquiryRow";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const filters = { status: typeof raw.status === "string" ? raw.status : "all", car: typeof raw.car === "string" ? raw.car : "all", from: typeof raw.from === "string" ? raw.from : "", to: typeof raw.to === "string" ? raw.to : "" };
  const enquiries = await listEnquiries(filters);
  return <><div className="admin-page-head"><div><span className="admin-overline">Follow-up pipeline</span><h1>Enquiry inbox</h1><p>{enquiries.length} enquiries match the current view.</p></div></div><form className="admin-filters"><div className="admin-filter"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={filters.status}><option value="all">All statuses</option><option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option><option value="lost">Lost</option></select></div><div className="admin-filter"><label htmlFor="car">Car</label><select id="car" name="car" defaultValue={filters.car}><option value="all">All cars</option>{site.fleet.map((car) => <option key={car.slug} value={car.slug}>{car.name}</option>)}</select></div><div className="admin-filter"><label htmlFor="from">From</label><input id="from" type="date" name="from" defaultValue={filters.from} /></div><div className="admin-filter"><label htmlFor="to">To</label><input id="to" type="date" name="to" defaultValue={filters.to} /></div><button className="admin-primary-button" type="submit"><Filter size={14} /> Apply filters</button></form><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Trip</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead><tbody>{enquiries.map((enquiry) => <EnquiryRow enquiry={enquiry} key={enquiry.id} />)}</tbody></table>{!enquiries.length ? <div className="admin-empty"><Inbox size={24} style={{margin:"0 auto 10px"}} />No enquiries in this view.</div> : null}</div></>;
}
