import { getQuestionDataListName } from "@/lib/survey-features/data-lists/utils";

export function buildReservedDataListNames(names: string[]): Set<string> {
  return new Set(names.map((name) => name.toLowerCase()));
}

export async function collectReservedDataListNames(params: {
  knownNames: string[];
  candidates: Array<{ title?: string; name: string; type?: string }>;
  searchNames: (query: string) => Promise<string[]>;
}): Promise<Set<string>> {
  const reserved = buildReservedDataListNames(params.knownNames);

  for (const candidate of params.candidates) {
    const seed = getQuestionDataListName(
      {
        title: candidate.title,
        name: candidate.name,
        type: candidate.type,
      },
      new Set(),
    );
    const matches = await params.searchNames(seed);
    for (const name of matches) {
      reserved.add(name.toLowerCase());
    }
  }

  return reserved;
}
