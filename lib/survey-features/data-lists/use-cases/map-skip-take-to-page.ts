import { DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE } from "../constants";

export function mapSkipTakeToPage(
  skip: number,
  take: number,
): { page: number; pageSize: number } {
  const pageSize = take > 0 ? take : DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
  const safeSkip = skip > 0 ? skip : 0;
  const page = Math.floor(safeSkip / pageSize) + 1;
  return { page, pageSize };
}
