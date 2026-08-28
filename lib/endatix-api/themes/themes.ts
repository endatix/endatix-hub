import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import { appendDateRangeFilters, appendSortParams } from "../shared/list-query";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "../shared/paged-response";
import {
  appendPagingQueryParams,
  buildEndpointWithQuery,
} from "../shared/query-params";
import type {
  AuditDateFilters,
  IPagedRequest,
  PagedResponse,
  SortRequest,
} from "../shared/types";
import type {
  CreateThemeRequest,
  PartialUpdateThemeRequest,
  Theme,
  ThemeListSortBy,
} from "./types";

/**
 * `GET /themes` request: paging + sort + created/modified calendar bounds.
 * Composed from the shared `lib/endatix-api/shared` contracts - never hand-copy
 * `page` / `sortDir` / `createdFrom` onto a list request type.
 */
export type ThemesListRequest = IPagedRequest &
  SortRequest<ThemeListSortBy> &
  AuditDateFilters;

/** One page of themes, normalized for UI (adds `hasNextPage`, repairs metadata). */
export type ThemesPage = NormalizedPagedResponse<Theme>;

const THEMES_BASE = "/themes";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/** Page size used when draining every page for a picker. */
const LIST_ALL_PAGE_SIZE = 100;
/** Hard stop so a server that misreports `totalPages` cannot loop forever. */
const LIST_ALL_MAX_PAGES = 50;

/**
 * Builds the `GET /themes` endpoint. Exported as a pure function so the query
 * contract can be asserted in tests without an `EndatixApi` instance.
 */
export function buildListThemesEndpoint(
  request: ThemesListRequest = {},
): string {
  const searchParams = new URLSearchParams();
  appendPagingQueryParams(searchParams, request, {
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  appendSortParams(searchParams, request);
  appendDateRangeFilters(searchParams, request, ["created", "modified"]);

  return buildEndpointWithQuery(THEMES_BASE, searchParams);
}

export class Themes {
  constructor(private readonly endatix: EndatixApi) {}

  async create(body: CreateThemeRequest): Promise<ApiResult<Theme>> {
    return this.endatix.post<Theme>(THEMES_BASE, body);
  }

  /**
   * Lists one page of themes. The `Paged<>` envelope is preserved so callers can
   * render paging controls; use {@link listAll} only when every theme is needed.
   */
  async list(request: ThemesListRequest = {}): Promise<ApiResult<ThemesPage>> {
    const response = await this.endatix.get<PagedResponse<Theme>>(
      buildListThemesEndpoint(request),
    );
    if (!ApiResult.isSuccess(response)) {
      return response;
    }

    return ApiResult.success(normalizePagedResponse(response.data));
  }

  /**
   * Drains every page into a flat array. Themes feed the Creator Theme Editor
   * dropdown, which has no paging affordance - prefer {@link list} everywhere else.
   */
  async listAll(
    request: Omit<ThemesListRequest, "page"> = {},
  ): Promise<ApiResult<Theme[]>> {
    const pageSize = request.pageSize ?? LIST_ALL_PAGE_SIZE;
    const themes: Theme[] = [];
    let hasNextPage = false;

    for (let page = DEFAULT_PAGE; page <= LIST_ALL_MAX_PAGES; page++) {
      const result = await this.list({ ...request, page, pageSize });
      if (!ApiResult.isSuccess(result)) {
        return result;
      }

      themes.push(...result.data.items);
      hasNextPage = result.data.hasNextPage;
      if (!hasNextPage) {
        break;
      }
    }

    if (hasNextPage) {
      return ApiResult.serverError(
        `Could not load all themes (stopped after ${LIST_ALL_MAX_PAGES} pages)`,
      );
    }

    return ApiResult.success(themes);
  }

  async partialUpdate(
    themeId: string,
    body: PartialUpdateThemeRequest,
  ): Promise<ApiResult<Theme>> {
    const idResult = validateEndatixId(themeId, "themeId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }
    return this.endatix.patch<Theme>(`${THEMES_BASE}/${idResult.value}`, body);
  }

  async delete(themeId: string): Promise<ApiResult<void>> {
    const idResult = validateEndatixId(themeId, "themeId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }
    return this.endatix.delete<void>(`${THEMES_BASE}/${idResult.value}`);
  }
}
