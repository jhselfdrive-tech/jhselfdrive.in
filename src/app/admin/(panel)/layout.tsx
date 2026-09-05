import Link from "next/link";
import { BarChart3, CalendarDays, CarFront, ExternalLink, Inbox, LogOut, Users } from "lucide-react";
import { verifyAdmin } from "@/lib/admin/auth";
import { signOutAction } from "@/app/admin/actions/auth";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  return <div className="admin-app"><aside className="admin-sidebar"><Link className="admin-brand" href="/admin"><span>JH</span><div>JH Self Drive<small>Operations</small></div></Link><nav>{nav.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon size={18} /><span>{label}</span></Link>)}</nav><div className="admin-side-bottom"><a href="/" target="_blank" rel="noreferrer"><ExternalLink size={17} /> Public website</a><form action={signOutAction}><button type="submit"><LogOut size={17} /> Sign out</button></form></div></aside><div className="admin-content"><header className="admin-topbar"><div className="admin-mobile-brand"><CarFront size={20} /> JH Operations</div><div className="admin-user"><span>{admin.fullName}</span><small>{admin.email}</small></div></header><div className="admin-page">{children}</div><nav className="admin-mobile-nav">{nav.map(({ href, label, icon: Icon }) => <Link href={href} key={href}><Icon size={19} /><span>{label}</span></Link>)}</nav></div></div>;
}
