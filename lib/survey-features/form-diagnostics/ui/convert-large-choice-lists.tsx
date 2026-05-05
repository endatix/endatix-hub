'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { convertChoicesToDataListAction } from '@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action';
import { createFormAction } from '@/features/forms/application/actions/create-form.action';
import {
  applyDataListBindingByQuestionName,
  findConvertibleChoiceQuestions,
  getPlainChoiceValuesForNormalization,
  getQuestionDataListName,
  normalizeChoicesToDataListItems,
  type ConvertibleChoiceQuestionRef,
} from '@/lib/survey-features/data-lists/conversion/choice-conversion.utils';
import { Result } from '@/lib/result';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { Model, Question } from 'survey-core';
import type { FormDiagnosticsPlugin } from '../form-diagnostics-plugin';

const PREVIEW_LIMIT = 12;
const CONCURRENCY = 4;

type Phase = 'idle' | 'lists' | 'form' | 'done';

type ConversionOutcome =
  | { ok: true; name: string; dataListId: string }
  | { ok: false; name: string; error: string };

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const iterator = Array.from(items.entries())[Symbol.iterator]();

  const runWorker = async () => {
    for (;;) {
      const step = iterator.next();
      if (step.done) {
        break;
      }
      const [index, item] = step.value;
      results[index] = await worker(item, index);
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker(),
  );
  await Promise.all(workers);
  return results;
}

interface ConvertLargeChoiceListsProps {
  model: FormDiagnosticsPlugin;
}

