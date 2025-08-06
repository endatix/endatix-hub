# Example Custom Questions

This directory contains example custom questions to help developers get started.

## Quick Start
Test the scandit example question:

1. Open a terminal and cd into the root of the endatix-hub project

2. Copy the scandit question to the customizations folder:
   ```bash
   cp -r ./examples/questions/scandit ./customizations/questions/
   ```

3. Start development:
   ```bash
   # This will also run the discovery script and update the custom-questions.ts file
   pnpm dev
   ```
For more info on how to create custom questions, see the [customizations/questions/README.md](../../customizations/questions/README.md#development-workflow) section.

### Scandit Barcode Scanner Example
A complete example showing React Native WebView integration for barcode scanning.

**Files:**
- `scandit-question-model.ts` - Question model and SurveyJS registration
- `scandit-question-component.tsx` - React component and registration
- `index.ts` - Module export and icon registration
- `README.md` - Usage instructions