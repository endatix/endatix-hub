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
        <SheetContent className="w-[600px] sm:w-[480px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {selectedForm?.name}
            </SheetTitle>
            <SheetDescription>{selectedForm?.description}</SheetDescription>
          </SheetHeader>
          
          <FormDetails 
            form={selectedForm}
            enableEditing={enableEditing}
            showHeader={false}
            onFormDeleted={handleFormDeleted}
          />
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};
export default FormSheet;
