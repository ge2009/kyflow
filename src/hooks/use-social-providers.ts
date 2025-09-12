"use client";

import { useState, useEffect } from "react";

interface SocialProviders {
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
}

export function useSocialProviders() {
  const [providers, setProviders] = useState<SocialProviders>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch("/api/get-configs");
        const configs = await response.json();

        const socialProviders: SocialProviders = {};

        if (configs.google_client_id && configs.google_client_secret) {
          socialProviders.google = {
            clientId: configs.google_client_id,
            clientSecret: configs.google_client_secret,
          };
        }

        if (configs.github_client_id && configs.github_client_secret) {
          socialProviders.github = {
            clientId: configs.github_client_id,
            clientSecret: configs.github_client_secret,
          };
        }

        setProviders(socialProviders);
      } catch (error) {
        console.error("Failed to fetch social providers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProviders();
  }, []);

  return {
    providers,
    loading,
    hasGoogle: !!providers.google,
    hasGithub: !!providers.github,
  };
}
