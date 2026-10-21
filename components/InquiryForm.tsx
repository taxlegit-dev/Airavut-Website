"use client";

// Temporarily disabled Turnstile anti-spam verification:
// import Script from "next/script";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const steps = ["Contact", "Your inquiry"] as const;
const inquiryAreas = [
  "Schools & Universities",
  "Examination & Certification Bodies",
  "Strategic & Institutional Partners",
  "Investors & Financial Institutions",
  "Media"
] as const;

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
    if (value("organisation").length < 2) errors.organisation = "Enter your organisation name.";
    if (!inquiryAreas.includes(value("area") as (typeof inquiryAreas)[number])) errors.area = "Choose an area for your inquiry.";
    const messageText = value("message");
    if (messageText.length === 0) {
      errors.message = "Please enter your message.";
    } else if (messageText.length < 10) {
      errors.message = "Your message is a little too short. Please add a few more details so we can better assist you.";
    }
  }
  return errors;
}

export function InquiryForm() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [selectedArea, setSelectedArea] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  // Temporarily disabled Turnstile anti-spam verification:
  // const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const progress = useMemo(() => `${((step + 1) / steps.length) * 100}%`, [step]);

  const closeDuplicateModal = () => setDuplicateModalOpen(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && duplicateModalOpen) {
        closeDuplicateModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duplicateModalOpen]);

  // Temporarily disabled Turnstile anti-spam verification:
  // const renderTurnstile = useCallback(() => {
  //   if (!siteKey || !turnstileRef.current || !window.turnstile || widgetId.current) return;
  //   widgetId.current = window.turnstile.render(turnstileRef.current, {
  //     sitekey: siteKey,
  //     theme: "dark",
  //     size: "flexible",
  //     callback: (token: string) => setTurnstileToken(token),
  //     "expired-callback": () => setTurnstileToken("")
  //   });
  // }, [siteKey]);

  // useEffect(() => {
  //   if (step === 1) renderTurnstile();
  // }, [step, renderTurnstile]);

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLElement>("[data-area]"));
    const selectArea = (event: Event) => {
      const index = Number.parseInt((event.currentTarget as HTMLElement).dataset.area ?? "", 10);
      const area = inquiryAreas[index];
      if (!area) return;
      setSelectedArea(area);
      setErrors((current) => ({ ...current, area: "" }));
    };
    links.forEach((link) => link.addEventListener("click", selectArea));
    return () => links.forEach((link) => link.removeEventListener("click", selectArea));
  }, []);

  const move = async (direction: 1 | -1) => {
    if (!formRef.current) return;
    if (direction === 1) {
      const nextErrors = firstInvalidField(step, formRef.current);
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      if (first) {
        (formRef.current.elements.namedItem(first) as HTMLElement | null)?.focus();
        return;
      }

      // Check for duplicate inquiry before continuing to step 1
      if (step === 0) {
        const data = new FormData(formRef.current);
        const email = String(data.get("email") ?? "").trim();
        const phone = String(data.get("phone") ?? "").trim();
        if (email || phone) {
          setIsChecking(true);
          try {
            const res = await fetch(`/api/inquiries?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`);
            if (res.ok) {
              const checkData = (await res.json()) as { exists?: boolean; message?: string };
              if (checkData.exists) {
                const dupMsg = checkData.message || "Your inquiry has already been received from this email address or phone number.";
                setDuplicateMessage(dupMsg);
                setMessage(dupMsg);
                setDuplicateModalOpen(true);
                return;
              }
            }
          } catch {
            // If check encounters a network glitch, proceed to next step; submit validation will strictly enforce it
          } finally {
            setIsChecking(false);
          }
        }
      }
    }
    setErrors({});
    setDirection(direction === 1 ? "forward" : "back");
    setStep((current) => Math.min(steps.length - 1, Math.max(0, current + direction)));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const step0Errors = firstInvalidField(0, form);
    const step1Errors = firstInvalidField(1, form);
    const nextErrors = { ...step0Errors, ...step1Errors };
    setErrors(nextErrors);
    if (Object.keys(step0Errors).length) {
      setStep(0);
      const first = Object.keys(step0Errors)[0];
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    if (Object.keys(step1Errors).length) {
      const first = Object.keys(step1Errors)[0];
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }

    // Temporarily disabled Turnstile anti-spam verification:
    // if (siteKey && !turnstileToken) {
    //   setErrors({ turnstile: "Complete the anti-spam check." });
    //   return;
    // }

    setStatus("submitting");
    setMessage("");
    const data = new FormData(form);
    // Temporarily disabled Turnstile anti-spam verification:
    // data.set("turnstileToken", turnstileToken || "development-bypass");

    try {
      const response = await fetch("/api/inquiries", { method: "POST", body: data });
      const result = (await response.json()) as { message?: string; duplicate?: boolean };
      if (!response.ok) {
        if (response.status === 409 || result.duplicate) {
          const dupMsg = result.message || "Your inquiry has already been received from this email address or phone number.";
          setDuplicateMessage(dupMsg);
          setMessage(dupMsg);
          setDuplicateModalOpen(true);
          setStatus("error");
          return;
        }
        throw new Error(result.message || "We could not submit your inquiry.");
      }
      setStatus("success");
      setMessage(result.message || "Your inquiry has been received.");
      form.reset();
      setSelectedArea("");
      setStep(0);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not submit your inquiry. Please try again.");
      // Temporarily disabled Turnstile anti-spam verification:
      // window.turnstile?.reset(widgetId.current);
      // setTurnstileToken("");
    }
  };

  if (status === "success") {
    return (
      <div className="card enq inquiry-success" role="status">
        <span className="success-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">Inquiry received</p>
        <h3>Thank you for reaching out.</h3>
        <p>{message}</p>
        <button type="button" className="btn" onClick={() => { setStatus("idle"); setMessage(""); setSelectedArea(""); }}>
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form className="card enq inquiry-form" data-direction={direction} id="talk-to-us-form" ref={formRef} onSubmit={submit} noValidate aria-busy={status === "submitting"}>
      <div className="inquiry-heading">
        <div>
          <p className="eyebrow">Start a conversation</p>
          <h3>Tell us how we can help.</h3>
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
          <label>
            Full name
            <input
              name="fullName"
              autoComplete="name"
              maxLength={100}
              aria-invalid={Boolean(errors.fullName)}
              onChange={(e) => {
                if (errors.fullName && e.target.value.trim().length >= 2) {
                  setErrors((cur) => { const next = { ...cur }; delete next.fullName; return next; });
                }
              }}
              required
            />
            <FieldError text={errors.fullName} />
          </label>
          <div className="frow">
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                aria-invalid={Boolean(errors.email)}
                onChange={(e) => {
                  if (errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim())) {
                    setErrors((cur) => { const next = { ...cur }; delete next.email; return next; });
                  }
                }}
                required
              />
              <FieldError text={errors.email} />
            </label>
            <label>
              Phone / WhatsApp
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                aria-invalid={Boolean(errors.phone)}
                onChange={(e) => {
                  if (errors.phone && /^[+()\-\s\d]{7,20}$/.test(e.target.value.trim())) {
                    setErrors((cur) => { const next = { ...cur }; delete next.phone; return next; });
                  }
                }}
                required
              />
              <FieldError text={errors.phone} />
            </label>
          </div>
        </fieldset>

        <fieldset className={step === 1 ? "form-step active" : "form-step"} aria-hidden={step !== 1}>
          <legend>Your inquiry</legend>
          <label>
            Organisation
            <input
              name="organisation"
              autoComplete="organization"
              maxLength={150}
              aria-invalid={Boolean(errors.organisation)}
              onChange={(e) => {
                if (errors.organisation && e.target.value.trim().length >= 2) {
                  setErrors((cur) => { const next = { ...cur }; delete next.organisation; return next; });
                }
              }}
              required
            />
            <FieldError text={errors.organisation} />
          </label>
          <label>Area of inquiry<select name="area" value={selectedArea} onChange={(e) => { setSelectedArea(e.target.value); setErrors((current) => ({ ...current, area: "" })); }} aria-invalid={Boolean(errors.area)} required><option value="" disabled>Select an area</option>{inquiryAreas.map((area) => <option key={area} value={area}>{area}</option>)}</select><FieldError text={errors.area} /></label>
          <label>Message<textarea name="message" maxLength={2000} placeholder="Tell us how you would like to work with Airavut (minimum 10 characters)" aria-invalid={Boolean(errors.message)} onChange={(e) => { const val = e.target.value.trim(); if (errors.message) { if (val.length >= 10) { setErrors((cur) => ({ ...cur, message: "" })); } else if (val.length === 0) { setErrors((cur) => ({ ...cur, message: "Please enter your message." })); } else { setErrors((cur) => ({ ...cur, message: "Your message is a little too short. Please add a few more details so we can better assist you." })); } } }} onBlur={(e) => { const val = e.target.value.trim(); if (val.length > 0 && val.length < 10) { setErrors((cur) => ({ ...cur, message: "Your message is a little too short. Please add a few more details so we can better assist you." })); } }} required /><FieldError text={errors.message} /></label>
          {/* Temporarily disabled Turnstile anti-spam verification:
          {siteKey ? <div ref={turnstileRef} className="turnstile-box" /> : process.env.NODE_ENV !== "production" ? <p className="dev-note">Anti-spam verification activates when the Turnstile site key is configured.</p> : null}
          <FieldError text={errors.turnstile} />
          */}
        </fieldset>
      </div>

      {message ? <p className="form-status" role="alert">{message}</p> : null}
      <div className="form-actions">
        {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => move(-1)} disabled={status === "submitting" || isChecking}>Back</button> : <span />}
        {step < steps.length - 1 ? (
          <button type="button" className="btn" onClick={() => move(1)} disabled={isChecking}>
            {isChecking ? <><span className="submit-spinner" aria-hidden="true" />Checking…</> : <>Continue <span aria-hidden="true">→</span></>}
          </button>
        ) : (
          <button type="submit" className="btn" disabled={status === "submitting"}>
            {status === "submitting" ? <><span className="submit-spinner" aria-hidden="true" />Submitting…</> : "Submit inquiry"}
          </button>
        )}
      </div>
      {/* Temporarily disabled Turnstile anti-spam verification:
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="lazyOnload" onLoad={renderTurnstile} /> : null}
      */}

      {duplicateModalOpen ? (
        <div
          className="inquiry-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDuplicateModal();
          }}
        >
          <div
            className="inquiry-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="duplicate-modal-title"
            aria-describedby="duplicate-modal-desc"
          >
            <div className="inquiry-modal-icon" aria-hidden="true">
              ℹ
            </div>
            <h4 id="duplicate-modal-title">Inquiry Already Received</h4>
            <p id="duplicate-modal-desc">
              {duplicateMessage || "Your inquiry has already been received from this email address or phone number."}
            </p>
            <button
              type="button"
              className="btn inquiry-modal-btn"
              onClick={closeDuplicateModal}
              autoFocus
            >
              Understood
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function FieldError({ text }: { text?: string }) {
  return text ? <span className="field-error" role="alert">{text}</span> : null;
}
