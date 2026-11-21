"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api";

interface GoogleSignInButtonProps {
  onSuccess: (accountType: "retail" | "wholesale" | "owner") => void;
  onError: (msg: string) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: GoogleCredentialResponse) => {
          if (!resp.credential) {
            onError("Google did not return a valid credential.");
            return;
          }
          setBusy(true);
          try {
            const res = await apiClient<{
              user: { account_type: "retail" | "wholesale" | "owner" };
            }>("auth/google", {
              method: "POST",
              body: JSON.stringify({ id_token: resp.credential }),
            });
            if (res.error || !res.data) {
              onError(res.error?.message || "Google sign-in failed.");
            } else {
              onSuccess(res.data.user.account_type);
            }
          } catch {
            onError("Could not verify Google sign-in.");
          } finally {
            setBusy(false);
          }
        },
      });
      containerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: 340,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [onError, onSuccess]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-slate-800" />
        <span className="shrink mx-3 text-[11px] text-slate-500">or</span>
        <div className="flex-grow border-t border-slate-800" />
      </div>
      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>
      {busy && (
        <p className="text-center text-[11px] text-slate-400">
          Verifying Google account…
        </p>
      )}
    </div>
  );
}
