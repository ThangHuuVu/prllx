import { betterAuth } from "better-auth";
import { appUrl } from "@/lib/env";

export const auth = betterAuth({
  baseURL: appUrl,
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
});
