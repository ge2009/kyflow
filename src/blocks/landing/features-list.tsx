import { Button } from "@/components/ui/button";
import { ChevronRight, Cpu, Lock, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { LandingData } from "@/services/locale";
import Image from "next/image";

export function FeaturesList({ data }: { data: LandingData["features"] }) {
  if (!data) {
    return null;
  }

  return (
    <section className="overflow-hidden">
      <div className="py-24">
        <div className="container">
          <div className="grid items-center gap-12 pb-12 md:grid-cols-2">
            <div>
              <div className="max-w-md">
                <h2 className="text-foreground text-balance text-4xl font-semibold">
                  {data.title}
                </h2>
                <p className="my-6 text-balance text-lg">{data.description}</p>
                {/* <p className="text-muted-foreground">{data.description}</p> */}
                <Button className="mt-8 pr-2" variant="outline" asChild>
                  <Link href="#">
                    Learn more
                    <ChevronRight className="size-4 opacity-50" />
                  </Link>
                </Button>
              </div>
            </div>
            <Image
              src={data.img_url}
              alt={data.title}
              width={400}
              height={300}
              className="rounded-lg object-cover"
            />
          </div>

          <div className="relative grid grid-cols-2 gap-x-3 gap-y-6 border-t pt-12 sm:gap-6 lg:grid-cols-4">
            {data.items.map((item, idx) => (
              <div className="space-y-3" key={idx}>
                <div className="flex items-center gap-2">
                  <Zap className="text-foreground fill-foreground/10 size-4" />
                  <h3 className="text-sm font-medium">{item.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
