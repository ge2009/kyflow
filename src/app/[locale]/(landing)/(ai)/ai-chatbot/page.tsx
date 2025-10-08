import { Hero } from "@/themes/default/blocks/hero";
import { getTranslations } from "next-intl/server";

export default async function AiChatbotPage() {
  const t = await getTranslations("landing");
  const tt = await getTranslations("demo.ai-chatbot");

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
