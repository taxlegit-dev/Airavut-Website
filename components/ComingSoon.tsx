import Image from "next/image";
import Link from "next/link";

// Placeholder landing page for an Ikigai vertical whose own site is not live yet.
// Once the vertical has a domain, next.config.ts redirects this route there instead.
export function ComingSoon({ vertical, description }: { vertical: string; description: string }) {
  return (
    <main id="main" tabIndex={-1} className="coming-soon">
      <Image alt="" className="sec-art art-center" fill priority sizes="100vw" src="/media/ambient-rings-center.svg" />
      <div className="wrap coming-soon-inner">
        <p className="eyebrow">{vertical}</p>
        <h1 className="coming-soon-title">Coming Soon</h1>
        <p className="lede">{description}</p>
        <div className="actions">
          <Link className="btn" href="/ecosystem#ecosystem-verticals">Explore the ecosystem</Link>
          <Link className="ulink" href="/talk-to-us">Talk to Us</Link>
        </div>
      </div>
    </main>
  );
}
