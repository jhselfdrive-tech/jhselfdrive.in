import { CarFront, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return <main className="admin-login-page"><section className="admin-login-visual"><Link className="admin-login-brand" href="/"><span>JH</span> self drive</Link><div className="admin-login-message"><div className="admin-login-icon"><CarFront size={34} /></div><p>Your daily workspace</p><h1>Every journey.<br />All in one place.</h1><span>Keep your fleet moving, your bookings organised, and your customers ready for the road.</span></div><div className="admin-login-trust"><ShieldCheck size={18} /> Secure access for the JH Self Drive team.</div></section><section className="admin-login-panel"><div className="admin-login-card"><div className="admin-mobile-logo">JH</div><span className="admin-kicker">JH OPERATIONS</span><h2>Welcome back.</h2><p>Sign in to manage your day.</p><LoginForm /><Link className="admin-back-link" href="/">← Back to the website</Link></div></section></main>;
}
