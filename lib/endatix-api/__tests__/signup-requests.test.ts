import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EndatixApi } from '../endatix-api';
import { ApiResult } from '../shared/api-result';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('SignupRequests', () => {
  let api: EndatixApi;

  beforeEach(() => {
    process.env.ENDATIX_API_URL = 'https://ci.api.endatix.com/api';
    api = new EndatixApi('token');
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a signup request without auth', async () => {
    const publicApi = new EndatixApi();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Thanks' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await publicApi.signupRequests.create({
      email: 'prospect@example.com',
      companyName: 'Acme',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/signup-requests'),
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it('lists signup requests for platform admins', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          page: 1,
          pageSize: 20,
          totalPages: 1,
          totalRecords: 0,
          items: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await api.signupRequests.list({ status: 'pending' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/signup-requests?status=pending'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(ApiResult.isSuccess(result)).toBe(true);
  });
});
