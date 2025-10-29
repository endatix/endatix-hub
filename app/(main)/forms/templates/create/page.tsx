"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTemplateAction } from "@/features/form-templates/application/create-template.action";
import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Result } from "@/lib/result";
import { toast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

export default function CreateFormTemplatePage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createTemplateAction(formData);
      if (result === undefined) {
        toast.error("Could not proceed with creating template");
        return;
      }

      if (Result.isSuccess(result)) {
        toast.success({
          title: "Form template created successfully",
          description: "Opening template editor...",
        });
        router.push(`/forms/templates/${result.value}`);
      } else {
        toast.error(result.message || "Failed to create template");
      }
    });
  };

  return (
    <>
      <PageTitle title="Create Form Template" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link
            href="/forms/templates"
            className="text-primary hover:underline"
          >
            ← Back to templates
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">
            Create a new form template
          </h1>
          <p className="text-muted-foreground mb-6">
            Form templates let you create reusable forms that can be filled out
            multiple times.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter template name"
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter template description"
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" asChild disabled={isPending}>
                <Link href="/forms/templates">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
