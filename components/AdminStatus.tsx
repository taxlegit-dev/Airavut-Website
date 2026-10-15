"use client";

import { useState } from "react";

const options = ["NEW", "CONTACTED", "IN_REVIEW", "CLOSED"];

export function AdminStatus({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  return (
    <span className="admin-status-wrap">
      <select
        className={`status status-${status.toLowerCase()}`}
        value={status}
        disabled={state === "saving"}
        aria-label="Application status"
        onChange={async (event) => {
          const previous = status;
          const next = event.target.value;
          setStatus(next);
          setState("saving");
          const response = await fetch(`/api/admin/inquiries/${id}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
          if (!response.ok) { setStatus(previous); setState("error"); } else setState("idle");
        }}
      >
        {options.map((option) => <option key={option} value={option}>{option.replace("_", " ")}</option>)}
      </select>
      {state === "saving" ? <small>Saving…</small> : state === "error" ? <small role="alert">Not saved</small> : null}
    </span>
  );
}
