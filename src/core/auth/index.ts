import { betterAuth } from "better-auth";
import { authOptions, getSocialProviders } from "./config";

// auth with social providers
export const auth = betterAuth({
  ...authOptions,
  socialProviders: await getSocialProviders(),
});
