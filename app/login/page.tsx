"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTowerObservation, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
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
    "w-full h-12 rounded-lg bg-surface border border-line px-4 text-ink-900 " +
    "placeholder:text-ink-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-brand-600 text-white mb-3">
            <FontAwesomeIcon icon={faTowerObservation} className="text-2xl" />
          </span>
          <h1 className="text-2xl font-extrabold text-ink-900">מגדלור</h1>
          <p className="text-sm text-ink-400 mt-1">סינון לידים · קבוצת BST</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-surface border border-line rounded-xl shadow-card p-6 space-y-4"
        >
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
            <p className="text-sm text-stop-600 bg-stop-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
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
  );
}
