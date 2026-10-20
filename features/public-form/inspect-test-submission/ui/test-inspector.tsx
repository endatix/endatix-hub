"use client";

import type { TestInspectorView } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import { DropdownMenu } from "radix-ui";
import type { SurveyModel } from "survey-core";
import { TestInspectorMenu } from "./test-inspector-menu";
import { TestInspectorTrigger } from "./test-inspector-trigger";
import styles from "./test-inspector.module.css";

export type TestInspectorProps = {
  view: TestInspectorView;
  /** The survey it renders beside; null on the completed and closed pages. Live values read it. */
  model: SurveyModel | null;
};

/**
 * The tester's corner menu on a test page, modelled on the Next.js dev indicator. Shows only what
 * the page already loaded. Loaded as its own chunk, only when the server sent a view.
 */
export default function TestInspector({ view }: Readonly<TestInspectorProps>) {
  return (
    <aside
      aria-label="Test inspector"
      className={styles.anchor}
      data-testid="test-inspector"
    >
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <TestInspectorTrigger />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <div className={styles.theme}>
            <TestInspectorMenu view={view} />
          </div>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </aside>
  );
}
