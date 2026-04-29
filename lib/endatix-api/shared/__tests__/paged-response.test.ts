import { describe, expect, it } from 'vitest';
import {
  normalizePagedItemsResponse,
  PagedItemsEnvelope,
  NormalizedPagedResponse,
} from '../paged-response';

describe('normalizePagedItemsResponse', () => {
  it('normalizes string page and pageSize to numbers', () => {
    const response: PagedItemsEnvelope<string> = {
      page: '2',
      pageSize: '10',
      totalRecords: '50',
      totalPages: '5',
      items: ['a', 'b'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalRecords).toBe(50);
    expect(result.totalPages).toBe(5);
    expect(result.items).toEqual(['a', 'b']);
    expect(result.hasNextPage).toBe(true);
  });

  it('handles number inputs directly', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 5,
      pageSize: 20,
      totalRecords: 100,
      totalPages: 5,
      items: ['x'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(5);
    expect(result.pageSize).toBe(20);
    expect(result.totalRecords).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasNextPage).toBe(false);
  });

  it('falls back to defaults for undefined values', () => {
    const response: PagedItemsEnvelope<string> = {
      page: undefined,
      pageSize: undefined,
      items: ['a', 'b', 'c'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(3);
    expect(result.totalRecords).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('calculates totalPages when not provided', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 2,
      pageSize: 10,
      totalRecords: 35,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.totalPages).toBe(4);
    expect(result.hasNextPage).toBe(true);
  });

  it('handles zero totalRecords by using items length', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.totalRecords).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.hasNextPage).toBe(false);
  });

  it('handles invalid string numbers with fallback', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 'invalid' as unknown as string | number,
      pageSize: 'NaN' as unknown as string | number,
      totalRecords: 'Infinity' as unknown as string | number,
      items: ['a'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalRecords).toBe(1);
  });

  it('handles Infinity values with fallback', () => {
    const response: PagedItemsEnvelope<string> = {
      page: Infinity,
      pageSize: Infinity,
      totalRecords: Infinity,
      totalPages: Infinity,
      items: ['a'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalRecords).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('calculates hasNextPage correctly', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 25,
      totalPages: 3,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.hasNextPage).toBe(true);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it('returns items from response', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 1,
      pageSize: 10,
      items: ['a', 'b', 'c'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.items).toEqual(['a', 'b', 'c']);
  });

  it('enforces minimum page of 1', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 0,
      pageSize: 10,
      totalRecords: 100,
      totalPages: 10,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.page).toBe(1);
  });

  it('enforces minimum pageSize of 1', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 1,
      pageSize: 0,
      totalRecords: 100,
      totalPages: 10,
      items: ['a'],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.pageSize).toBe(1);
  });

  it('enforces minimum totalPages of 1', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 1,
      pageSize: 10,
      totalRecords: 0,
      totalPages: 0,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.totalPages).toBe(1);
  });

  it('handles last page correctly', () => {
    const response: PagedItemsEnvelope<string> = {
      page: 5,
      pageSize: 10,
      totalRecords: 50,
      totalPages: 5,
      items: [],
    };

    const result = normalizePagedItemsResponse(response);

    expect(result.hasNextPage).toBe(false);
    expect(result.page).toBe(5);
    expect(result.totalPages).toBe(5);
  });
});