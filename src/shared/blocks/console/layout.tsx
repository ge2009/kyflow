"use client";

import { ReactNode, useState } from "react";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { Nav } from "@/shared/types/blocks/common";
import { Link } from "@/core/i18n/navigation";

export function ConsoleLayout({
  title,
  description,
  nav,
  topNav,
  className,
  children,
}: {
  title?: string;
  description?: string;
  nav?: Nav;
  topNav?: Nav;
  className?: string;
  children: ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredItems = nav?.items.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Top Navigation */}
      {topNav && (
        <div className="border-b border-border">
          <div className="container">
            <nav className="flex items-center gap-4 text-sm">
              {topNav.items.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.url || ""}
                  className={`text-muted-foreground hover:bg-foreground/10 flex items-center gap-2 px-3 py-2 ${
                    item.is_active
                      ? "border-b-2 border-primary text-muted-foreground"
                      : ""
                  } duration-200 ease-linear hover:text-foreground`}
                >
                  {item.icon && (
                    <SmartIcon name={item.icon as string} size={16} />
                  )}
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="border-b border-border">
        <div className="container">
          <div className="py-8">
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="flex gap-8 py-8">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0">
            {/* Search Box */}
            {/* <div className="relative mb-6">
              <SmartIcon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div> */}

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {filteredItems?.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.url || ""}
                  className={`flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                    item.is_active
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <SmartIcon name={item.icon as string} size={16} />
                  <span>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
