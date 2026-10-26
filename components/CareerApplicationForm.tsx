"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  EMAIL_PATTERN,
  EXPERIENCE_OPTIONS,
  LIMITS,
  NOTICE_PERIOD_OPTIONS,
  ROLE_OPTIONS,
  isLinkedInUrl,
  isValidPhone,
  normalizeUrl,
  parseHttpUrl
} from "@/lib/career";

const steps = ["Contact", "Profile & links", "Role & motivation"] as const;
const stepFields = [
  ["fullName", "email", "phone", "location"],
  ["linkedinUrl", "resumeUrl", "portfolioUrl", "experience"],
  ["role", "noticePeriod", "whyJoinUs"]
] as const;

type FieldName = (typeof stepFields)[number][number];
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string>>;

const emptyValues: Values = {
  fullName: "", email: "", phone: "", location: "",
  linkedinUrl: "", resumeUrl: "", portfolioUrl: "", experience: "",
  role: "", noticePeriod: "", whyJoinUs: ""
};

function validateField(name: FieldName, raw: string): string {
  const value = raw.trim();
  switch (name) {
    case "fullName": return value.length >= 2 ? "" : "Enter your full name (at least 2 characters).";
    case "email": return EMAIL_PATTERN.test(value) ? "" : "Enter a valid email address.";
    case "phone": return isValidPhone(value) ? "" : "Enter a valid phone or WhatsApp number, e.g. +91 98765 43210.";
    case "location": return value.length >= 2 ? "" : "Enter your current city or location.";
    case "linkedinUrl":
      if (!value) return "Enter your LinkedIn profile URL.";
      return isLinkedInUrl(normalizeUrl(value)) ? "" : "Enter a valid LinkedIn URL, e.g. https://www.linkedin.com/in/your-name.";
    case "resumeUrl":
      if (!value) return "Add a link to your resume or CV.";
      return parseHttpUrl(normalizeUrl(value)) ? "" : "Enter a valid link, e.g. a Google Drive, Dropbox or OneDrive share link.";
    case "portfolioUrl": return !value || parseHttpUrl(normalizeUrl(value)) ? "" : "Enter a valid URL or leave this field empty.";
    case "experience": return (EXPERIENCE_OPTIONS as readonly string[]).includes(value) ? "" : "Choose your total experience.";
    case "role": return (ROLE_OPTIONS as readonly string[]).includes(value) ? "" : "Choose a role or department.";
    case "noticePeriod": return (NOTICE_PERIOD_OPTIONS as readonly string[]).includes(value) ? "" : "Choose your notice period or availability.";
    case "whyJoinUs": {
      // Count the way the server does: runs of spaces collapse to one.
      const length = value.replace(/[ \t]+/g, " ").length;
      if (!value) return "Tell us why you want to join Airavut.";
      if (length < LIMITS.whyJoinUsMin) return `Please write at least ${LIMITS.whyJoinUsMin} characters.`;
      return length > LIMITS.whyJoinUsMax ? `Please keep this under ${LIMITS.whyJoinUsMax} characters.` : "";
    }
  }
}

function validateStep(step: number, values: Values): FieldErrors {
  const errors: FieldErrors = {};
  for (const name of stepFields[step]) {
    const error = validateField(name, values[name]);
    if (error) errors[name] = error;
  }
  return errors;
}

