"use client";

import Script from "next/script";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const steps = ["Contact", "Learning goals", "Preferences"] as const;
const disciplines = [
  "Vocals – Hindustani",
  "Vocals – Western",
  "Piano / Keyboard",
  "Guitar",
  "Violin",
  "Drums",
  "Tabla",
  "Bansuri (Flute)",
  "Dance – Bharatanatyam",
  "Dance – Kathak",
  "Dance – Western",
  "Theatre – Acting",
  "Other"
];

type FieldErrors = Record<string, string>;

function firstInvalidField(step: number, form: HTMLFormElement): FieldErrors {
  const data = new FormData(form);
  const errors: FieldErrors = {};
  const value = (name: string) => String(data.get(name) ?? "").trim();

  if (step === 0) {
    if (value("fullName").length < 2) errors.fullName = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) errors.email = "Enter a valid email address.";
    if (!/^[+()\-\s\d]{7,20}$/.test(value("phone"))) errors.phone = "Enter a valid phone or WhatsApp number.";
  }
  if (step === 1) {
    if (!value("discipline")) errors.discipline = "Choose a performing arts discipline.";
    if (!value("skillLevel")) errors.skillLevel = "Choose your current skill level.";
    if (value("certificationGoals").length < 3) errors.certificationGoals = "Tell us your certification goal.";
  }
  if (step === 2) {
    if (!value("preferredSchedule")) errors.preferredSchedule = "Enter your preferred schedule.";
    if (!value("learningMode")) errors.learningMode = "Choose a learning mode.";
    if (!data.get("privacyConsent")) errors.privacyConsent = "Please confirm that we may process this inquiry.";
    const file = data.get("portfolio");
    if (file instanceof File && file.size > 10 * 1024 * 1024) errors.portfolio = "The file must be 10 MB or smaller.";
  }
  return errors;
}

