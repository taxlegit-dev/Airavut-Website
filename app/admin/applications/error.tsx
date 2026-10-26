"use client";

import { useEffect } from "react";

export default function ApplicationsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="admin-main">
      <header className="admin-topbar"><div><p className="admin-kicker">Airavut administration</p><h1>Applications</h1></div></header>
      <section className="admin-panel">
        <div className="admin-empty" role="alert">
          <h2>Applications could not be loaded</h2>
          <p>Something went wrong while reading from the database. Please try again.</p>
          <button type="button" className="admin-secondary" onClick={() => retry()}>Try again</button>
        </div>
      </section>
    </main>
  );
}