export function CareerApplicationForm() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [values, setValues] = useState<Values>(emptyValues);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const progress = useMemo(() => `${((step + 1) / steps.length) * 100}%`, [step]);
  const submitting = status === "submitting";

  const focusField = (name: string) => {
    requestAnimationFrame(() => (formRef.current?.elements.namedItem(name) as HTMLElement | null)?.focus());
  };

  const update = (name: FieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear an error as soon as the field becomes valid, without nagging while the user is still typing.
    if (errors[name] && !validateField(name, value)) setErrors((current) => ({ ...current, [name]: "" }));
  };

  const revalidate = (name: FieldName) => {
    if (!values[name].trim() && name !== "portfolioUrl") return;
    setErrors((current) => ({ ...current, [name]: validateField(name, values[name]) }));
  };

  const goTo = (next: number) => {
    setDirection(next > step ? "forward" : "back");
    setStep(next);
    setMessage("");
    focusField(stepFields[next][0]);
  };

  const showErrors = (nextErrors: FieldErrors) => {
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) focusField(first);
  };

  const next = () => {
    const stepErrors = validateStep(step, values);
    if (Object.keys(stepErrors).length) return showErrors(stepErrors);
    setErrors({});
    goTo(Math.min(steps.length - 1, step + 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    // Enter on an earlier step advances instead of submitting.
    if (step < steps.length - 1) return next();

    for (let index = 0; index < steps.length; index += 1) {
      const stepErrors = validateStep(index, values);
      if (Object.keys(stepErrors).length) {
        if (index !== step) goTo(index);
        return showErrors(stepErrors);
      }
    }

    setStatus("submitting");
    setMessage("");
    try {
      const payload = {
        ...values,
        linkedinUrl: normalizeUrl(values.linkedinUrl),
        resumeUrl: normalizeUrl(values.resumeUrl),
        portfolioUrl: normalizeUrl(values.portfolioUrl),
        website: honeypot
      };
      const response = await fetch("/api/career-applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string; fields?: string[] };
      if (!response.ok) {
        const serverFields = (result.fields ?? []).filter((name): name is FieldName => name in emptyValues);
        if (serverFields.length) {
          const fieldErrors = Object.fromEntries(serverFields.map((name) => [name, validateField(name, values[name]) || "Please check this field."])) as FieldErrors;
          const firstStep = stepFields.findIndex((fields) => fields.some((name) => serverFields.includes(name)));
          if (firstStep >= 0 && firstStep !== step) goTo(firstStep);
          showErrors(fieldErrors);
        }
        setStatus("error");
        setMessage(result.message || "We could not submit your application. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(result.message || "Thank you. Your application has been received.");
      setValues(emptyValues);
      setErrors({});
      setStep(0);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch {
      setStatus("error");
      setMessage("We could not reach the server. Check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="card enq inquiry-success" role="status">
        <span className="success-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">Application received</p>
        <h3 ref={successRef} tabIndex={-1}>Thank you for applying.</h3>
        <p>{message}</p>
        <button type="button" className="btn" onClick={() => { setStatus("idle"); setMessage(""); }}>
          Submit another application
        </button>
      </div>
    );
  }

  const field = (name: FieldName) => ({
    name,
    id: `career-${name}`,
    value: values[name],
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `career-${name}-error` : undefined,
    onBlur: () => revalidate(name)
  });

  return (
    <form className="card enq inquiry-form career-form" data-direction={direction} id="career-application-form" ref={formRef} onSubmit={submit} noValidate aria-busy={submitting} aria-labelledby="career-form-title">
      <div className="inquiry-heading">
        <div>
          <p className="eyebrow">Apply now</p>
          <h3 id="career-form-title">Tell us about yourself.</h3>
        </div>
        <span aria-live="polite">Step {step + 1} of {steps.length}</span>
      </div>
      <div className="progress-track" aria-hidden="true"><span style={{ width: progress }} /></div>
      <ol className="step-list step-list-3" aria-label="Application progress">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? "✓" : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      <div className="step-panels">
        <fieldset className={step === 0 ? "form-step active" : "form-step"} aria-hidden={step !== 0} disabled={step !== 0}>
          <legend>Contact information</legend>
          <label htmlFor="career-fullName">
            Full name
            <input {...field("fullName")} autoComplete="name" maxLength={LIMITS.fullName} onChange={(e) => update("fullName", e.target.value)} required />
            <FieldError id="career-fullName-error" text={errors.fullName} />
          </label>
          <div className="frow">
            <label htmlFor="career-email">
              Email address
              <input {...field("email")} type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} onChange={(e) => update("email", e.target.value)} required />
              <FieldError id="career-email-error" text={errors.email} />
            </label>
            <label htmlFor="career-phone">
              Phone / WhatsApp number
              <input {...field("phone")} type="tel" autoComplete="tel" inputMode="tel" maxLength={LIMITS.phone} onChange={(e) => update("phone", e.target.value)} required />
              <FieldError id="career-phone-error" text={errors.phone} />
            </label>
          </div>
          <label htmlFor="career-location">
            Current city / location
            <input {...field("location")} autoComplete="address-level2" maxLength={LIMITS.location} onChange={(e) => update("location", e.target.value)} required />
            <FieldError id="career-location-error" text={errors.location} />
          </label>
        </fieldset>

        <fieldset className={step === 1 ? "form-step active" : "form-step"} aria-hidden={step !== 1} disabled={step !== 1}>
          <legend>Profile and links</legend>
          <label htmlFor="career-linkedinUrl">
            LinkedIn profile URL
            <input {...field("linkedinUrl")} type="url" inputMode="url" autoComplete="url" placeholder="https://www.linkedin.com/in/your-name" maxLength={LIMITS.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} required />
            <FieldError id="career-linkedinUrl-error" text={errors.linkedinUrl} />
          </label>
          <label htmlFor="career-resumeUrl">
            Resume / CV link
            <input {...field("resumeUrl")} type="url" inputMode="url" placeholder="Google Drive, Dropbox or OneDrive share link" maxLength={LIMITS.resumeUrl} onChange={(e) => update("resumeUrl", e.target.value)} required />
            <FieldError id="career-resumeUrl-error" text={errors.resumeUrl} />
          </label>
          <label htmlFor="career-portfolioUrl">
            Portfolio / work / reel URL (optional)
            <input {...field("portfolioUrl")} type="url" inputMode="url" placeholder="https://" maxLength={LIMITS.portfolioUrl} onChange={(e) => update("portfolioUrl", e.target.value)} />
            <FieldError id="career-portfolioUrl-error" text={errors.portfolioUrl} />
          </label>
          <label htmlFor="career-experience">
            Total experience
            <select {...field("experience")} onChange={(e) => update("experience", e.target.value)} required>
              <option value="" disabled>Select your experience</option>
              {EXPERIENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <FieldError id="career-experience-error" text={errors.experience} />
          </label>
        </fieldset>

        <fieldset className={step === 2 ? "form-step active" : "form-step"} aria-hidden={step !== 2} disabled={step !== 2}>
          <legend>Role and motivation</legend>
          <div className="frow">
            <label htmlFor="career-role">
              Role / department of interest
              <select {...field("role")} onChange={(e) => update("role", e.target.value)} required>
                <option value="" disabled>Select a role</option>
                {ROLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <FieldError id="career-role-error" text={errors.role} />
            </label>
            <label htmlFor="career-noticePeriod">
              Notice period / availability
              <select {...field("noticePeriod")} onChange={(e) => update("noticePeriod", e.target.value)} required>
                <option value="" disabled>Select availability</option>
                {NOTICE_PERIOD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <FieldError id="career-noticePeriod-error" text={errors.noticePeriod} />
            </label>
          </div>
          <label htmlFor="career-whyJoinUs">
            Why do you want to join Airavut?
            <textarea {...field("whyJoinUs")} maxLength={LIMITS.whyJoinUsMax} placeholder={`Tell us what draws you to Airavut and the role (minimum ${LIMITS.whyJoinUsMin} characters)`} onChange={(e) => update("whyJoinUs", e.target.value)} required />
            <span className="char-count" aria-live="off">{values.whyJoinUs.trim().length} / {LIMITS.whyJoinUsMax}</span>
            <FieldError id="career-whyJoinUs-error" text={errors.whyJoinUs} />
          </label>
        </fieldset>
      </div>

      <div className="hp-field" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
      </div>

      {message ? <p className="form-status" role="alert">{message}</p> : null}
      <div className="form-actions">
        {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)} disabled={submitting}>Back</button> : <span />}
        {step < steps.length - 1 ? (
          <button key="continue" type="submit" className="btn">Continue <span aria-hidden="true">→</span></button>
        ) : (
          <button key="submit" type="submit" className="btn" disabled={submitting}>
            {submitting ? <><span className="submit-spinner" aria-hidden="true" />Submitting…</> : "Submit Application"}
          </button>
        )}
      </div>
    </form>
  );
}

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? <span className="field-error" id={id} role="alert">{text}</span> : null;
}
