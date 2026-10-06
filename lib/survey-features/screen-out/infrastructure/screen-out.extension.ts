import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerScreenOutTrigger } from "./registry";

registerScreenOutTrigger();

const screenOutExtension: ExtensionModule = {
  onCreatorReady: async () => {
    const { registerScreenOutLogicAction } = await import("./creator-bindings");
    registerScreenOutLogicAction();
  },
};

export { screenOutExtension };
