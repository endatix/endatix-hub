#!/usr/bin/env node
/**
 * Writes the generated audience fixtures from the spec below, with a seeded random source, so every
 * run writes the same bytes:
 *
 * - `demo/acme-demo.properties.json`, `demo/acme-demo.survey.json`, `demo/acme-demo.csv` and
 *   `demo/acme-demo-update.csv`: the ACME demo set, which shows every personalization feature;
 * - `cedar-grove-pulse-5000.csv`: the 5,000-row import sample. Its first 20 rows are
 *   `cedar-grove-pulse.csv`, which this script reads and never writes.
 *
 * `node e2e/fixtures/audience/generate.mjs` writes the files. `--check` writes nothing and exits 1
 * when a file on disk differs from what the spec makes.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** mulberry32: a small seeded generator, enough for fixture data. */
function seededRandom(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const pick = (items) => items[int(0, items.length - 1)];
  const weighted = (entries) => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return entries[entries.length - 1][0];
  };
  return { next, int, pick, weighted };
}

const pad = (value, width) => String(value).padStart(width, "0");

function csvCell(value) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvText(headers, rows) {
  return (
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") +
    "\n"
  );
}

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

// ---------------------------------------------------------------------------------------------
// ACME demo set
// ---------------------------------------------------------------------------------------------

const DEMO_SEED = 1296;

/** The single-choice Property's choices. The survey lists every one but `online`. */
const REGIONS = ["north", "south", "east", "west", "online"];
const SURVEY_REGIONS = ["north", "south", "east", "west"];
/** The one participant whose `region` the survey's radiogroup does not list. */
const OFF_CHOICE_PARTICIPANT = "ACME-VIP-0003";

const TAGS = ["coffee", "tea", "pastries", "sandwiches"];

const DEMO_PROPERTIES = [
  { name: "full_name", dataType: "text" },
  { name: "age", dataType: "number" },
  { name: "loyalty_member", dataType: "boolean" },
  { name: "joined", dataType: "date" },
  { name: "last_visit", dataType: "date_time" },
  {
    name: "region",
    dataType: "single_choice",
    choicesJson: JSON.stringify(REGIONS),
  },
  {
    name: "tags",
    dataType: "multiple_choice",
    choicesJson: JSON.stringify(TAGS),
  },
];

const DEMO_HEADERS = [
  "external_id",
  "full_name",
  "age",
  "loyalty_member",
  "joined",
  "last_visit",
  "region",
  ...TAGS.map((tag) => `tags__${tag}`),
];

/** The update file leaves this Property's column out. */
const LEFT_OUT_COLUMN = "joined";

const FIRST_NAMES = [
  "Ava",
  "Ben",
  "Chloe",
  "Daniel",
  "Elena",
  "Farid",
  "Grace",
  "Hugo",
  "Isla",
  "Jonas",
  "Kira",
  "Liam",
  "Maya",
  "Noah",
  "Olivia",
  "Priya",
  "Quinn",
  "Rosa",
  "Sam",
  "Tara",
  "Uma",
  "Victor",
];
const LAST_NAMES = [
  "Abbott",
  "Brooks",
  "Carter",
  "Diaz",
  "Evans",
  "Fischer",
  "Hughes",
  "Ito",
  "Jensen",
  "Kowalski",
  "Lopez",
  "Moreau",
  "Nakamura",
  "Okafor",
  "Patel",
  "Quist",
];

/**
 * What the update file does to each participant, in identifier order:
 * - `changed`: new values, so both rules update them;
 * - `emptied`: the same values with `last_visit` and `region` left empty, so only "clear" updates them;
 * - `unchanged`: the same values; they have no `joined` value to clear, so neither rule updates them.
 */
const UPDATE_PLAN = [
  ["changed", 18],
  ["emptied", 6],
  ["unchanged", 4],
];

const DEMO_PEOPLE = [
  ...Array.from({ length: 8 }, (_, at) => `ACME-VIP-${pad(at + 1, 4)}`),
  ...Array.from({ length: 20 }, (_, at) => `ACME-STD-${pad(at + 1, 4)}`),
];

/** Months of 2026: the first file's visits, and the update's, which are always later. */
const FIRST_VISITS = [1, 6];
const LATER_VISITS = [7, 10];

function isoDate(random, fromYear, toYear) {
  return `${random.int(fromYear, toYear)}-${pad(random.int(1, 12), 2)}-${pad(random.int(1, 28), 2)}`;
}

