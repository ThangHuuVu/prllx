"use client";

import { authClient } from "@/lib/auth-client";

export function AuthButton() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="h-8 w-20 animate-pulse rounded-full bg-black/5" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#6f6458] truncate max-w-[120px]">
          {session.user.email}
        </span>
        <button
          type="button"
          onClick={() => authClient.signOut()}
          className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-[#5e554a] transition hover:border-black/30"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        authClient.signIn.social({
          provider: "github",
          callbackURL: window.location.pathname,
        })
      }
      className="rounded-full bg-[#1e1b16] px-4 py-1.5 text-xs font-medium text-[#fdf6ed] transition hover:bg-[#2b2722]"
    >
      Sign in with GitHub
    </button>
  );
}
