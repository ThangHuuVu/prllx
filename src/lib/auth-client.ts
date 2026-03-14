import { createAuthClient } from "better-auth/react";

const clientBaseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || undefined;

export const authClient = createAuthClient({
  baseURL: clientBaseURL,
});
