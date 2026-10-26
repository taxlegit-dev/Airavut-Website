"use client";

import { useEffect, useState } from "react";
import { PHONE_ERROR, isValidPhone, phoneDigits } from "@/lib/contact-validation";

type Props = {
  id: string;
  label: string;
  error?: string;
  /** false renders a plain 10-digit phone field without OTP (OTP_REQUIRED="false"). */
  verify?: boolean;
  /** Number to pre-fill, e.g. when re-verifying after the token expired. */
  initialPhone?: string;
  /** Reports the digits typed so far (always 0–10 digits). */
  onPhoneChange?: (phone: string) => void;
  /** Reports the verification token once the OTP is confirmed, or null when it no longer applies. */
  onVerifiedChange: (token: string | null) => void;
};

// Phone field with SMS OTP verification. Renders inputs named "phone" and "phoneVerificationToken"
// so it works inside both controlled forms and plain FormData forms.
export function PhoneVerification({ id, label, error, verify = true, initialPhone = "", onPhoneChange, onVerifiedChange }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"enter" | "sent" | "verified">("enter");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"" | "sending" | "verifying">("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");
  const [testCode, setTestCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const changePhone = (raw: string) => {
    const digits = phoneDigits(raw);
    setPhone(digits);
    onPhoneChange?.(digits);
    if (stage !== "enter") {
      // A different number needs a fresh code.
      setStage("enter"); setToken(""); setCode(""); setNote(""); setTestCode(""); setResendIn(0);
      onVerifiedChange(null);
    }
    setProblem("");
  };

  const sendCode = async () => {
    if (!isValidPhone(phone)) { setProblem(PHONE_ERROR); return; }
    setBusy("sending"); setProblem("");
    try {
      const response = await fetch("/api/otp/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone }) });
      const result = (await response.json().catch(() => ({}))) as { message?: string; resendIn?: number; retryAfter?: number; testCode?: string };
      if (!response.ok) {
        setProblem(result.message || "We could not send the code. Please try again.");
        if (result.retryAfter) setResendIn(result.retryAfter);
        return;
      }
      setStage("sent"); setCode(""); setNote(result.message || "Code sent."); setTestCode(result.testCode ?? ""); setResendIn(result.resendIn ?? 30);
      requestAnimationFrame(() => document.getElementById(`${id}-otp`)?.focus());
    } catch {
      setProblem("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) { setProblem("Enter the 6-digit code."); return; }
    setBusy("verifying"); setProblem("");
    try {
      const response = await fetch("/api/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phone, code }) });
      const result = (await response.json().catch(() => ({}))) as { message?: string; token?: string };
      if (!response.ok || !result.token) { setProblem(result.message || "That code didn't work. Please try again."); return; }
      setStage("verified"); setToken(result.token); setNote(""); setTestCode("");
      onVerifiedChange(result.token);
    } catch {
      setProblem("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  // The form's "please verify" message is stale once a code is on its way or the number is verified.
  const shownError = problem || (stage === "enter" ? error : "");
  return (
    <div className="phone-verify">
      <label htmlFor={id}>
        {label}
        <span className="phone-verify-row">
          <input
            id={id}
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            pattern="[0-9]{10}"
            placeholder="10-digit mobile number"
            value={phone}
            aria-invalid={Boolean(shownError)}
            aria-describedby={shownError ? `${id}-error` : note ? `${id}-note` : undefined}
            onChange={(event) => changePhone(event.target.value)}
            onKeyDown={(event) => { if (verify && event.key === "Enter" && stage === "enter") { event.preventDefault(); sendCode(); } }}
            required
          />
          {!verify ? null : stage === "verified" ? (
            <span className="phone-verify-badge" role="status"><span aria-hidden="true">✓</span> Verified</span>
          ) : (
            <button type="button" className="phone-verify-btn" onClick={sendCode} disabled={busy !== "" || resendIn > 0 || phone.length !== 10}>
              {busy === "sending" ? "Sending…" : stage === "sent" ? (resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP") : resendIn > 0 ? `Wait ${resendIn}s` : "Send OTP"}
            </button>
          )}
        </span>
      </label>
      {stage === "sent" ? (
        <label htmlFor={`${id}-otp`} className="phone-verify-otp">
          Enter the 6-digit code
          <span className="phone-verify-row">
            <input
              id={`${id}-otp`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setProblem(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); verifyCode(); } }}
            />
            <button type="button" className="phone-verify-btn" onClick={verifyCode} disabled={busy !== "" || code.length !== 6}>
              {busy === "verifying" ? "Verifying…" : "Verify"}
            </button>
          </span>
        </label>
      ) : null}
      {note ? <span className="phone-verify-note" id={`${id}-note`} aria-live="polite">{note}</span> : null}
      {testCode ? <span className="dev-note">Test mode (no SMS sent): your code is <strong>{testCode}</strong></span> : null}
      <input type="hidden" name="phoneVerificationToken" value={token} />
      {shownError ? <span className="field-error" id={`${id}-error`} role="alert">{shownError}</span> : null}
    </div>
  );
}
