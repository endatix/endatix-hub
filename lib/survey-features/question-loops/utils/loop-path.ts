import { PanelModel, Question } from "survey-core";
import { getOwningDynamicPanel } from "./panel-tree";

/**
 * Expression paths for loops inside dynamic panels.
 *
 * The survey expression engine addresses a value inside a dynamic panel by its
 * full path from the survey root — `{outer[0].inner[1].rating}`. A single-level
 * path (`{inner[1].rating}`) silently evaluates to `false` for a nested loop,
 * which is why exit conditions never fired.
 */

type DynamicPanelLike = Question & { panels?: PanelModel[] };

/**
 * The name a loop is addressed by from the survey root, with each ancestor's
 * panel index baked in.
 *
 * A page-level loop is just its name (`"favouriteCars"`). A loop inside panel 0
 * of `outer` is `"outer[0].innerLoop"`.
 */
export function getLoopQualifiedName(loopQuestion: Question): string {
  if (!loopQuestion?.name) {
    return "";
  }

  const segments: string[] = [loopQuestion.name];
  let current: Question = loopQuestion;

  while (current) {
    const owner = getOwningDynamicPanel(current) as DynamicPanelLike | undefined;
    if (!owner) {
      break;
    }

    const panel = current.parent as unknown as PanelModel | undefined;
    const panelIndex = panel ? (owner.panels ?? []).indexOf(panel) : -1;
    if (panelIndex < 0) {
      // Still a template element rather than a live instance: no index to bake
      // in, so the qualified name stops here.
      break;
    }

    segments.unshift(`${owner.name}[${panelIndex}]`);
    current = owner;
  }

  return segments.join(".");
}