function isoDateTime(random, year, [firstMonth, lastMonth]) {
  const date = `${year}-${pad(random.int(firstMonth, lastMonth), 2)}-${pad(random.int(1, 28), 2)}`;
  return `${date}T${pad(random.int(8, 19), 2)}:${pad(random.pick([0, 15, 30, 45]), 2)}:00Z`;
}

function demoPerson(random, identifier, kind) {
  const tags = TAGS.map(() => (random.next() < 0.45 ? "1" : ""));
  return {
    external_id: identifier,
    full_name: `${random.pick(FIRST_NAMES)} ${random.pick(LAST_NAMES)}`,
    age: String(random.int(19, 78)),
    loyalty_member: identifier.includes("VIP")
      ? "true"
      : random.pick(["true", "false"]),
    joined: kind === "unchanged" ? "" : isoDate(random, 2019, 2025),
    last_visit: isoDateTime(random, 2026, FIRST_VISITS),
    region:
      identifier === OFF_CHOICE_PARTICIPANT
        ? "online"
        : random.pick(SURVEY_REGIONS),
    tags,
  };
}

function demoRow(person) {
  return [
    person.external_id,
    person.full_name,
    person.age,
    person.loyalty_member,
    person.joined,
    person.last_visit,
    person.region,
    ...person.tags,
  ];
}

function updated(random, person, kind) {
  if (kind === "unchanged") return person;
  if (kind === "emptied") return { ...person, last_visit: "", region: "" };
  const region =
    person.external_id === OFF_CHOICE_PARTICIPANT
      ? person.region
      : random.pick(SURVEY_REGIONS);
  return {
    ...person,
    age: String(Number(person.age) + 1),
    last_visit: isoDateTime(random, 2026, LATER_VISITS),
    region,
    tags: person.tags.map((tick, at) => (at === 0 ? (tick ? "" : "1") : tick)),
  };
}

function demoKinds() {
  return UPDATE_PLAN.flatMap(([kind, count]) => Array(count).fill(kind));
}

/** Where the two rejected rows go, as 0-based positions among the data rows. */
const BLANK_IDENTIFIER_AT = 11;
const DUPLICATE_AT = 19;
const DUPLICATED_PARTICIPANT = "ACME-STD-0004";

function demoFiles() {
  const random = seededRandom(DEMO_SEED);
  const kinds = demoKinds();
  const people = DEMO_PEOPLE.map((identifier, at) =>
    demoPerson(random, identifier, kinds[at]),
  );

  const rows = people.map(demoRow);
  const blank = demoRow({
    ...demoPerson(random, "", "changed"),
    external_id: "",
  });
  const duplicate = demoRow(
    demoPerson(random, DUPLICATED_PARTICIPANT, "changed"),
  );
  rows.splice(BLANK_IDENTIFIER_AT, 0, blank);
  rows.splice(DUPLICATE_AT, 0, duplicate);

  const updateHeaders = DEMO_HEADERS.filter(
    (header) => header !== LEFT_OUT_COLUMN,
  );
  const updateRows = people
    .map((person, at) => updated(random, person, kinds[at]))
    .map((person) =>
      demoRow(person).filter((_, at) => DEMO_HEADERS[at] !== LEFT_OUT_COLUMN),
    );

  return {
    "demo/acme-demo.properties.json": jsonText(DEMO_PROPERTIES),
    "demo/acme-demo.survey.json": jsonText(demoSurvey()),
    "demo/acme-demo.csv": csvText(DEMO_HEADERS, rows),
    "demo/acme-demo-update.csv": csvText(updateHeaders, updateRows),
  };
}

