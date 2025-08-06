# Custom Questions Directory

This directory contains your custom question implementations. 

### Development Workflow

Endatix Hub is built using Next.js, which is based on React. This is why we use the [React flavor of SurveyJS](https://surveyjs.io/form-library/documentation/get-started-react). When you create custom questions, please refer to the React-specific documentation and examples provided in the [SurveyJS documentation](https://surveyjs.io/form-library/documentation/customize-question-types/third-party-component-integration-react). We have done our best to make the process as simple as possible staying true to the SurveyJS documentation, but if you have any questions, please don't hesitate to ask.

**Workflow Steps:**

1. Open a terminal and cd into the root of the endatix-hub project

2. Copy the example question:

   ```bash
   cp -r ./examples/questions/scandit ./customizations/questions/[your-question-name]
   ```

3. Rename the question:

In your `./customizations/questions/[your-question-name]` folder, rename the files as follows:

- `scandit-question-model.ts` -> `[your-question-name]-question-model.ts`
- `scandit-question-component.tsx` -> `[your-question-name]-question-component.tsx`

4. Customize the question:

- Modify the question logic in `[your-question-name]-question-model.ts`
- Update the React component in `[your-question-name]-question-component.tsx`
- Adjust metadata in `index.ts`

5. Start endatix-hub:

   ```bash
   # This will also run the discovery script and update the custom-questions.ts file
   pnpm dev
   ```

### Question Structure

Each question should follow this structure:

```
my-question/
├── index.ts                    # Main export (required)
├── my-question-model.ts        # Question model + SurveyJS registration
├── my-question-component.tsx   # React component + React registration
└── README.md                   # Documentation (optional)
```

### Project Structure

Current project structure:

```bash
hub/
├── examples/                            # ✨ Example questions for developers
│   └── questions/
│       ├── README.md                    # Setup and copying instructions
│       └── scandit/                     # Example question
│           ├── index.ts
│           ├── scandit-question-model.ts
│           ├── scandit-question-component.tsx
│           └── README.md
├── customizations/                      # 📦 Actual customizations
│   └── questions/
│       ├── custom-questions.ts          # 🔒 Auto-generated. DO NOT EDIT MANUALLY.
│       └── [your-question-name]         # Your custom question
└── [rest of hub structure]

```

## Best Practices

### Naming Conventions

- **Question folders**: Use kebab-case (e.g., `barcode-scanner`, `signature-pad`)
- **File names**: Use kebab-case with descriptive suffixes

### File Organization

- Include README files for complex questions
