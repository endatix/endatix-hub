import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import robots, { MAIN_ENDATIX_RULES, RESTRICTED_RULES } from '@/app/robots';
import { headers } from 'next/headers';
import { type ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

// Mock environment variables
const originalEnv = process.env;

// Create a mock factory function for ReadonlyHeaders
function createMockHeaders(hostValue: string): ReadonlyHeaders {
  // Create a basic implementation that satisfies the interface
  return {
    entries: () => [][Symbol.iterator](),
    forEach: () => {},
    get: (key: string) => key === 'host' ? hostValue : null,
    getAll: () => [],
    has: () => false,
    keys: () => [][Symbol.iterator](),
    values: () => [][Symbol.iterator](),
    [Symbol.iterator]: () => [][Symbol.iterator]()
  } as unknown as ReadonlyHeaders;
}

// Direct manual mock for headers
vi.mock('next/headers', () => ({
  headers: vi.fn()
}));

describe('Robots.ts rule sets', () => {
  it('should define proper rule sets', () => {
    // Main Endatix rule should allow /login
    expect(MAIN_ENDATIX_RULES[0].userAgent).toBe('*');
    expect(MAIN_ENDATIX_RULES[0].allow).toBe('/login');
    expect(MAIN_ENDATIX_RULES[0].disallow).toBe('/');
    
    // Restricted rule should fully disallow
    expect(RESTRICTED_RULES[0].userAgent).toBe('*');
    expect(RESTRICTED_RULES[0].disallow).toBe('/');
    // Check that 'allow' property doesn't exist on restricted rules
    expect('allow' in RESTRICTED_RULES[0]).toBe(false);
  });
});

describe('Robots.ts metadata route', () => {
  beforeEach(() => {
    // Reset modules and mocks
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should allow /login for app.endatix.com host when explicitly listed', async () => {
    // Arrange
    vi.mocked(headers).mockReturnValue(
      Promise.resolve(createMockHeaders('app.endatix.com'))
    );
    process.env.ROBOTS_ALLOWED_DOMAINS = 'app.endatix.com,portal.endatix.com';
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(MAIN_ENDATIX_RULES);
  });

  it('should NOT allow /login for a subdomain that is not explicitly listed', async () => {
    // Arrange
    vi.mocked(headers).mockReturnValue(
      Promise.resolve(createMockHeaders('ci.hub.endatix.com'))
    );
    process.env.ROBOTS_ALLOWED_DOMAINS = 'app.endatix.com';
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(RESTRICTED_RULES);
  });

  it('should allow /login for a subdomain when explicitly listed', async () => {
    // Arrange
    vi.mocked(headers).mockReturnValue(
      Promise.resolve(createMockHeaders('test.endatix.com'))
    );
    process.env.ROBOTS_ALLOWED_DOMAINS = 'test.endatix.com,endatix.com';
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(MAIN_ENDATIX_RULES);
  });

  it('should fully disallow for non-endatix domains', async () => {
    // Arrange
    vi.mocked(headers).mockReturnValue(
      Promise.resolve(createMockHeaders('forms.homegrownstorage.com'))
    );
    process.env.ROBOTS_ALLOWED_DOMAINS = 'app.endatix.com';
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(RESTRICTED_RULES);
  });
  
  it('should use default of app.endatix.com if no env variable is set', async () => {
    // Arrange
    vi.mocked(headers).mockReturnValue(
      Promise.resolve(createMockHeaders('app.endatix.com'))
    );
    delete process.env.ROBOTS_ALLOWED_DOMAINS;
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(MAIN_ENDATIX_RULES);
  });

  it('should handle errors by returning restricted rules', async () => {
    // Arrange
    vi.mocked(headers).mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    // Act
    const result = await robots();
    
    // Assert
    expect(result.rules).toEqual(RESTRICTED_RULES);
  });
}); 