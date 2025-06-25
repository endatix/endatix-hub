import { Button } from "@/components/ui/button";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import { Collapsible } from "@radix-ui/react-collapsible";
import { ChevronsUpDown, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { Model } from "survey-react-ui";

interface DynamicVariablesListProps {
  surveyModel: Model;
}
const DynamicVariablesList = ({ surveyModel }: DynamicVariablesListProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { variables } = useDynamicVariables(surveyModel);

  if (!variables || Object.keys(variables).length === 0) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="grid grid-cols-5 items-start gap-4 mb-6 h-full"
    >
      <div className="text-right col-span-2 flex top-0 justify-end">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserRoundSearch /> Dynamic Variables
        </h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="col-span-3">
        <CollapsibleContent className="space-y-2">
          {Object.entries(variables).map(([name, value]) => (
            <div
              key={name}
              className="flex items-center rounded-md border p-0.5 px-2"
            >
              <span className="text-sm font-medium text-muted-foreground pr-1">
                {`@${name} =`}
              </span>
              <span className="text-sm font-medium">{` ${value}`}</span>
            </div>
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default DynamicVariablesList;
