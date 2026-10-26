// Email and phone rules shared by the Talk to Us and career forms, on both client and server.

// local@domain.tld: letters, digits and . _ % + - in the local part (no leading, trailing or
// doubled dots), dot-separated domain labels and a 2–24 letter top-level domain.
const EMAIL_PATTERN = /^(?!.*\.\.)[a-z0-9_%+-](?:[a-z0-9._%+-]{0,62}[a-z0-9_%+-])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

// Common misspellings of popular providers, mapped to the intended domain.
const PROVIDER_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
  "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com", "gmail.in": "gmail.com", "gmail.co.in": "gmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahho.com": "yahoo.com", "yhoo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.cm": "yahoo.com", "yahoo.om": "yahoo.com",
  "outlok.com": "outlook.com", "outllok.com": "outlook.com", "outloo.com": "outlook.com", "otlook.com": "outlook.com", "outlook.co": "outlook.com", "outlook.cm": "outlook.com",
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.cm": "hotmail.com",
  "iclod.com": "icloud.com", "icoud.com": "icloud.com", "icloud.co": "icloud.com",
  "rediffmial.com": "rediffmail.com", "redifmail.com": "rediffmail.com", "rediffmail.co": "rediffmail.com"
};
// Misspelt ".com" endings on any domain.
const TLD_TYPOS = /\.(con|cmo|comm|coom|vom|xom|ocm|cpm)$/i;

/** Returns an error message, or "" when the email is acceptable. */
export function emailError(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(value) || value.length > 254) return "Enter a valid email address, e.g. name@gmail.com.";
  const [local, domain] = value.split("@");
  const suggestion = PROVIDER_TYPOS[domain] ?? (TLD_TYPOS.test(domain) ? domain.replace(TLD_TYPOS, ".com") : "");
  return suggestion ? `Check the email domain. Did you mean ${local}@${suggestion}?` : "";
}

export const isValidEmail = (value: string) => emailError(value) === "";

/** Keeps digits only, at most 10 (for use while typing). A pasted "+91 98765 43210" or
 *  "098765 43210" keeps the last 10 digits, dropping the country code or trunk 0. */
export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  const hasPrefix = (digits.length === 12 && digits.startsWith("91")) || (digits.length === 11 && digits.startsWith("0"));
  return hasPrefix ? digits.slice(-10) : digits.slice(0, 10);
}

export const isValidPhone = (value: string) => /^\d{10}$/.test(value.trim());

export const PHONE_ERROR = "Enter a 10-digit phone or WhatsApp number (digits only).";
