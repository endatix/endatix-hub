import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { TruncatedId } from "@/components/common/truncated-id";
import { SupportReference } from "../ui/support-reference";

const traceId = "00-38fd521c07dcc618be3ea49d200a2fa4-7b64a605da768236-00";
const copyControl = () =>
  screen.getByRole("button", { name: /^Copy/ }).closest("div")!;

it("keeps the support reference's copy control visible without hover", () => {
  render(<SupportReference traceId={traceId} />);
  expect(copyControl().className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
});

it("leaves other truncated ids revealing their copy control on hover", () => {
  render(<TruncatedId id={traceId} />);
  expect(copyControl().className).toMatch(/(^|\s)opacity-0(\s|$)/);
});
