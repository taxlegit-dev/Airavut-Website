import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="not-found"><p className="eyebrow">404</p><h1 className="display">That page is not part of the performance.</h1><p className="lede">Return to Airavut’s performing arts education ecosystem.</p><Link className="btn" href="/">Back to home</Link></main>;
}
