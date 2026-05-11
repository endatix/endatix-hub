import { describe, expect, it } from 'vitest';
import {
  urlSlugFromDisplayName,
  isReservedUrlSlug,
  isValidUrlSlugFormat,
  MAX_URL_SLUG_LENGTH,
  normalizeUrlSlug,
} from '../url-slug';

describe('folder-slug (aligned with OSS UrlSlugNormalizer)', () => {
  it('normalizes display names like OSS FromDisplayName', () => {
    expect(normalizeUrlSlug('Hello World')).toBe('hello-world');
    expect(normalizeUrlSlug('  Mixed_case.Names ')).toBe('mixed-case-names');
  });

  it('rejects leading or trailing hyphens in format check', () => {
    expect(isValidUrlSlugFormat('ab')).toBe(true);
    expect(isValidUrlSlugFormat('-a')).toBe(false);
  });

  it('detects reserved slugs case-insensitively', () => {
    expect(isReservedUrlSlug('templates')).toBe(true);
    expect(isReservedUrlSlug('Templates')).toBe(true);
    expect(isReservedUrlSlug('custom')).toBe(false);
  });

  it('aliases folderSlugFromDisplayName to normalize', () => {
    expect(urlSlugFromDisplayName('Acme Surveys')).toBe(
      normalizeUrlSlug('Acme Surveys'),
    );
  });

  it('documents max length parity with server', () => {
    expect(MAX_URL_SLUG_LENGTH).toBe(128);
  });
});
