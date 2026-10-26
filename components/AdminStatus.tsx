"use client";

import { useState } from "react";

const inquiryOptions = ["NEW", "CONTACTED", "IN_REVIEW", "CLOSED"];

type StatusOption = string | { value: string; label: string };

export function AdminStatus({
  id,
  initial,
  options = inquiryOptions,
  endpoint = `/api/admin/inquiries/${id}/status`,
  label = "Application status"
}: {
  id: string;
  initial: string;
  options?: readonly StatusOption[];
  endpoint?: string;
  label?: string;
}) {
  const [status, setStatus] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <span className="admin-status-wrap">
      <select
        className={`status status-${status.toLowerCase()}`}
        value={status}
        disabled={state === "saving"}
        aria-label={label}
        onChange={async (event) => {
          const previous = status;
          const next = event.target.value;
          setStatus(next);
          setState("saving");
          try {
            const response = await fetch(endpoint, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
            if (!response.ok) throw new Error("Status update failed");
            setState("saved");
          } catch {
            setStatus(previous);
            setState("error");
          }
        }}
      >
        {options.map((option) => {
          const { value, label: text } = typeof option === "string" ? { value: option, label: option.replace("_", " ") } : option;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
      {state === "saving" ? <small>Saving…</small> : state === "saved" ? <small className="admin-status-saved" role="status">Saved</small> : state === "error" ? <small role="alert">Not saved</small> : null}
    </span>
  );
}
