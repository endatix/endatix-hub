# Endatix Extensions

This directory contains custom extensions that enhance SurveyJS functionality in your Endatix application.

## What are Extensions?

Extensions allow you to customize SurveyJS behavior without modifying core code. They support:

- **Custom Questions**: Add new question types (barcode scanners, signature pads, etc.)
- **Global Patches**: Modify SurveyJS prototypes and defaults
- **Model Hooks**: Run code when survey instances are created
- **Creator Customization**: Customize the form editor experience

## Extension Types

| Type | When it Runs | Use Cases |
|------|-------------|-----------|
| `init` | Once at app startup | Prototype patches, global settings |
| `question` | At registration | Custom question types |
| `model` | Per survey instance | Event handlers, analytics |
| `creator` | Per editor instance | Toolbox customization, tabs |
| `composite` | Multiple phases | All-in-one extensions |

## Adding a New Extension

### Step 1: Create Your Extension

Create a new folder and index file:

```bash
mkdir -p customizations/extensions/my-extension
touch customizations/extensions/my-extension/index.ts
```

### Step 2: Define the Extension

```typescript
// customizations/extensions/my-extension/index.ts

import type { InitExtension } from '@/lib/survey-extensions';

export const myExtension: InitExtension = {
  id: 'my-extension',
  name: 'My Extension',
  type: 'init',
  description: 'What this extension does',
  
  onInit: () => {
    // Your initialization code
    console.log('Extension initialized!');
  },
};
```

### Step 3: Register in SurveyExtensions

```typescript
// customizations/extensions/survey-extensions.tsx

import { myExtension } from './my-extension';

const activeExtensions = [
  cameraFixExtension,
  myExtension, // Add your extension
];
```

That's it! Your extension is now active.

## Extension Examples

### Init Extension (Global Patch)

```typescript
import type { InitExtension } from '@/lib/survey-extensions';

export const myPatchExtension: InitExtension = {
  id: 'my-patch',
  name: 'My Patch',
  type: 'init',
  
  onInit: () => {
    // Modify SurveyJS defaults, prototypes, etc.
  },
};
```

### Question Extension

```typescript
import dynamic from 'next/dynamic';
import type { QuestionExtension } from '@/lib/survey-extensions';

// Lazy load for better performance
const MyQuestionComponent = dynamic(
  () => import('./component').then(m => ({ default: m.MyQuestion })),
  { ssr: false }
);

export const myQuestionExtension: QuestionExtension = {
  id: 'my-question',
  name: 'My Question',
  type: 'question',
  
  config: {
    name: 'myquestion',
    title: 'My Question Type',
    iconName: 'icon-custom',
    questionJSON: { type: 'text' }, // Base structure
  },
  
  component: MyQuestionComponent,
  
  customizeEditor: (creator) => {
    creator.toolbox.changeCategory('myquestion', 'custom');
  },
};
```

### Model Extension (Event Handlers)

```typescript
import type { ModelExtension } from '@/lib/survey-extensions';

export const analyticsExtension: ModelExtension = {
  id: 'analytics',
  name: 'Analytics Tracking',
  type: 'model',
  
  onModelCreated: (model) => {
    // Attach event handlers to this survey instance
    model.onComplete.add((sender) => {
      console.log('Survey completed!', sender.data);
    });
    
    model.onValueChanged.add((sender, options) => {
      console.log('Answer changed:', options.name, options.value);
    });
  },
};
```

## Performance Tips

### Lazy Loading

For heavy components or third-party libraries, use lazy loading:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy'), { 
  ssr: false,
  loading: () => <div>Loading...</div>
});
```

**When to lazy load:**
- ✅ Third-party libraries (barcode scanners, media processors)
- ✅ Questions used in <10% of forms
- ✅ Components >50KB
- ❌ Core questions used frequently
- ❌ Simple wrappers

## Architecture

```
┌────────────────────────────────────────┐
│  app/layout.tsx (Server Component)    │
│  └─> import SurveyExtensions     │
└─────────────┬──────────────────────────┘
              │ (Safe ✅ - component import)
              ▼
┌────────────────────────────────────────┐
│  SurveyExtensions ('use client')  │
│  ├─> import extensions (with functions)│
│  └─> <ExtensionProvider />             │
└─────────────┬──────────────────────────┘
              │ (All on client ✅)
              ▼
┌────────────────────────────────────────┐
│  ExtensionProvider                     │
│  └─> registry.initializeExtensions()  │
└────────────────────────────────────────┘
```

## Debugging

Check which extensions are registered:

```typescript
import { useExtensions } from '@/lib/survey-extensions';

function MyComponent() {
  const registry = useExtensions();
  
  console.log('All extensions:', registry.getAll());
  console.log('Init extensions:', registry.getByType('init'));
  console.log('Questions:', registry.getByType('question'));
}
```

## Migration from Old System

If you have custom questions in `customizations/questions/`:

1. Convert to extension format (see examples above)
2. Move to `customizations/extensions/[name]/`
3. Register in `application-extensions.tsx`
4. Test thoroughly
5. Delete old question files

## Need Help?

- Check the `camera-fix` extension for a working example
- See SurveyJS docs: https://surveyjs.io/form-library/documentation/
- Review `lib/survey-extensions/types.ts` for all extension interfaces
