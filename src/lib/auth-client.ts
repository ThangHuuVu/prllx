import { createAuthClient } from "better-auth/react";
import { appUrl } from "@/lib/env";

export const authClient = createAuthClient({
  baseURL: appUrl,
});
