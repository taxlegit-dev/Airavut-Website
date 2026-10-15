import { getSiteFragment } from "@/lib/site-content";
import type { PageSlug } from "@/lib/site";
import { InquiryForm } from "@/components/InquiryForm";
import Image from "next/image";

export async function ContentPage({ slug }: { slug: PageSlug }) {
  const html = await getSiteFragment(slug);
  const [before, after] = html.split("AIRAVUT_INQUIRY_SECTION_SLOT");

  return (
    <main id="main" tabIndex={-1}>
      <div className="page" data-page={slug}>
        <div dangerouslySetInnerHTML={{ __html: before }} />
        {after !== undefined ? <InquirySection /> : null}
        {after !== undefined ? <div dangerouslySetInnerHTML={{ __html: after }} /> : null}
      </div>
    </main>
  );
}

function InquirySection() {
  return (
    <section className="sec sec-a" id="talk-to-us-start">
      <Image alt="" className="sec-art art-tr" fill sizes="100vw" src="/media/ambient-network-top.svg" />
      <div className="wrap">
        <div className="split">
          <div className="col" style={{ maxWidth: "none" }}>
            <p className="eyebrow">Start a conversation</p>
            <h2 className="h2">Start a Conversation with Airavut.</h2>
            <p className="lede">Airavut Education Ventures is building an integrated performing arts education and skill development platform across schools, examinations, certification and publishing.</p>
            <p>We welcome conversations with investors, bankers, universities, schools, examination bodies, strategic partners, media and professionals who want to work with the Airavut ecosystem.</p>
            <a className="textlink" href="/talk-to-us#talk-to-us-ways">See ways to work together</a>
          </div>
          <InquiryForm />
        </div>
      </div>
    </section>
  );
}
