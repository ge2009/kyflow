import { Hero } from "@/themes/default/blocks/hero";
import { getTranslations } from "next-intl/server";

export default async function AiAudioGeneratorPage() {
  const t = await getTranslations("landing");
  const tt = await getTranslations("demo.ai-audio-generator");

  return (
    <>
      <Hero
        hero={{
          title: tt.raw("title"),
          description: tt.raw("description"),
        }}
      />
    </>
  );
}
