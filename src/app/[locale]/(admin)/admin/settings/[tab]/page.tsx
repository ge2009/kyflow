import { Header, Main, MainHeader } from "@/blocks/dashboard";
import { FormCard } from "@/blocks/form";
import { NavItem } from "@/types/blocks/common";
import { Form as FormType } from "@/types/blocks/form";
import { saveConfigs } from "@/services/config";
import { getConfigs } from "@/services/config";
import { settingGroups, settings } from "@/services/settings";
import { getUserInfo } from "@/services/user";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const configs = await getConfigs();
  const { tab } = await params;

  const tabs: NavItem[] = [
    {
      title: "Auth",
      url: "/admin/settings/auth",
      is_active: tab === "auth",
    },
    {
      title: "Payment",
      url: "/admin/settings/payment",
      is_active: tab === "payment",
    },
    {
      title: "Email",
      url: "/admin/settings/email",
      is_active: tab === "email",
    },
    {
      title: "Storage",
      url: "/admin/settings/storage",
      is_active: tab === "storage",
    },

    {
      title: "AI",
      url: "/admin/settings/ai",
      is_active: tab === "ai",
    },
    {
      title: "Analytics",
      url: "/admin/settings/analytics",
      is_active: tab === "analytics",
    },
    {
      title: "Ads",
      url: "/admin/settings/ads",
      is_active: tab === "ads",
    },
  ];

  const handleSubmit = async (data: FormData, passby: any) => {
    "use server";

    const user = await getUserInfo();

    if (!user) {
      throw new Error("no auth");
    }

    data.forEach((value, name) => {
      configs[name] = value as string;
    });

    await saveConfigs(configs);

    return {
      status: "success",
      message: "Settings updated",
    };
  };

  let forms: FormType[] = [];

  settingGroups.forEach((group) => {
    if (group.tab !== tab) {
      return;
    }

    forms.push({
      title: group.title,
      description: group.description,
      fields: settings
        .filter((setting) => setting.group === group.name)
        .map((setting) => ({
          name: setting.name,
          title: setting.title,
          type: setting.type as any,
          placeholder: setting.placeholder,
          group: setting.group,
        })),
      passby: {
        provider: group.name,
        tab: group.tab,
      },
      data: configs,
      submit: {
        button: {
          title: "Save",
        },
        handler: handleSubmit as any,
      },
    });
  });

  return (
    <>
      <Header />
      <Main>
        <MainHeader title="Settings" tabs={tabs} />
        {forms.map((form) => (
          <FormCard key={form.title} form={form} className="md:max-w-xl mb-8" />
        ))}
      </Main>
    </>
  );
}
