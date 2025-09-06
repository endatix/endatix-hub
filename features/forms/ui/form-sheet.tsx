"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form } from "@/types";
import FormDetails from "./form-details";

interface FormSheetProps extends React.ComponentPropsWithoutRef<typeof Sheet> {
  selectedForm: Form | null;
  enableEditing?: boolean;
}

const FormSheet = ({
  selectedForm,
  enableEditing = false,
  ...props
}: FormSheetProps) => {
  if (!selectedForm) {
    return null;
  }

  const handleFormDeleted = () => {
    props.onOpenChange?.(false);
  };

  return (
    selectedForm && (
      <Sheet {...props}>
        <SheetContent className="w-[600px] sm:w-[640px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="sr-only">
              {selectedForm?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-8">
            <FormDetails 
              form={selectedForm}
              enableEditing={enableEditing}
              showHeader={true}
              onFormDeleted={handleFormDeleted}
              titleSize="text-2xl"
            />
          </div>
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};
export default FormSheet;
