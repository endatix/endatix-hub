# Example Custom Questions

This directory contains example custom questions to help developers get started.

## Quick Start

1. **Copy an example question:**
   ```bash
   cp -r /examples/questions/scandit /customizations/questions/
   ```

2. **Customize as needed:**
   - Modify the question logic in `*-question-model.ts`
   - Update the React component in `*-question-component.tsx`
   - Adjust metadata in `index.ts`

3. **Run discovery script:**
   ```bash
   pnpm discover-questions
   ```

4. **Start development:**
   ```bash
   pnpm dev
   ```

## Examples

### Scandit Barcode Scanner
A complete example showing React Native WebView integration for barcode scanning.

**Files:**
- `scandit-question-model.ts` - Question model and SurveyJS registration
- `scandit-question-component.tsx` - React component and registration
- `index.ts` - Module export and icon registration
- `README.md` - Usage instructions

**Usage:**
Copy to your customizations folder and the question will be automatically discovered and available in the form editor one your run `pnpm dev` or `pnpm build`.