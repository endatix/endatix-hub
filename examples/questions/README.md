# Custom Questions Framework

This directory contains custom questions that are dynamically discovered and loaded by the Next.js application using auto-generated SurveyJS registration.

## Convention

### Directory Structure
```
examples/questions/
├── [question-name]/
│   ├── index.ts                    # Required: Main entry point
│   ├── [question-name]-model.tsx   # Optional: Question model
│   └── README.md                   # Optional: Documentation
```

### Naming Convention
- **Question folders**: Use kebab-case (e.g., `crazy-bird`, `custom-slider`)
- **Entry point**: Must be named `index.ts`
- **Question model**: Use `[question-name]-model.tsx` for better IDE support
- **Optional files**: Can include documentation and type definitions

### Entry Point Format (Auto-Generation)
```typescript
// examples/questions/[question-name]/index.ts
import { createCustomQuestion } from "@/lib/questions/question-factory";
import { MyQuestionModel } from "./my-question-model";

const myQuestion = createCustomQuestion(
  "my-question",           // Question name
  "My Question Title",     // Display title
  MyQuestionModel,         // Model class (auto-generates registration)
);

export default myQuestion;

// Named exports for direct imports
export { MyQuestionModel } from "./my-question-model";
```

## Example Questions

### Scandit (Barcode Scanner)
- **Location**: `scandit/`
- **Purpose**: Barcode scanning functionality
- **Files**: `index.ts`, `scandit-question-model.tsx`
- **Auto-generation**: SurveyJS registration handled automatically

### Crazy Bird (Example)
- **Location**: `crazy-bird/`
- **Purpose**: Simple example for testing
- **Files**: `index.ts`
- **Auto-generation**: Uses factory for consistent structure

## Development

### Adding a New Question (Simplified)
1. Create a new directory in `examples/questions/[question-name]/`
2. Create a question model file: `[question-name]-model.tsx`
3. Create an `index.ts` file using the factory:
   ```typescript
   import { createCustomQuestion } from "@/lib/questions/question-factory";
   import { MyQuestionModel } from "./my-question-model";
   
   const myQuestion = createCustomQuestion(
     "my-question",
     "My Question Title",
     MyQuestionModel,
   );
   
   export default myQuestion;
   ```
4. The question will be automatically discovered, loaded, and registered with SurveyJS

### Auto-Generation Benefits
- ✅ **No manual registration code** - SurveyJS integration handled automatically
- ✅ **Consistent structure** - All questions follow the same pattern
- ✅ **Type safety** - Proper validation and error handling
- ✅ **Smart defaults** - Icon and category auto-generated
- ✅ **Flexible** - Can override with custom registration if needed

### Testing
Run the static module test to verify your question loads correctly:
```bash
npx tsx lib/questions/test-static-module.ts
```

## Integration

Questions are automatically:
- Discovered during build time
- Split into separate chunks for lazy loading
- Available for dynamic loading at runtime
- Hot reloaded during development
- Registered with SurveyJS using auto-generated code
- Cached for optimal performance 