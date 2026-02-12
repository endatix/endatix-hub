/**
 * Sample form definitions for testing extensions.
 * Use in dev or tests to verify extension loading.
 */

/** Form with file question – triggers camera-fix extension. */
export const sampleFormWithFileQuestion = {
  title: 'Sample form (file question)',
  pages: [
    {
      name: 'page1',
      elements: [
        {
          type: 'file',
          name: 'q1',
          title: 'Upload a file or take a photo',
        },
      ],
    },
  ],
} as const;

/** Form with hello-world custom question – triggers hello-world extension. */
export const sampleFormWithHelloWorld = {
  title: 'Sample form (Hello World)',
  pages: [
    {
      name: 'page1',
      elements: [
        {
          type: 'hello-world',
          name: 'q1',
          title: 'Hello World question',
        },
      ],
    },
  ],
} as const;

/** Form with country specialized question – triggers country extension. */
export const sampleFormWithCountry = {
  title: 'Sample form (Country)',
  pages: [
    {
      name: 'page1',
      elements: [
        {
          type: 'country',
          name: 'country',
          title: 'Select your country',
        },
      ],
    },
  ],
} as const;

/** Form that uses hello-world and country – tests multiple extensions. */
export const sampleFormAllCustomQuestions = {
  title: 'Sample form (all custom)',
  pages: [
    {
      name: 'page1',
      elements: [
        { type: 'hello-world', name: 'hello', title: 'Hello World' },
        { type: 'country', name: 'country', title: 'Country' },
      ],
    },
  ],
} as const;

/** Form without custom types – no custom extensions load. */
export const sampleFormWithoutFile = {
  title: 'Sample form (text only)',
  pages: [
    {
      name: 'page1',
      elements: [
        { type: 'text', name: 'q1', title: 'Your name' },
      ],
    },
  ],
} as const;
