import { SectionTitle } from "@/components/headings/section-title";
import { loadFilterableQuestions } from "../load-filterable-questions.server";
import { FilterableQuestionsList } from "./filterable-questions-list";

/**
 * The form's settings: which questions the submissions grid can filter,
 * picked automatically or chosen by editors. Hidden without reporting.
 */
export async function FilterableQuestionsSection({
  formId,
}: Readonly<{ formId: string }>) {
  const load = await loadFilterableQuestions(formId);
  if (load.kind === "hidden") return null;

  return (
    <section className="mx-auto max-w-2xl py-4">
      <SectionTitle title="Filterable questions" headingClassName="text-xl" />
      {load.kind === "error" ? (
        <p className="text-sm text-muted-foreground">
          The filterable questions could not be loaded. Refresh the page to try
          again.
        </p>
      ) : (
        <FilterableQuestionsList formId={formId} {...load} />
      )}
    </section>
  );
}
