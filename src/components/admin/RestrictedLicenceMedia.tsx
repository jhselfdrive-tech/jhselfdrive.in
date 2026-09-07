"use client";

import { useState } from "react";
import { Eye, LoaderCircle, ShieldAlert } from "lucide-react";
import { revealLicenceMediaAction } from "@/app/admin/actions/handovers";

type LicenceFile = { id: string; label: string };

export function RestrictedLicenceMedia({ files }: { files: LicenceFile[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function reveal(file: LicenceFile) {
    setLoading(file.id);
    setMessage("");
    const result = await revealLicenceMediaAction({ mediaId: file.id });
    setLoading(null);
    if (!result.url) return setMessage(result.message);
    window.open(result.url, "_blank", "noopener,noreferrer");
    setMessage("Restricted link opened. It expires in 60 seconds.");
  }

  return <details className="admin-restricted-media">
    <summary><ShieldAlert size={16} /><span><strong>Restricted licence files</strong><small>Admin verification is required for every reveal.</small></span><b>{files.length}/2</b></summary>
    <div className="admin-restricted-body">
      {files.map((file) => <button className="admin-secondary-button" type="button" onClick={() => reveal(file)} disabled={loading !== null} key={file.id}>
        {loading === file.id ? <LoaderCircle className="animate-spin" size={14} /> : <Eye size={14} />} Reveal {file.label}
      </button>)}
      {!files.length ? <p>No licence files uploaded.</p> : null}
      {message ? <small>{message}</small> : null}
    </div>
  </details>;
}