export function InquiryForm() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const progress = useMemo(() => `${((step + 1) / steps.length) * 100}%`, [step]);

  const renderTurnstile = useCallback(() => {
    if (!siteKey || !turnstileRef.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      theme: "dark",
      size: "flexible",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken("")
    });
  }, [siteKey]);

  useEffect(() => {
    if (step === 2) renderTurnstile();
  }, [step, renderTurnstile]);

  const move = (direction: 1 | -1) => {
    if (!formRef.current) return;
    if (direction === 1) {
      const nextErrors = firstInvalidField(step, formRef.current);
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (first) {
        (formRef.current.elements.namedItem(first) as HTMLElement | null)?.focus();
        return;
      }
    }
    setErrors({});
    setDirection(direction === 1 ? "forward" : "back");
    setStep((current) => Math.min(steps.length - 1, Math.max(0, current + direction)));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = firstInvalidField(2, event.currentTarget);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (siteKey && !turnstileToken) {
      setErrors({ turnstile: "Complete the anti-spam check." });
      return;
    }

    setStatus("submitting");
    setMessage("");
    const data = new FormData(event.currentTarget);
    data.set("turnstileToken", turnstileToken || "development-bypass");

    try {
      const response = await fetch("/api/inquiries", { method: "POST", body: data });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "We could not submit your inquiry.");
      setStatus("success");
      setMessage(result.message || "Your inquiry has been received.");
      event.currentTarget.reset();
      setStep(0);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not submit your inquiry. Please try again.");
      window.turnstile?.reset(widgetId.current);
      setTurnstileToken("");
    }
  };

  if (status === "success") {
    return (
      <div className="card enq inquiry-success" role="status">
        <span className="success-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">Inquiry received</p>
        <h3>Thank you for reaching out.</h3>
        <p>{message}</p>
        <button type="button" className="btn" onClick={() => { setStatus("idle"); setMessage(""); }}>
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form className="card enq inquiry-form" data-direction={direction} id="talk-to-us-form" ref={formRef} onSubmit={submit} noValidate aria-busy={status === "submitting"}>
      <div className="inquiry-heading">
        <div>
          <p className="eyebrow">Applicant inquiry</p>
          <h3>Tell us how you want to learn.</h3>
        </div>
        <span aria-live="polite">Step {step + 1} of {steps.length}</span>
      </div>
      <div className="progress-track" aria-hidden="true"><span style={{ width: progress }} /></div>
      <ol className="step-list" aria-label="Inquiry progress">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? "✓" : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      <div className="step-panels" aria-live="polite">
        <fieldset className={step === 0 ? "form-step active" : "form-step"} aria-hidden={step !== 0}>
          <legend>Contact details</legend>
          <label>Full name<input name="fullName" autoComplete="name" maxLength={100} aria-invalid={Boolean(errors.fullName)} required /><FieldError text={errors.fullName} /></label>
          <div className="frow">
            <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} aria-invalid={Boolean(errors.email)} required /><FieldError text={errors.email} /></label>
            <label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" maxLength={20} aria-invalid={Boolean(errors.phone)} required /><FieldError text={errors.phone} /></label>
          </div>
        </fieldset>

        <fieldset className={step === 1 ? "form-step active" : "form-step"} aria-hidden={step !== 1}>
          <legend>Learning goals</legend>
          <label>Performing arts discipline<select name="discipline" defaultValue="" aria-invalid={Boolean(errors.discipline)} required><option value="" disabled>Select a discipline</option>{disciplines.map((item) => <option key={item}>{item}</option>)}</select><FieldError text={errors.discipline} /></label>
          <label>Current skill level<select name="skillLevel" defaultValue="" aria-invalid={Boolean(errors.skillLevel)} required><option value="" disabled>Select your level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Professional</option></select><FieldError text={errors.skillLevel} /></label>
          <label>Certification goals<textarea name="certificationGoals" maxLength={1000} placeholder="Tell us what you hope to achieve" aria-invalid={Boolean(errors.certificationGoals)} required /><FieldError text={errors.certificationGoals} /></label>
        </fieldset>

        <fieldset className={step === 2 ? "form-step active" : "form-step"} aria-hidden={step !== 2}>
          <legend>Preferences and portfolio</legend>
          <label>Preferred schedule<input name="preferredSchedule" maxLength={200} placeholder="For example: weekday evenings" aria-invalid={Boolean(errors.preferredSchedule)} required /><FieldError text={errors.preferredSchedule} /></label>
          <fieldset className="mode-field"><legend>Mode of learning</legend><div className="choice-row"><label><input name="learningMode" type="radio" value="ONLINE" /> Online</label><label><input name="learningMode" type="radio" value="IN_PERSON" /> In-person</label></div><FieldError text={errors.learningMode} /></fieldset>
          <label>Audition or portfolio <span className="optional">Optional · PDF, JPG, PNG, MP3 or MP4 · max 10 MB</span><input name="portfolio" type="file" accept=".pdf,.jpg,.jpeg,.png,.mp3,.mp4,application/pdf,image/jpeg,image/png,audio/mpeg,video/mp4" aria-invalid={Boolean(errors.portfolio)} /><FieldError text={errors.portfolio} /></label>
          <label>Remarks <span className="optional">Optional</span><textarea name="remarks" maxLength={2000} placeholder="Anything else we should know?" /></label>
          <label className="consent"><input name="privacyConsent" type="checkbox" value="true" /> <span>I consent to Airavut processing these details to respond to my inquiry.</span></label><FieldError text={errors.privacyConsent} />
          {siteKey ? <div ref={turnstileRef} className="turnstile-box" /> : <p className="dev-note">Anti-spam verification activates when the Turnstile site key is configured.</p>}
          <FieldError text={errors.turnstile} />
        </fieldset>
      </div>

      {message ? <p className="form-status" role="alert">{message}</p> : null}
      <div className="form-actions">
        {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => move(-1)} disabled={status === "submitting"}>Back</button> : <span />}
        {step < steps.length - 1 ? <button type="button" className="btn" onClick={() => move(1)}>Continue <span aria-hidden="true">→</span></button> : <button type="submit" className="btn" disabled={status === "submitting"}>{status === "submitting" ? <><span className="submit-spinner" aria-hidden="true" />Submitting…</> : "Submit inquiry"}</button>}
      </div>
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" onLoad={renderTurnstile} /> : null}
    </form>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? <span className="field-error" role="alert">{text}</span> : null;
}
