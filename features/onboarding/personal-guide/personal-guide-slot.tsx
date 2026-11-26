import { Suspense } from "react";
import { getBrand } from "@/lib/branding/server";
import { helpMenuItems } from "@/lib/constants";
import { Result } from "@/lib/result";
import { guideApi, guidePath, guideVisibility } from "./guide-api.server";
import { PersonalGuide } from "./personal-guide";

async function MemberGuide() {
  const member = await guideApi();
  if (!member) return null;
  const result = guideVisibility(await member.api.get(guidePath));
  if (Result.isError(result)) return null;
  const items = Object.values(helpMenuItems(await getBrand()));
  const links = items.flatMap(item => item ? [{ title: item.title, url: item.url }] : []);
  return <PersonalGuide key={member.scope} scope={member.scope} dismissed={result.value} links={links} />;
}

export function PersonalGuideSlot() {
  return <Suspense fallback={null}><MemberGuide /></Suspense>;
}
