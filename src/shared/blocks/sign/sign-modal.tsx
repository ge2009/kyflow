"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { SiGithub, SiGmail, SiGoogle } from "react-icons/si";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { signIn } from "@/core/auth/client";
import { useAppContext } from "@/shared/contexts/app";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useTranslations } from "next-intl";
import { SocialProviders } from "./social-providers";
import { SignInForm } from "./sign-in-form";
import { useState } from "react";
import { envConfigs } from "@/config";

export function SignModal() {
  const t = useTranslations("common");
  const { isShowSignModal, setIsShowSignModal } = useAppContext();

  const callbackURL =
    typeof window !== "undefined" ? window.location.href : "/";

  const [loading, setLoading] = useState(false);

  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={setIsShowSignModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("sign_modal.sign_in_title")}</DialogTitle>
            <DialogDescription>
              {t("sign_modal.sign_in_description")}
            </DialogDescription>
          </DialogHeader>
          <SignInForm callbackUrl={callbackURL} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isShowSignModal} onOpenChange={setIsShowSignModal}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("sign_modal.sign_in_title")}</DrawerTitle>
          <DrawerDescription>
            {t("sign_modal.sign_in_description")}
          </DrawerDescription>
        </DrawerHeader>
        <SignInForm callbackUrl={callbackURL} className="mt-8" />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline">{t("sign_modal.cancel_title")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
