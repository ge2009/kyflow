"use client";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { signIn } from "@/core/auth/client";
import { useRouter } from "next/navigation";
import { Button as ButtonType } from "@/shared/types/blocks/common";
import { RiGithubFill, RiGoogleFill } from "react-icons/ri";
import { useAppContext } from "@/shared/contexts/app";

export function SocialProviders({
  configs,
  callbackURL,
  loading,
  setLoading,
}: {
  configs: Record<string, string>;
  callbackURL: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}) {
  const router = useRouter();

  const { setIsShowSignModal } = useAppContext();

  const handleSignIn = async ({ provider }: { provider: string }) => {
    await signIn.social(
      {
        provider: provider,
        callbackURL: callbackURL,
      },
      {
        onRequest: (ctx) => {
          setLoading(true);
        },
        onResponse: (ctx) => {
          setLoading(false);
          setIsShowSignModal(false);
        },
        onSuccess: (ctx) => {
          router.push(callbackURL || "/");
        },
      }
    );
  };

  const providers: ButtonType[] = [];

  if (configs.google_auth_enabled === "true") {
    providers.push({
      name: "google",
      title: "Sign in with Google",
      icon: <RiGoogleFill />,
      onClick: () => handleSignIn({ provider: "google" }),
    });
  }

  if (configs.github_auth_enabled === "true") {
    providers.push({
      name: "github",
      title: "Sign in with Github",
      icon: <RiGithubFill />,
      onClick: () => handleSignIn({ provider: "github" }),
    });
  }

  return (
    <div
      className={cn(
        "w-full gap-2 flex items-center",
        "justify-between flex-col"
      )}
    >
      {providers.map((provider) => (
        <Button
          key={provider.name}
          variant="outline"
          className={cn("w-full gap-2")}
          disabled={loading}
          onClick={provider.onClick}
        >
          {provider.icon}
          {provider.title}
        </Button>
      ))}
    </div>
  );
}
