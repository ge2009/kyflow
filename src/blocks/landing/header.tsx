"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/core/i18n/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LandingData } from "@/services/locale";
import { SignUser } from "./sign-user";
import { LocaleSelector } from "./locale-selector";
import { ThemeToggler } from "@/blocks/base/theme-toggler";

export const Header = ({ data }: { data: LandingData["header"] }) => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
            isScrolled &&
              "bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              {data.brand ? (
                <Link
                  href={data.brand.url}
                  aria-label="home"
                  className="flex items-center space-x-2"
                >
                  <Image
                    src={data.brand.logo.src}
                    alt={data.brand.logo.alt}
                    width={100}
                    height={100}
                    className="h-10 w-auto"
                  />
                  <span className="text-lg font-medium">
                    {data.brand.title}
                  </span>
                </Link>
              ) : null}

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            {data.nav?.items?.length > 0 ? (
              <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                <ul className="flex gap-8 text-sm">
                  {data.nav.items.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.url}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {data.nav.items.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.url}
                        className="text-muted-foreground hover:text-accent-foreground block duration-150"
                      >
                        <span>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {data.show_sign ? <SignUser isScrolled={isScrolled} /> : null}
              {data.show_theme ? <ThemeToggler /> : null}
              {data.show_locale ? <LocaleSelector /> : null}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
