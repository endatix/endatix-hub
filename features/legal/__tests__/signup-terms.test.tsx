import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SignupTerms } from "../signup-terms";

const document = {
  number: 1,
  versionId: "910000000000000001",
  markdown: "Published text",
  acceptanceRequired: true,
};
const legal = {
  required: document,
  terms: "/legal/terms",
  privacy: "/accept-terms/privacy",
  unavailable: false,
};

it("posts only the displayed Terms version when explicitly selected", () => {
  // Arrange
  const { container } = render(
    <form>
      <SignupTerms legal={legal} />
    </form>,
  );
  const form = container.querySelector("form")!;
  const checkbox = screen.getByRole("checkbox");
  // Act & Assert
  expect(form.checkValidity()).toBe(false);
  expect(new FormData(form).has("acceptedTermsVersionId")).toBe(false);
  fireEvent.click(checkbox);
  expect(form.checkValidity()).toBe(true);
  expect([...new FormData(form)]).toEqual([
    ["acceptedTermsVersionId", "910000000000000001"],
  ]);
  expect(
    screen.getByRole("link", { name: /Privacy/ }).getAttribute("href"),
  ).toBe("/accept-terms/privacy");
});

it("requires a new selection when the displayed version changes", () => {
  // Arrange
  const { rerender } = render(<SignupTerms legal={legal} />);
  fireEvent.click(screen.getByRole("checkbox"));
  // Act
  rerender(
    <SignupTerms
      legal={{
        ...legal,
        required: {
          ...document,
          number: 2,
          versionId: "52",
          markdown: "Revised text",
        },
      }}
    />,
  );
  // Assert
  expect(
    screen.getByRole<HTMLInputElement>("checkbox", { name: /version 2/ })
      .checked,
  ).toBe(false);
  expect(screen.getByText("Revised text")).toBeTruthy();
});