function demoSurvey() {
  const label = (value) => value[0].toUpperCase() + value.slice(1);
  return {
    title: "ACME customer check-in",
    description: "Hello {full_name}, please check the details we hold for you.",
    pages: [
      {
        name: "page1",
        elements: [
          {
            type: "text",
            name: "fullName",
            title: "Your name",
            defaultValueExpression: "{full_name}",
          },
          {
            type: "text",
            name: "ageNextYear",
            title: "Your age next year",
            inputType: "number",
            defaultValueExpression: "{age} + 1",
          },
          {
            type: "boolean",
            name: "loyaltyMember",
            title: "ACME Rewards member",
            defaultValueExpression: "{loyalty_member}",
          },
          {
            type: "text",
            name: "joined",
            title: "Customer since",
            inputType: "date",
            defaultValueExpression: "{joined}",
          },
          {
            type: "radiogroup",
            name: "homeRegion",
            title: "Which region do you shop in most?",
            choices: SURVEY_REGIONS.map((value) => ({
              value,
              text: label(value),
            })),
            defaultValueExpression: "{region}",
          },
          {
            type: "tagbox",
            name: "favourites",
            title: "What do you usually buy?",
            choices: TAGS.map((value) => ({ value, text: label(value) })),
            defaultValueExpression: "{tags}",
          },
          {
            type: "text",
            name: "lastVisit",
            title: "When did you last visit?",
            inputType: "datetime-local",
            defaultValueExpression: "edxLocalDateTime({last_visit})",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Cedar Grove Pulse, 5,000 rows
// ---------------------------------------------------------------------------------------------

const CEDAR_SEED = 5000;
const CEDAR_ROWS = 5000;
const CEDAR_SAMPLE = "cedar-grove-pulse.csv";
const FIRST_HOUSEHOLD = 123455;

const CEDAR_REGIONS = [
  [["01. TOTAL CAPITAL", "01. CAPITAL METRO"], 1257],
  [["03. TOTAL ATLANTIC", "05. ATLANTIC - CHARLESTON + SUMMERVILLE"], 919],
  [["05. TOTAL GREAT LAKES", "11. GREAT LAKES - MILWAUKEE"], 783],
  [["04. TOTAL PACIFIC", "07. PACIFIC - PORTLAND"], 774],
  [["02. TOTAL MIDWEST", "03. MIDWEST - COLUMBUS"], 738],
  [["06. TOTAL MOUNTAIN", "13. MOUNTAIN - DENVER"], 529],
];
const CEDAR_SES = [
  [3, 2286],
  [2, 941],
  [4, 774],
  [1, 501],
  [5, 498],
];
const CEDAR_AGE_BANDS = [
  [["50+", 50, 85], 2733],
  [["35 to 49 years", 35, 49], 1768],
  [["Up to 34 years", 18, 34], 499],
];
const CEDAR_HOUSEHOLDS = [
  [1, 744],
  [2, 1729],
  [3, 208],
  [4, 1822],
  [5, 103],
  [6, 190],
  [7, 107],
  [8, 97],
];
const ADULTS_ONLY = "7. 18 years or older";
const CEDAR_YOUNGEST = [
  [ADULTS_ONLY, 2480],
  ["5. Between 5 and 12 years", 517],
  ["2. Up to 2 years", 512],
  ["6. Between 13 and 18 years", 493],
  ["1. Up to 1 year", 254],
];

function familySize(householdSize) {
  if (householdSize <= 2) return "1 to 2 people";
  return householdSize <= 4 ? "3 to 4 people" : "5+ people";
}

function cedarRow(random, number) {
  const [region, city] = random.weighted(CEDAR_REGIONS);
  const ses = random.weighted(CEDAR_SES);
  const [band, youngestAge, oldestAge] = random.weighted(CEDAR_AGE_BANDS);
  const householdSize = random.weighted(CEDAR_HOUSEHOLDS);
  return [
    `CG-${pad(number, 6)}-01`,
    String(FIRST_HOUSEHOLD + number),
    region,
    city,
    String(ses),
    ses === 5 ? "5y6" : String(ses),
    band,
    String(random.int(youngestAge, oldestAge)),
    familySize(householdSize),
    String(householdSize),
    householdSize === 1 ? ADULTS_ONLY : random.weighted(CEDAR_YOUNGEST),
    "1",
  ].join(",");
}

function cedarFile() {
  const sample = readFileSync(path.join(HERE, CEDAR_SAMPLE), "utf8")
    .trimEnd()
    .split("\n");
  const random = seededRandom(CEDAR_SEED);
  const generated = Array.from(
    { length: CEDAR_ROWS - (sample.length - 1) },
    (_, at) => cedarRow(random, sample.length + at),
  );
  return {
    "cedar-grove-pulse-5000.csv": [...sample, ...generated].join("\n") + "\n",
  };
}

// ---------------------------------------------------------------------------------------------

export function generatedFiles() {
  return { ...demoFiles(), ...cedarFile() };
}

function readOrNull(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function main(argv) {
  const check = argv.includes("--check");
  const stale = [];
  for (const [name, text] of Object.entries(generatedFiles())) {
    const file = path.join(HERE, name);
    if (readOrNull(file) === text) continue;
    stale.push(name);
    if (!check) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
  }
  const verb = check ? "out of date" : "written";
  console.log(
    stale.length
      ? `${verb}: ${stale.join(", ")}`
      : "audience fixtures are up to date",
  );
  return check && stale.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
