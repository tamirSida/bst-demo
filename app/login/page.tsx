"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";
import { activeBrand } from "@/lib/brand/config";

export default function LoginPage() {
  const brand = activeBrand();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(clientAuth(), email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("session");
      router.push("/today");
      router.refresh();
    } catch {
      setError("התחברות נכשלה. בדקו את כתובת המייל והסיסמה.");
      setBusy(false);
    }
  }

  const control =
    "w-full h-12 rounded-xl bg-surface border border-line px-4 text-ink-900 transition-colors " +
    "placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    // A quiet brand panel beside the form rather than a card floating in
    // empty space. No photograph: nothing here should imply a client.
    <div className="min-h-screen flex items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-sm">
        <div>
        <div className="mb-10">
          <Logo className="h-12 text-ink-900" />
          <p className="text-sm text-ink-500 mt-4 tracking-wide">
            {brand.tagline}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-ink-700">
              כתובת מייל
            </label>
            <input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={control}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-ink-700">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={control}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-stop-700 bg-stop-50 border border-stop-100 rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" block disabled={busy}>
            {busy ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                מתחבר…
              </>
            ) : (
              "כניסה"
            )}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}

