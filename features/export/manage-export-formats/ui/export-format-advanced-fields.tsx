"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnAliasNamingConventionDto } from "@/lib/endatix-api/reporting/export-format-types";

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

interface ExportFormatAdvancedFieldsProps {
  mode: string;
  aliasProfile: string;
  keySeparator: string;
  namingConventions: ColumnAliasNamingConventionDto[];
  selectedNamingConvention?: ColumnAliasNamingConventionDto;
  keySeparatorError?: string;
  accordionValue: string | undefined;
  onAccordionValueChange: (value: string | undefined) => void;
  onAliasProfileChange: (value: string) => void;
  onKeySeparatorChange: (value: string) => void;
}

export function ExportFormatAdvancedFields({
  mode,
  aliasProfile,
  keySeparator,
  namingConventions,
  selectedNamingConvention,
  keySeparatorError,
  accordionValue,
  onAccordionValueChange,
  onAliasProfileChange,
  onKeySeparatorChange,
}: Readonly<ExportFormatAdvancedFieldsProps>) {
  return (
    <Accordion
      type="single"
      collapsible
      className="w-full"
      value={accordionValue}
      onValueChange={onAccordionValueChange}
    >
      <AccordionItem value="advanced" className="border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex flex-col items-start gap-1 text-left">
            <span>Advanced</span>
            <span className="text-sm font-normal text-muted-foreground">
              Column naming for submission headers, plus the key separator used
              when joining nested keys in submissions and codebook exports.
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${mode}-aliasProfile`}>Column naming</Label>
            <p className="text-sm text-muted-foreground">
              Naming convention applied to submission export headers.
            </p>
            <Select
              value={aliasProfile || undefined}
              onValueChange={(value) => onAliasProfileChange(value)}
              disabled={namingConventions.length === 0}
            >
              <SelectTrigger id={`${mode}-aliasProfile`} className="w-full">
                <SelectValue placeholder="Select naming convention">
                  {selectedNamingConvention?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {namingConventions.map((option) => (
                  <SelectItem
                    key={option.wireKey}
                    value={option.wireKey}
                    className="items-start py-2"
                  >
                    <span className="flex flex-col gap-0.5 whitespace-normal">
                      <span>{option.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                      {option.example ? (
                        <span className="font-mono text-xs font-normal text-muted-foreground">
                          e.g. {option.example}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNamingConvention ? (
              <p className="text-sm text-muted-foreground">
                {selectedNamingConvention.description}
                {selectedNamingConvention.example ? (
                  <>
                    {" "}
                    Example: <code>{selectedNamingConvention.example}</code>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${mode}-keySeparator`}>Key separator</Label>
            <p className="text-sm text-muted-foreground">
              Joins nested question keys, for example{" "}
              <code>question__choice</code>.
            </p>
            <Input
              id={`${mode}-keySeparator`}
              value={keySeparator}
              onChange={(event) => onKeySeparatorChange(event.target.value)}
            />
            <FieldError message={keySeparatorError} />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
