import { respData, respErr } from "@/shared/lib/resp";
import { getAllConfigs } from "@/shared/services/config";
import { publicSettingNames } from "@/shared/services/settings";

export async function POST(req: Request) {
  try {
    const configs = await getAllConfigs();
    const publicConfigs: Record<string, string> = {};
    for (const key in configs) {
      if (publicSettingNames.includes(key)) {
        publicConfigs[key] = configs[key];
      }
    }

    return respData(publicConfigs);
  } catch (e: any) {
    console.log("get configs failed", e);
    return respErr(e.message);
  }
}
