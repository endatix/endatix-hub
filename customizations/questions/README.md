# Custom Questions Directory

This directory contains your custom question implementations.

## Getting Started

1. **Copy from examples:**
   ```bash
   cp -r ./examples/questions/scandit ./customizations/questions/
   ```

2. **Questions are automatically discovered and loaded**

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
├── customizations/                      # 🔒 PROTECTED: Actual customizations
│   └── questions/
│       ├── custom-questions.ts          # Auto-generated
│       └── [customer-specific-folders]  # Customer questions
└── [rest of hub structure]

```

## Development Workflow

1. **Copy an example question**
   ```bash
   cp -r hub/examples/questions/scandit hub/customizations/questions/acme-corp/
   ```

2. **Customize the logic and UI**
   - Modify question model in `*-model.ts`
   - Update React component in `*-component.tsx`
   - Adjust metadata in `index.ts`

3. **Run discovery script**
   ```bash
   pnpm discover-questions
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## Best Practices

### Naming Conventions
- **Question folders**: Use kebab-case (e.g., `barcode-scanner`, `signature-pad`)
- **File names**: Use kebab-case with descriptive suffixes

### File Organization
- Include README files for complex questions