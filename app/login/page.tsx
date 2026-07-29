"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

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
    "w-full h-12 rounded-xl bg-surface border border-line px-4 text-ink-900 transition-colors " +
    "placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    // BST leads with the buildings, so the sign-in does too: a full-bleed
    // project photograph holds the left of the screen and the form sits quietly
    // on cream beside it, rather than floating as a card in empty space.
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-canvas">
      <div className="relative hidden lg:block overflow-hidden">
        <Image
          src="/img/project-kalaniot.jpg"
          alt="פרויקט מגורים של קבוצת BST"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover"
        />
        {/* Gradient rather than a flat veil: the photograph stays vivid where
            there is nothing over it, and darkens only under the caption. */}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-800/85 via-brand-800/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="t-eyebrow !text-logo-cream/60">קבוצת BST</p>
          <p className="mt-2 text-3xl font-light leading-tight text-logo-cream">
            מעל 50 שנות נדל״ן,
            <br />
            התחדשות עירונית ובנייה.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
        <div className="mb-10">
          <Logo className="h-12 text-ink-900" />
          <p className="text-sm text-ink-500 mt-4 tracking-wide">
            מערכת סינון לידים · פיתוח עסקי
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
