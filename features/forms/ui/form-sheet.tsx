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
import { useState, useEffect } from "react";
import { getFormAction } from "../application/actions/get-form.action";
import { Result } from "@/lib/result";
import { Loader2 } from "lucide-react";

interface FormSheetProps extends React.ComponentPropsWithoutRef<typeof Sheet> {
  selectedForm: Form | null;
  enableEditing?: boolean;
}

const FormSheet = ({
  selectedForm,
  enableEditing = false,
  ...props
}: FormSheetProps) => {
  const [fullForm, setFullForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch full form data when sheet opens
  useEffect(() => {
    if (props.open && selectedForm?.id) {
      setIsLoading(true);
      getFormAction(selectedForm.id)
        .then((result) => {
          if (Result.isSuccess(result)) {
            setFullForm(result.value);
          } else {
            console.error("Failed to fetch form details:", result.message);
            setFullForm(selectedForm); // Fallback to the list form data
          }
        })
        .catch((error) => {
          console.error("Failed to fetch form details:", error);
          setFullForm(selectedForm); // Fallback to the list form data
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [props.open, selectedForm?.id, selectedForm]);

  if (!selectedForm) {
    return null;
  }

  const handleFormDeleted = () => {
    props.onOpenChange?.(false);
  };

  const displayForm = fullForm || selectedForm;

  return (
    selectedForm && (
      <Sheet {...props}>
        <SheetContent className="w-[600px] sm:w-[640px] sm:max-w-none overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">
              {selectedForm?.name}
            </SheetTitle>
          </SheetHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-8 pb-6">
              <FormDetails
                form={displayForm}
                enableEditing={enableEditing}
                showHeader={true}
                onFormDeleted={handleFormDeleted}
                titleSize="text-2xl"
              />
            </div>
          )}
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};
export default FormSheet;
