import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import type { PreviewAsData } from "../load-preview-as.server";
import type { PickerGroup } from "./participant-picker";

type ListData = Pick<
  PreviewAsData,
  | "testParticipants"
  | "totalTest"
  | "matches"
  | "totalMatches"
  | "search"
  | "selected"
>;

const shownOf = (shown: number, total: number, what: string) =>
  total > shown
    ? `First ${shown} of ${total} ${what}. Search to find the rest.`
    : undefined;

function testNote({ testParticipants, totalTest }: ListData) {
  if (totalTest === 0) return "No Test participants yet.";
  return shownOf(testParticipants.length, totalTest, "Test participants");
}

function matchesNote(page: number, others: number, total: number) {
  if (total === 0) return "Nobody on this form matches.";
  if (others === 0 && total <= page) return "Every match is listed above.";
  return shownOf(page, total, "matches");
}

function matchesGroup(data: ListData): PickerGroup[] {
  const { testParticipants, matches, totalMatches, search } = data;
  if (!matches) return [];
  const listed = new Set(testParticipants.map((p) => p.audienceMemberId));
  const others = matches.filter((p) => !listed.has(p.audienceMemberId));
  const note = matchesNote(matches.length, others.length, totalMatches);
  return [{ label: `Matching “${search}”`, people: others, note }];
}

export function previewedPerson(
  selected: PreviewAsData["selected"],
): AudiencePerson | undefined {
  return selected?.status === "found" ? selected.person : undefined;
}

function previewingGroup(groups: PickerGroup[], data: ListData): PickerGroup[] {
  const person = previewedPerson(data.selected);
  if (!person) return [];
  const listed = groups.some((group) =>
    group.people.some((p) => p.audienceMemberId === person.audienceMemberId),
  );
  return listed ? [] : [{ label: "Previewing", people: [person] }];
}

/** Test participants first, then the search's other matches; a linked outsider on top. */
export function pickerGroups(data: ListData): PickerGroup[] {
  const test = {
    label: "Test participants",
    people: data.testParticipants,
    note: testNote(data),
  };
  const groups = [test, ...matchesGroup(data)];
  return [...previewingGroup(groups, data), ...groups];
}
