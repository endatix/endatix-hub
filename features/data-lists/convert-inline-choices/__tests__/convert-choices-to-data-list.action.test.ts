import { beforeEach, describe, expect, it, vi } from 'vitest';
import { convertChoicesToDataListAction } from '../convert-choices-to-data-list.action';
import { Result } from '@/lib/result';

const mockCreate = vi.fn();
const mockReplace = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/features/data-lists/create-list/create-data-list.action', () => ({
  createDataListAction: (...args: unknown[]) => mockCreate(...args),
}));

vi.mock('@/features/data-lists/replace-items/replace-data-list-items.action', () => ({
  replaceDataListItemsAction: (...args: unknown[]) => mockReplace(...args),
}));

vi.mock('@/features/data-lists/delete-list/delete-data-list.action', () => ({
  deleteDataListAction: (...args: unknown[]) => mockDelete(...args),
}));

describe('convertChoicesToDataListAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when create fails', async () => {
    mockCreate.mockResolvedValue(Result.error('create failed'));

    const result = await convertChoicesToDataListAction({
      name: 'List',
      items: [{ label: 'A', value: 'a' }],
    });

    expect(Result.isError(result)).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('returns error when replace fails', async () => {
    mockCreate.mockResolvedValue(
      Result.success({
        id: 'dl-1',
        name: 'List',
        isActive: true,
        createdAt: new Date(),
        itemsCount: 0,
        items: [],
      }),
    );
    mockReplace.mockResolvedValue(Result.error('replace failed'));
    mockDelete.mockResolvedValue(Result.success('dl-1'));

    const result = await convertChoicesToDataListAction({
      name: 'List',
      items: [{ label: 'A', value: 'a' }],
    });

    expect(Result.isError(result)).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('dl-1');
  });

  it('returns data list when create and replace succeed', async () => {
    const details = {
      id: 'dl-1',
      name: 'List',
      isActive: true,
      createdAt: new Date(),
      itemsCount: 1,
      items: [{ id: 'i1', label: 'A', value: 'a' }],
    };
    mockCreate.mockResolvedValue(Result.success(details));
    mockReplace.mockResolvedValue(Result.success(details));

    const result = await convertChoicesToDataListAction({
      name: 'List',
      items: [{ label: 'A', value: 'a' }],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.dataList.id).toBe('dl-1');
    }
    expect(mockReplace).toHaveBeenCalledWith('dl-1', [
      { label: 'A', value: 'a' },
    ]);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
