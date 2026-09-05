import { CarFront, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <main className="admin-login-page"><section className="admin-login-visual"><Link className="admin-login-brand" href="/"><span>JH</span> JH Self Drive</Link><div className="admin-login-message"><div className="admin-login-icon"><CarFront size={34} /></div><p>Operations console</p><h1>Turn every enquiry into a great journey.</h1><span>Track follow-ups, bookings, customers and demand—all in one private workspace.</span></div><div className="admin-login-trust"><ShieldCheck size={18} /> Customer data stays protected behind two independent access checks.</div></section><section className="admin-login-panel"><div className="admin-login-card"><div className="admin-mobile-logo">JH</div><span className="admin-kicker">Team access</span><h2>Welcome back</h2><p>Sign in with your approved administrator account.</p><LoginForm /><Link className="admin-back-link" href="/">← Return to public website</Link></div></section></main>;
}
