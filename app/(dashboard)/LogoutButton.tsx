"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";

/** Signs out of Firebase and clears the server session cookie. */
export function LogoutButton({ email }: { email: string | null }) {
  const router = useRouter();

  async function onLogout() {
    try {
      await signOut(clientAuth());
    } catch {
      // ignore — clear the server cookie regardless
    }
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onLogout}
      className="flex items-center gap-2 text-sm text-logo-cream/60 hover:text-logo-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-logo-cream/50 rounded-full"
    >
      <FontAwesomeIcon icon={faRightFromBracket} />
      <span>{email ? `יציאה (${email})` : "יציאה"}</span>
    </button>
  );
}
