import PageTitle from "@/components/headings/page-title";
import { CreateFormWizard } from "@/features/forms/use-cases/create-form";
import Link from "next/link";

export default function CreateFormPage() {
  return (
    <>
      <PageTitle title="Create Form" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link href="/forms" className="text-primary hover:underline">
            ← Back to forms
          </Link>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Create a new form</h2>
          <p className="text-muted-foreground mb-6">
            Design your form with a simple drag and drop interface.
          </p>

          <CreateFormWizard />
        </div>
      </div>
    </>
  );
}
