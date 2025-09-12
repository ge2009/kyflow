import { Button } from "@/components/ui/button";
import { ArrowBigRight, DownloadCloud } from "lucide-react";
import Link from "next/link";
import { LandingData } from "@/services/locale";

export function FeaturesStep({ data }: { data: LandingData["features"] }) {
  if (!data) {
    return null;
  }

  return (
    <section className="overflow-hidden">
      <div className="m-4 rounded-[2rem] py-24">
        <div className="@container relative container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-primary">{data.label}</span>
            <h2 className="text-foreground mt-4 text-4xl font-semibold">
              {data.title}
            </h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              {data.description}
            </p>
          </div>

          <div className="@3xl:grid-cols-4 my-20 grid gap-12">
            {data.items.map((item, idx) => (
              <div className="space-y-6" key={idx}>
                <div className="text-center">
                  <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-zinc-500/15 text-sm font-medium">
                    {idx + 1}
                  </span>
                  <div className="relative">
                    <div className="mx-auto my-6 w-fit">
                      <DownloadCloud />
                    </div>
                    {idx < data.items.length - 1 && (
                      <ArrowBigRight className="@3xl:block fill-background stroke-background absolute inset-y-0 right-0 my-auto hidden translate-x-[150%] drop-shadow" />
                    )}
                  </div>
                  <h3 className="text-foreground mb-4 text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-balance">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button asChild variant="outline" className="mx-auto flex w-fit">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
