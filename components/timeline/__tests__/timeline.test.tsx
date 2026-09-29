import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "..";

function renderTimeline(value: number) {
  return render(
    <Timeline value={value} aria-label="History">
      {["Created", "Approved", "Provisioned"].map((title, index) => (
        <TimelineItem key={title} step={index + 1}>
          <TimelineHeader>
            <TimelineDate dateTime="2026-01-15T10:00:00Z">Jan 15</TimelineDate>
            <TimelineTitle>{title}</TimelineTitle>
          </TimelineHeader>
          <TimelineIndicator />
          <TimelineSeparator />
        </TimelineItem>
      ))}
    </Timeline>,
  );
}

describe("Timeline", () => {
  it("is an ordered list whose steps are list items", () => {
    // Act
    renderTimeline(2);

    // Assert
    const list = screen.getByRole("list", { name: "History" });
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks steps up to the value completed, and the value itself active", () => {
    // Act
    renderTimeline(2);

    // Assert
    const [first, second, third] = screen.getAllByRole("listitem");
    expect(first.hasAttribute("data-completed")).toBe(true);
    expect(first.hasAttribute("data-active")).toBe(false);
    expect(second.hasAttribute("data-active")).toBe(true);
    expect(third.hasAttribute("data-completed")).toBe(false);
  });

  it("keeps titles out of the heading outline unless asked", () => {
    // Act
    renderTimeline(1);

    // Assert
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
    expect(screen.getByText("Created").tagName).toBe("P");
    expect(screen.getAllByText("Jan 15")[0].tagName).toBe("TIME");
  });
});
