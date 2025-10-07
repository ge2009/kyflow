"use client";

import { envConfigs } from "@/config";
import { useTheme } from "next-themes";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "@/core/auth/client";
import { User } from "@/shared/services/user";

export interface ContextValue {
  user: User | null;
  isCheckSign: boolean;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  configs: Record<string, string>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const { theme, setTheme } = useTheme();

  const [configs, setConfigs] = useState<Record<string, string>>({});

  // sign user
  const [user, setUser] = useState<User | null>(null);

  // is check sign
  const [isCheckSign, setIsCheckSign] = useState(false);

  // session
  const { data: session, isPending } = useSession();

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  const fetchConfigs = async function () {
    try {
      const resp = await fetch("/api/config/get-configs", {
        method: "POST",
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      console.log("fetch configs failed:", e);
    }
  };

  const fetchUserCredits = async function () {
    try {
      if (!user) {
        return;
      }

      const resp = await fetch("/api/user/get-user-credits", {
        method: "POST",
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser({ ...user, credits: data });
    } catch (e) {
      console.log("fetch user credits failed:", e);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !theme) {
      setTheme(envConfigs.default_theme);
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (session && session.user) {
      setUser(session.user as User);
    } else {
      setUser(null);
    }
  }, [session]);

  useEffect(() => {
    if (user && !user.credits) {
      fetchUserCredits();
    }
  }, [user]);

  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  return (
    <AppContext.Provider
      value={{
        user,
        isCheckSign,
        isShowSignModal,
        setIsShowSignModal,
        configs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
