import { Fragment, ViewTransition, type ReactNode } from "react";
import { getSiteFragment } from "@/lib/site-content";
import { withLayeredHeroArt } from "@/lib/hero-art";
import type { PageSlug } from "@/lib/site";
import { InquiryForm } from "@/components/InquiryForm";
import { CareerApplicationForm } from "@/components/CareerApplicationForm";
import { otpRequired } from "@/lib/otp";
import Image from "next/image";

// Only navigations started by SiteInteractions carry the "page" type, so
// browser back/forward and in-page updates swap instantly instead of animating.
const pageTransition = { page: "page-swap", default: "none" } as const;

// Placeholders in site-content/*.html that are replaced with interactive React sections.
const slots: Record<string, () => ReactNode> = {
  AIRAVUT_INQUIRY_SECTION_SLOT: () => <InquirySection />,
  AIRAVUT_CAREER_APPLICATION_SLOT: () => <CareerApplicationSection />
};
const slotPattern = new RegExp(`(${Object.keys(slots).join("|")})`);

export async function ContentPage({ slug }: { slug: PageSlug }) {
  const html = withLayeredHeroArt(await getSiteFragment(slug));
  const parts = html.split(slotPattern);

  return (
    <ViewTransition enter={pageTransition} exit={pageTransition} default="none">
      <main id="main" tabIndex={-1}>
        <div className="page" data-page={slug}>
          {parts.map((part, index) => <Fragment key={index}>{slots[part] ? slots[part]() : <div dangerouslySetInnerHTML={{ __html: part }} />}</Fragment>)}
        </div>
      </main>
    </ViewTransition>
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
            <h2 className="h2">Start a Conversation with Airavut</h2>
            <p className="lede">Connect with the team behind Airavut&apos;s integrated performing arts education ecosystem.</p>
            <p>We welcome enquiries from learners, schools, examination bodies, partners, investors, media and professionals.</p>
            <a className="textlink" href="/talk-to-us#talk-to-us-ways">See ways to work together</a>
          </div>
          <InquiryForm otpRequired={otpRequired()} />
        </div>
      </div>
    </section>
  );
}

function CareerApplicationSection() {
  return (
    <section className="sec sec-a" id="career-apply" aria-labelledby="career-apply-title">
      <Image alt="" className="sec-art art-bottom" fill sizes="100vw" src="/media/ambient-orbit-bottom.svg" />
      <div className="wrap">
        <div className="split">
          <div className="col" style={{ maxWidth: "none" }}>
            <p className="eyebrow">Apply now</p>
            <h2 className="h2" id="career-apply-title">Grow Your Career with Airavut</h2>
            <p className="lede">Share a few details about yourself and the role you are interested in. It takes about three minutes.</p>
            <p>We review applications across teaching, academics, operations, examinations, publishing and technology. If your profile matches an opening, our team will contact you.</p>
            <a className="textlink" href="#career-why">See the roles we hire for</a>
          </div>
          <CareerApplicationForm otpRequired={otpRequired()} />
        </div>
      </div>
    </section>
  );
}
