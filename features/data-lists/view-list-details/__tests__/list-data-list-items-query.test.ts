import { describe, expect, it } from 'vitest';
import {
  parseDataListItemsParams,
  resolveItemsIncludeLocales,
  resolveVisibleLabelColumns,
} from '../utils';

describe('parseDataListItemsParams', () => {
  it('maps Hub search to API query with default page size 25', () => {
    // Arrange & Act
    const parsed = parseDataListItemsParams({
      search: '  york ',
      page: '2',
    });

    // Assert
    expect(parsed).toEqual({
      page: 2,
      pageSize: 25,
      query: 'york',
      hasLocale: undefined,
    });
  });

  it('parses hasLocale filter', () => {
    // Arrange & Act
    const parsed = parseDataListItemsParams({
      hasLocale: ' ES, de ',
    });

    // Assert
    expect(parsed.hasLocale).toBe('es,de');
  });
});

describe('resolveItemsIncludeLocales', () => {
  it('uses full catalog when no hasLocale filter', () => {
    expect(
      resolveItemsIncludeLocales({
        availableLocales: ['en', 'de'],
      }),
    ).toEqual(['en', 'de']);
  });

  it('uses selected locales when hasLocale is set', () => {
    expect(
      resolveItemsIncludeLocales({
        hasLocale: 'es,fr',
        availableLocales: ['en', 'es', 'fr', 'de'],
      }),
    ).toEqual(['es', 'fr']);
  });
});

describe('resolveVisibleLabelColumns', () => {
  it('shows default and extras when no hasLocale filter', () => {
    expect(
      resolveVisibleLabelColumns({
        defaultLocale: 'en',
        availableLocales: ['de', 'es', 'fr'],
      }),
    ).toEqual(['default', 'de', 'es', 'fr']);
  });

  it('maps selected default culture to default column and hides others', () => {
    expect(
      resolveVisibleLabelColumns({
        hasLocale: 'de,es',
        defaultLocale: 'en',
        availableLocales: ['de', 'es', 'fr', 'it'],
      }),
    ).toEqual(['de', 'es']);
  });

  it('includes default column when default culture is selected', () => {
    expect(
      resolveVisibleLabelColumns({
        hasLocale: 'en,de',
        defaultLocale: 'en',
        availableLocales: ['de', 'es'],
      }),
    ).toEqual(['default', 'de']);
  });
});
