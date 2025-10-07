"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/core/auth/client";
import { Link } from "@/core/i18n/navigation";
import { useRouter } from "next/navigation";
import { SocialProviders } from "./social-providers";
import { useAppContext } from "@/shared/contexts/app";

export function SignInForm({
  callbackUrl,
  className,
}: {
  callbackUrl?: string;
  className?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { configs } = useAppContext();

  const isGoogleAuthEnabled = configs.google_auth_enabled === "true";
  const isGithubAuthEnabled = configs.github_auth_enabled === "true";
  const isEmailAuthEnabled =
    configs.email_auth_enabled !== "false" ||
    (!isGoogleAuthEnabled && !isGithubAuthEnabled); // no social providers enabled, auto enable email auth

  const handleSignIn = async () => {
    await signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: (ctx) => {
          setLoading(true);
        },
        onResponse: (ctx) => {
          setLoading(false);
        },
        onSuccess: (ctx) => {
          router.push(callbackUrl || "/");
        },
      }
    );
  };

  return (
    <div className={`w-full md:max-w-md ${className}`}>
      <div className="grid gap-4">
        {isEmailAuthEnabled && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                value={email}
              />
            </div>

            <div className="grid gap-2">
              {/* <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div> */}

              <Input
                id="password"
                type="password"
                placeholder="password"
                autoComplete="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              onClick={() => {
                setRememberMe(!rememberMe);
              }}
            />
            <Label htmlFor="remember">Remember me</Label>
          </div> */}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              onClick={handleSignIn}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <p> Sign In </p>
              )}
            </Button>
          </>
        )}

        <SocialProviders
          configs={configs}
          callbackURL={callbackUrl || "/"}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
      {isEmailAuthEnabled && (
        <div className="flex justify-center w-full border-t py-4">
          <p className="text-center text-xs text-neutral-500">
            Don't have an account?{" "}
            <Link href="/sign-up" className="underline">
              <span className="dark:text-white/70 cursor-pointer">Sign up</span>
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
