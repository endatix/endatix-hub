import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerLocalDateTime } from "./registry";

/**
 * A prefilled datetime-local question calls edxLocalDateTime on the shared form, which runs
 * with ENDATIX_ENABLE_EXTENSIONS off by default, so onInit is not enough. Register on import,
 * as screen-out does, and keep onInit for when #709 makes it unconditional.
 */
registerLocalDateTime();

const localDateTimeExtension: ExtensionModule = {
  onInit: () => {
    registerLocalDateTime();
  },
};

export { localDateTimeExtension };
