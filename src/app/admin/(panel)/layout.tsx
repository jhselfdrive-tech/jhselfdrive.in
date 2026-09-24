import Link from "next/link";
import { CarFront, ExternalLink, LogOut, Plus } from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { verifyAdmin } from "@/lib/admin/auth";
import { signOutAction } from "@/app/admin/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await verifyAdmin();
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/admin"><span>JH</span><div>self drive<small>Operations workspace</small></div></Link>
      <span className="admin-nav-caption">WORKSPACE</span>
      <AdminNavigation />
      <div className="admin-side-bottom"><a href="/" target="_blank" rel="noreferrer"><ExternalLink size={17} /> View website</a><form action={signOutAction}><button type="submit"><LogOut size={17} /> Sign out</button></form></div>
    </aside>
    <div className="admin-content">
      <header className="admin-topbar"><div className="admin-workspace-label"><CarFront size={19} /><span>JH Operations <small>Ramanathapuram</small></span></div><div className="admin-topbar-actions"><Link className="admin-quick-booking" href="/admin/bookings/new"><Plus size={16} /> New booking</Link><div className="admin-user"><span>{admin.fullName}</span><small>{admin.email}</small></div><form className="admin-mobile-signout" action={signOutAction}><button type="submit" aria-label="Sign out"><LogOut size={18} /></button></form></div></header>
      <main className="admin-page">{children}</main>
      <AdminNavigation mobile />
    </div>
  </div>;
}
