import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Input } from "../input";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { Select, SelectTrigger, SelectValue } from "../select";
import { Textarea } from "../textarea";

/**
 * `aria-invalid:ring-destructive/20` (and its `dark:` twin) come later in the
 * CSS than `focus-visible:ring-focus-ring` at the same or higher specificity,
 * so a focused invalid control lost the brand focus ring. These two classes
 * outrank both and keep the 3:1 ring; `aria-invalid:border-destructive` stays.
 */
const FOCUSED_INVALID = [
  "aria-invalid:focus-visible:ring-focus-ring",
  "dark:aria-invalid:focus-visible:ring-focus-ring",
  "aria-invalid:border-destructive",
];

const CONTROLS: Record<string, ReactElement> = {
  Badge: <Badge aria-invalid />,
  Button: <Button aria-invalid>Save</Button>,
  Checkbox: <Checkbox aria-invalid aria-label="Agree" />,
  Input: <Input aria-invalid />,
  RadioGroupItem: (
    <RadioGroup>
      <RadioGroupItem value="a" aria-invalid />
    </RadioGroup>
  ),
  SelectTrigger: (
    <Select>
      <SelectTrigger aria-invalid>
        <SelectValue />
      </SelectTrigger>
    </Select>
  ),
  Textarea: <Textarea aria-invalid />,
};

describe("focused invalid controls", () => {
  it.each(Object.entries(CONTROLS))(
    "%s keeps the brand focus ring and the destructive border",
    (_, control) => {
      // Act
      const { container } = render(control);

      // Assert
      const element = container.querySelector("[aria-invalid]")!;
      for (const name of FOCUSED_INVALID)
        expect(element.classList).toContain(name);
    },
  );
});
