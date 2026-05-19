import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { ItemValue, type Model, type Question } from "survey-core";
import {
  getDataListAnswerValues,
  isDataListQuestion,
} from "./data-list-survey-integration";
import { registerDataListGlobals } from "./registry";
import { bindDataListsToSurvey } from "./survey-bindings";
import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";

/** Uses Survey's `getChoiceDisplayValue` method to resolve display values for a data-list question. */
function resolveChoiceDisplayValues(
  model: Model,
  question: Question,
  values: unknown[],
): Promise<string[]> {
  return new Promise((resolve) => {
    model.getChoiceDisplayValue({
      question,
      values,
      setItems: (displayValues) => {
        if (!displayValues) {
          resolve(values.map((value) => String(value)));
          return;
        }
        resolve(displayValues);
      },
    });
  });
}

function applyDisplayLabelsToQuestion(
  question: Question,
  values: unknown[],
  displayLabels: string[],
): void {
  values.forEach((rawValue, index) => {
    const label = displayLabels[index]?.trim();
    if (!label) {
      return;
    }

    const valueStr = String(rawValue);
    if (label === valueStr) {
      return;
    }

    const storedValue =
      question.value !== null &&
      question.value !== undefined &&
      String(question.value) === valueStr
        ? question.value
        : rawValue;

    const existing = question.choices.find(
      (choice: ItemValue) => String(choice.value) === valueStr,
    );
    if (existing) {
      existing.text = label;
      return;
    }

    question.choices.push(new ItemValue({ value: storedValue, text: label }));
  });
}

function finalizeLazyLoadQuestion(question: Question): void {
  if (
    "choicesLazyLoadEnabled" in question &&
    (question as Question & { choicesLazyLoadEnabled?: boolean })
      .choicesLazyLoadEnabled === true
  ) {
    (
      question as Question & { choicesLazyLoadEnabled: boolean }
    ).choicesLazyLoadEnabled = false;
  }
}

async function mintServerFormAccessJwt(
  formId: string,
): Promise<
  Pick<FormRuntimeState, "formAccessJwt" | "formAccessJwtExpiresAtUtc">
> {
  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const tokenResult = await api.forms.createFormAccessToken(formId);

  if (!tokenResult.success) {
    console.warn("primeDataListDisplayValues: could not mint form access JWT", {
      type: tokenResult.error.type,
      message: tokenResult.error.message,
    });
    return {};
  }

  return {
    formAccessJwt: tokenResult.data.token,
    formAccessJwtExpiresAtUtc: tokenResult.data.expiresAtUtc,
  };
}

/**
 * Resolves data-list display labels on a server-built Survey model (PDF export).
 * Uses Survey `getChoiceDisplayValue` + the same bindings as the live form, then
 * awaits all callbacks before synchronous PDF render.
 */
export async function primeDataListDisplayValues(
  model: Model,
  formId: string,
): Promise<void> {
  registerDataListGlobals();

  const dataListQuestions = model
    .getAllQuestions(true)
    .filter((question) => isDataListQuestion(question));

  if (dataListQuestions.length === 0) {
    return;
  }

  const runtimeState: FormRuntimeState = {
    formId,
    ...(await mintServerFormAccessJwt(formId)),
  };

  if (!runtimeState.formAccessJwt) {
    return;
  }

  const deps: ExtensionRuntimeDeps = {
    getRuntimeState: () => runtimeState,
  };

  const dispose = bindDataListsToSurvey(model, deps);

  try {
    const tasks: Promise<void>[] = [];

    for (const question of dataListQuestions) {
      const values = getDataListAnswerValues(question);
      if (values.length === 0) {
        continue;
      }

      tasks.push(
        resolveChoiceDisplayValues(model, question, values).then(
          (displayLabels) => {
            applyDisplayLabelsToQuestion(question, values, displayLabels);
            finalizeLazyLoadQuestion(question);
          },
        ),
      );
    }

    await Promise.all(tasks);
  } finally {
    dispose();
  }
}
