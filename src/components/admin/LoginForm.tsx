"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "@/app/admin/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {} as LoginState);
  return <form className="admin-login-form" action={action}>
    <div className="admin-field"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" name="email" autoComplete="username" placeholder="you@jhselfdrive.in" required /></div>
    <div className="admin-field"><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" name="password" autoComplete="current-password" placeholder="Enter your password" minLength={8} required /></div>
    {state.message ? <p className="admin-form-error" role="alert">{state.message}</p> : null}
    <button className="admin-primary-button" disabled={pending} type="submit">{pending ? <><LoaderCircle size={17} className="animate-spin" /> Signing in…</> : <>Sign in securely <ArrowRight size={17} /></>}</button>
    <p className="admin-login-security"><LockKeyhole size={13} /> Protected by Supabase Auth and an administrator allowlist.</p>
  </form>;
}
