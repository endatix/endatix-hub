import { expect, test } from '@playwright/test';

/**
 * Lightweight parity checks for storage HTTP routes (no live blob credentials required).
 * Full upload + private image flows are covered in Vitest and manual QA per `STORAGE_PROVIDER`.
 */
test.describe('Storage provider smoke', () => {
  test('read-urls rejects missing formId', async ({ request }) => {
    const res = await request.post('/api/public/v0/storage/read-urls', {
      data: { urls: ['https://example.test/file'] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('read-urls rejects an empty url list', async ({ request }) => {
    const res = await request.post('/api/public/v0/storage/read-urls', {
      data: { formId: 'f1', urls: [] },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });

  test('upload-urls rejects missing file names', async ({ request }) => {
    const res = await request.post('/api/public/v0/storage/upload-urls', {
      data: {
        formId: 'f1',
        fileNames: [],
        formLocale: 'en',
        submissionId: 's1',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
  });
});
