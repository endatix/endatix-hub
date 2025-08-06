import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUESTIONS_DIR = "customizations/questions";

const questionsDir = path.join(__dirname, `../${QUESTIONS_DIR}`);
const outputFile = path.join(
  __dirname,
  `../${QUESTIONS_DIR}/custom-questions.ts`,
);

// Ensure the output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Discover all question directories with fallback
let questions = [];
try {
  if (fs.existsSync(questionsDir)) {
    questions = fs
      .readdirSync(questionsDir)
      .filter((dir) => {
        const questionPath = path.join(questionsDir, dir);
        return (
          fs.statSync(questionPath).isDirectory() &&
          fs.existsSync(path.join(questionPath, "index.ts"))
        );
      })
      .sort(); // Sort for consistent ordering
  } else {
    console.log(`⚠️ Questions directory not found: ${questionsDir}`);
  }
} catch (error) {
  console.log(`⚠️ Error reading questions directory: ${error.message}`);
}

// Generate import statements
const imports =
  questions.map((dir) => `import "@/${QUESTIONS_DIR}/${dir}";`).join("\n") ||
  "";

// Generate the content
const content = `// Auto-generated file - do not edit manually
// This file ensures all custom questions are included in the build
// Generated on: ${new Date().toISOString()}

${imports}

export const customQuestions = ${JSON.stringify(questions, null, 2)};
`;

// Write the file
fs.writeFileSync(outputFile, content);

if (questions.length > 0) {
  console.log(
    ` 🔎 Found ${questions.length} custom ${
      questions.length === 1 ? "question" : "questions"
    }`,
  );
  questions.forEach((q) => console.log(`\t- ${q}`));
  console.log(" \x1b[32m✓\x1b[0m custom-questions.ts generated");
} else {
  console.log(" 🔎 No custom questions found");
}

console.log("\n");
