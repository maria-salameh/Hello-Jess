// The second step of signing up and of logging in: the six-digit code emailed to the user.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { errorMessages, type Challenge } from "../api";
import { useAuth } from "../context/AuthContext";

type Props = { challenge: Challenge; stay: boolean; onDone: () => void; onBack: () => void };

// A new code can be requested every 30 seconds (the server enforces it too).
const RESEND_SECONDS = 30;

export default function CodeForm({ challenge, stay, onDone, onBack }: Props) {
  const { verifyCode, resendCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyCode(challenge.email, code, stay);
      onDone();
    } catch (err) {
      setError(errorMessages(err).join(" "));
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    try {
      await resendCode(challenge.email);
      setInfo("A new code is on its way.");
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessages(err).join(" "));
    }
  }

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>HelloJess</h1>
      <p className="subtitle">
        {challenge.purpose === "verify" ? "Verify your email" : "Two-step verification"}
      </p>
      <p className="code-hint">
        We sent a 6-digit code to <strong>{challenge.email}</strong>. It expires in 10 minutes.
      </p>
      {error && <div className="error">{error}</div>}
      {info && <div className="success">{info}</div>}
      <label>
        Code
        <input
          className="code-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          autoFocus
          required
        />
      </label>
      <button type="submit" disabled={submitting || code.length !== 6}>
        {submitting ? "Checking..." : challenge.purpose === "verify" ? "Verify and continue" : "Log in"}
      </button>
      <p className="switch">
        <button type="button" className="link-btn" onClick={handleResend} disabled={wait > 0}>
          {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
        </button>
        <button type="button" className="link-btn" onClick={onBack}>
          Back
        </button>
      </p>
    </form>
  );
}
