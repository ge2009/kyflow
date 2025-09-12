"use client";

import { Link } from "@/core/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/core/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "@/core/i18n/navigation";

export function SignUser({ isScrolled }: { isScrolled?: boolean }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (session && session.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage src={session.user.image || ""} />
            <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            Admin
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn(isScrolled && "lg:hidden")}
      >
        <Link href="/sign-in">
          <span>Sign In</span>
        </Link>
      </Button>
      <Button asChild size="sm" className={cn(isScrolled && "lg:hidden")}>
        <Link href={"/sign-up"}>
          <span>Sign Up</span>
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        className={cn(isScrolled ? "lg:inline-flex" : "hidden")}
      >
        <Link href="#">
          <span>Get Started</span>
        </Link>
      </Button>
    </div>
  );
}
