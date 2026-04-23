import MainHeader from "@/components/layout-ui/header/main-header";
import CreateFormSheet from "@/features/forms/ui/create-form-sheet";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";

export default async function FormsHeaderSlot() {
  const aiFeatureFlag = await aiFeaturesFlag();

  return (
    <MainHeader
      sticky
      actions={
        <FormAssistantProvider isAssistantEnabled={aiFeatureFlag}>
          <CreateFormSheet />
        </FormAssistantProvider>
      }
    />
  );
}
