# Color Picker Example

A complete example showing React Color integration for color selection in surveys.

## Quick Start

1. Install dependencies:
   ```bash
   pnpm add react-color
   pnpm add @types/react-color -D
   ```

2. Copy to customizations:
   ```bash
   cp -r ./examples/questions/color-picker ./customizations/questions/
   ```

3. Start development:
   ```bash
   pnpm dev
   ```

## Features
- Three color picker types: Slider, Sketch, Compact
- Alpha channel support for Sketch picker
- Property grid integration
- SurveyJS native registration pattern

## Source
Based on [SurveyJS Third-Party Component Integration](https://surveyjs.io/form-library/documentation/customize-question-types/third-party-component-integration-react) documentation.

Main difference is seperating the question model and component into different files to show easier to maintain code, but this is not required.