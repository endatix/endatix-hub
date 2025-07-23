"use client";

import { useEffect, useRef, useState } from "react";
import {
  AgentRequestSchema,
  CreateUpdateAgentRequestSchema,
} from "@/lib/endatix-api/agents/types";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle } from "@/components/ui/alert";

interface AgentFormProps {
  initialValues: CreateUpdateAgentRequestSchema;
  onSubmit: (data: CreateUpdateAgentRequestSchema) => Promise<void>;
  mode: "create" | "edit";
  isPending?: boolean;
}

const ENABLED_MODELS = ["o4-mini"];
const AGENTS_NAMES = ["DefineForm"];

export function AgentFormContainer({
  initialValues,
  onSubmit,
  mode,
  isPending,
}: AgentFormProps) {
  const [form, setForm] =
    useState<CreateUpdateAgentRequestSchema>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateUpdateAgentRequestSchema, string>>
  >({});
  const router = useRouter();
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (systemPromptRef.current) {
      systemPromptRef.current.style.height = "auto";
      systemPromptRef.current.style.height =
        systemPromptRef.current.scrollHeight + 4 + "px";
    }
  }, [form.systemPrompt]);

  const validate = (
    field: keyof CreateUpdateAgentRequestSchema,
    value: string | number,
  ) => {
    try {
      AgentRequestSchema.shape[field].parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: e.errors[0]?.message }));
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    let val: string | number = value;
    if (type === "number") val = Number(value);
    setForm((prev) => ({ ...prev, [name]: val }));
    validate(name as keyof CreateUpdateAgentRequestSchema, val);
  };

  const isFormValid = () => {
    const result = AgentRequestSchema.safeParse(form);
    return result.success;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = AgentRequestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<
        Record<keyof CreateUpdateAgentRequestSchema, string>
      > = {};
      for (const err of result.error.errors) {
        fieldErrors[err.path[0] as keyof CreateUpdateAgentRequestSchema] =
          err.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (isPending) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Agent Name</Label>
          <Select
            value={form.name}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, name: value }));
              validate("name", value);
            }}
            disabled={isPending}
            name="name"
            required
          >
            <SelectTrigger
              id="name"
              aria-invalid={!!errors.model}
              aria-describedby="model-error"
            >
              <SelectValue placeholder="Select an agent name" />
            </SelectTrigger>
            <SelectContent>
              {AGENTS_NAMES.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.model && (
            <div id="model-error" className="text-destructive text-sm">
              {errors.model}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Select
            value={form.model}
            onValueChange={(value) => {
              setForm((prev) => ({ ...prev, model: value }));
              validate("model", value);
            }}
            disabled={isPending}
            name="model"
            required
          >
            <SelectTrigger
              id="model"
              aria-invalid={!!errors.model}
              aria-describedby="model-error"
            >
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {ENABLED_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.model && (
            <div id="model-error" className="text-destructive text-sm">
              {errors.model}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature">Temperature</Label>
          <Input
            id="temperature"
            name="temperature"
            type="number"
            min={0}
            max={2}
            step={0.1}
            required
            disabled={isPending}
            value={form.temperature}
            onChange={handleChange}
            aria-invalid={!!errors.temperature}
            aria-describedby="temperature-error"
          />
          {form.model === "o4-mini" && (
            <Alert variant="default" className="text-sm p-2 align-center justify-center">
              <Brain className="h-4 w-4" />
              <AlertTitle>
                <strong>Note:</strong> The temperature is NOT available for the
                o4-mini model. It will be set to default value of 1 as the model
                is deterministic.
              </AlertTitle>
            </Alert>
          )}
          {errors.temperature && (
            <div id="temperature-error" className="text-destructive text-sm">
              {errors.temperature}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <Textarea
            id="systemPrompt"
            ref={systemPromptRef}
            name="systemPrompt"
            placeholder="Enter system prompt for the agent"
            rows={4}
            required
            disabled={isPending}
            value={form.systemPrompt}
            onChange={handleChange}
            aria-invalid={!!errors.systemPrompt}
            aria-describedby="systemPrompt-error"
          />
          {errors.systemPrompt && (
            <div id="systemPrompt-error" className="text-destructive text-sm">
              {errors.systemPrompt}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input
            id="tenantId"
            name="tenantId"
            type="number"
            required
            disabled={isPending || mode === "edit"}
            value={form.tenantId}
            onChange={handleChange}
            aria-invalid={!!errors.tenantId}
            aria-describedby="tenantId-error"
          />
          {errors.tenantId && (
            <div id="tenantId-error" className="text-destructive text-sm">
              {errors.tenantId}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        {mode === "edit" && (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending || !isFormValid()}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "edit" ? "Saving..." : "Creating..."}
            </>
          ) : mode === "edit" ? (
            "Save Changes"
          ) : (
            "Create Agent"
          )}
        </Button>
      </div>
    </form>
  );
}
