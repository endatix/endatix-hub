"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { useRouter } from "next/navigation";
import { Result } from "@/lib/result";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createAgentAction } from "@/features/agents/application/create-agent.action";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentSchema, AgentForm } from "@/features/agents/types";
import { z } from "zod";

const ENABLED_MODELS = ["o4-mini"];

export default function CreateAgentPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState<AgentForm>({
    name: "",
    model: "",
    temperature: 0.7,
    systemPrompt: "",
    tenantId: 0,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof AgentForm, string>>
  >({});

  const validate = (field: keyof AgentForm, value: string | number) => {
    try {
      agentSchema.shape[field].parse(value);
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
    validate(name as keyof AgentForm, val);
  };

  const isFormValid = () => {
    const result = agentSchema.safeParse(form);
    return result.success;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = agentSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof AgentForm, string>> = {};
      for (const err of result.error.errors) {
        fieldErrors[err.path[0] as keyof AgentForm] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }
    if (isPending) return;
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
    startTransition(async () => {
      const result = await createAgentAction(formData);
      if (Result.isSuccess(result)) {
        toast.success({
          title: "Agent created successfully",
          description: "You can now use this agent.",
        });
        router.push("/admin/agents");
      } else {
        toast.error(result.message || "Failed to create agent");
      }
    });
  };

  return (
    <>
      <PageTitle title="Create Agent" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link href="/admin/agents" className="text-primary hover:underline">
            ← Back to agents
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">Create a new agent</h1>
          <p className="text-muted-foreground mb-6">
            Agents let you configure LLMs with custom settings and system
            messages.
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            autoComplete="off"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter agent name"
                  required
                  autoFocus
                  disabled={isPending}
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={!!errors.name}
                  aria-describedby="name-error"
                />
                {errors.name && (
                  <div id="name-error" className="text-destructive text-sm">
                    {errors.name}
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
                {errors.temperature && (
                  <div
                    id="temperature-error"
                    className="text-destructive text-sm"
                  >
                    {errors.temperature}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
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
                  <div
                    id="systemPrompt-error"
                    className="text-destructive text-sm"
                  >
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
                  disabled={isPending}
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
              <Button variant="outline" asChild disabled={isPending}>
                <Link href="/admin/agents">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isPending || !isFormValid()}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Agent"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
