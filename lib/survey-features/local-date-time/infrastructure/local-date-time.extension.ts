import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerLocalDateTime } from "./registry";

const localDateTimeExtension: ExtensionModule = {
  onInit: () => {
    registerLocalDateTime();
  },
};

export { localDateTimeExtension };