export function ConvertLargeChoiceLists({
  model,
}: Readonly<ConvertLargeChoiceListsProps>) {
  const router = useRouter();
  const [threshold, setThreshold] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [phaseLabel, setPhaseLabel] = useState('');
  const [completed, setCompleted] = useState(0);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<{
    succeeded: number;
    failed: number;
  } | null>(null);

  const surveyText = model.creator?.text ?? '';

  const candidates = useMemo(() => {
    const t = Number.isFinite(threshold) && threshold >= 1 ? threshold : 10;
    return findConvertibleChoiceQuestions(surveyText, t);
  }, [surveyText, threshold]);

  const totalChoicesToMove = useMemo(
    () => candidates.reduce((acc, c) => acc + c.choiceCount, 0),
    [candidates],
  );

  const candidatePreview = candidates.slice(0, PREVIEW_LIMIT);

  const resetRun = useCallback(() => {
    setPhase('idle');
    setPhaseLabel('');
    setCompleted(0);
    setDoneMessage(null);
    setErrorBanner(null);
    setLastSummary(null);
  }, []);

  const runBulk = useCallback(async () => {
    setErrorBanner(null);
    setDoneMessage(null);
    setLastSummary(null);

    if (candidates.length === 0) {
      setErrorBanner('Nothing to convert at this threshold.');
      return;
    }

    const surveyPayload = JSON.parse(surveyText || '{}') as Record<
      string,
      unknown
    >;

    const reserved = new Set(
      model.availableDataListNames.map((n) => n.toLowerCase()),
    );

    const plans: { candidate: ConvertibleChoiceQuestionRef; listName: string }[] =
      [];
    for (const c of candidates) {
      const listName = getQuestionDataListName(
        { title: c.title, name: c.name },
        reserved,
      );
      plans.push({ candidate: c, listName });
    }

    let choicesByName: Map<string, unknown[] | null>;
    try {
      const uniqueNames = [...new Set(plans.map((p) => p.candidate.name))];
      const surveyForModel = JSON.parse(
        JSON.stringify(surveyPayload),
      ) as Record<string, unknown>;
      choicesByName = new Map<string, unknown[] | null>();
      const surveyModel = new Model(surveyForModel as object);
      try {
        for (const name of uniqueNames) {
          const q = surveyModel.getQuestionByName(name) as Question | undefined;
          if (!q) {
            choicesByName.set(name, null);
          } else {
            choicesByName.set(
              name,
              getPlainChoiceValuesForNormalization(q),
            );
          }
        }
      } finally {
        surveyModel.dispose?.();
      }
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Failed to read choices from the survey.';
      setPhase('done');
      setPhaseLabel('Done');
      setErrorBanner(message);
      return;
    }

    setPhase('lists');
    setPhaseLabel('Creating data lists');
    setCompleted(0);

    const convertOne = async (
      plan: (typeof plans)[number],
    ): Promise<ConversionOutcome> => {
      try {
        const plain = choicesByName.get(plan.candidate.name);
        if (plain === null || plain === undefined) {
          return {
            ok: false,
            name: plan.candidate.name,
            error: 'Question not found',
          };
        }
        const normalized = normalizeChoicesToDataListItems(plain);
        if (!normalized.ok) {
          return {
            ok: false,
            name: plan.candidate.name,
            error: normalized.error,
          };
        }
        const result = await convertChoicesToDataListAction({
          name: plan.listName,
          items: normalized.items,
        });
        if (!Result.isSuccess(result)) {
          return {
            ok: false,
            name: plan.candidate.name,
            error: result.message,
          };
        }
        return {
          ok: true,
          name: plan.candidate.name,
          dataListId: result.value.dataList.id,
        };
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Unexpected error during conversion';
        return {
          ok: false,
          name: plan.candidate.name,
          error: message,
        };
      } finally {
        setCompleted((prev) => prev + 1);
      }
    };

    const outcomes = await mapPool(
      plans,
      CONCURRENCY,
      (plan) => convertOne(plan),
    );

    const successes = outcomes.filter(
      (o): o is Extract<ConversionOutcome, { ok: true }> => o.ok,
    );
    const failed = outcomes.length - successes.length;
    setLastSummary({ succeeded: successes.length, failed });

    if (successes.length === 0) {
      setPhase('done');
      setPhaseLabel('Done');
      setDoneMessage(
        `No data lists were created. ${outcomes.length} candidate(s) failed or were skipped.`,
      );
      return;
    }

    setPhase('form');
    setPhaseLabel('Creating copied form');

    const cloned = JSON.parse(JSON.stringify(surveyPayload)) as Record<
      string,
      unknown
    >;
    for (const s of successes) {
      applyDataListBindingByQuestionName(cloned, s.name, s.dataListId);
    }

    const baseName = model.formName?.trim().length ? model.formName : 'Form';
    const newFormName = `${baseName} - Data Lists`;

    let createResult: Awaited<ReturnType<typeof createFormAction>>;
    try {
      createResult = await createFormAction({
        name: newFormName,
        description: undefined,
        isEnabled: model.formIsEnabled ?? true,
        formDefinitionJsonData: JSON.stringify(cloned),
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to create the new form.';
      setPhase('done');
      setPhaseLabel('Done');
      setErrorBanner(
        `${message} Data lists were created; you may attach the definition manually.`,
      );
      setDoneMessage(
        `Converted ${successes.length} question(s). You may need to attach the new definition manually.`,
      );
      return;
    }

    if (!Result.isSuccess(createResult)) {
      setPhase('done');
      setPhaseLabel('Done');
      setErrorBanner(
        createResult.message ||
          'Data lists were created but the new form could not be created.',
      );
      setDoneMessage(
        `Converted ${successes.length} question(s). You may need to attach the new definition manually.`,
      );
      return;
    }

    setPhase('done');
    setPhaseLabel('Done');
    setDoneMessage(
      `Created "${newFormName}" with ${successes.length} conversion(s). ${failed} failed or skipped.`,
    );
    router.push(`/forms/${createResult.value}/design`);
  }, [
    candidates,
    model.availableDataListNames,
    model.formIsEnabled,
    model.formName,
    router,
    surveyText,
  ]);

  const progressPct =
    candidates.length === 0
      ? 0
      : Math.round((completed / candidates.length) * 100);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Convert large choice lists
      </h4>
      <p className="mb-4 text-sm text-muted-foreground">
        Convert dropdown and tagbox questions that have at least the threshold
        number of inline choices into data lists. The open form is not
        modified; a new copy is created when at least one conversion succeeds.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="edx-choice-threshold">Minimum choices</Label>
          <Input
            id="edx-choice-threshold"
            type="number"
            min={1}
            value={threshold}
            disabled={phase !== 'idle' && phase !== 'done'}
            onChange={(e) => {
              const v = Number(e.target.value);
              setThreshold(Number.isFinite(v) && v >= 1 ? v : 1);
            }}
            className="w-28"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs text-muted-foreground">
            Convertible questions
          </div>
          <div className="text-lg font-semibold">{candidates.length}</div>
        </div>
        <div className="rounded-md border bg-background p-3">
          <div className="text-xs text-muted-foreground">Choices to move</div>
          <div className="text-lg font-semibold">{totalChoicesToMove}</div>
        </div>
      </div>

      {candidatePreview.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Preview{' '}
            {candidatePreview.length < candidates.length
              ? `(first ${candidatePreview.length})`
              : ''}
          </div>
          <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {candidatePreview.map((c) => (
              <li key={c.name}>
                <span className="font-medium">{c.name}</span>{' '}
                <span className="text-muted-foreground">
                  ({c.type}, {c.choiceCount} choices)
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          No convertible questions at this threshold.
        </p>
      )}

      {errorBanner ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorBanner}</AlertDescription>
        </Alert>
      ) : null}

      {doneMessage && phase === 'done' ? (
        <Alert className="mb-4">
          <AlertTitle>Finished</AlertTitle>
          <AlertDescription>{doneMessage}</AlertDescription>
        </Alert>
      ) : null}

      {lastSummary && phase === 'done' ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Last run: {lastSummary.succeeded} succeeded, {lastSummary.failed}{' '}
          failed or skipped.
        </p>
      ) : null}

      {phase === 'lists' || phase === 'form' ? (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{phaseLabel}</span>
            <span>
              {completed} / {candidates.length}
            </span>
          </div>
          <Progress value={progressPct} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              disabled={
                candidates.length === 0 ||
                (phase !== 'idle' && phase !== 'done')
              }
            >
              Convert with confirmation…
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Convert large choice lists</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-left">
                <p>
                  The current form in the designer will not be edited. Data
                  lists will be created for matching dropdown and tagbox
                  questions (at least {threshold} inline choices each).
                </p>
                <p>
                  After processing, a new form named like{' '}
                  <strong>{(model.formName || 'Form') + ' - Data Lists'}</strong>{' '}
                  will be created with successful conversions applied. Failed
                  conversions stay as inline choices in that copy.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={() => {
                  void runBulk();
                }}
              >
                Start conversion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {phase === 'done' ? (
          <Button type="button" variant="outline" onClick={resetRun}>
            Reset status
          </Button>
        ) : null}
      </div>
    </div>
  );
}
