import { describe, expect, it } from 'vitest';
import { parseErrorResponse, parseProblemDetails } from '../problem-details';

describe('parseErrorResponse', () => {
  it('returns null for an empty error body without throwing', async () => {
    // Arrange
    const response = new Response('', { status: 404 });

    // Act
    const result = await parseErrorResponse(response);

    // Assert
    expect(result).toBeNull();
  });

  it('parses RFC7807-style JSON bodies', async () => {
    // Arrange
    const body = JSON.stringify({
      type: 'https://example.com/problems/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'Resource was not found.',
      errorCode: 'resource_not_found',
    });
    const response = new Response(body, { status: 404 });

    // Act
    const result = await parseErrorResponse(response);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.errorCode).toBe('resource_not_found');
    expect(result?.detail).toBe('Resource was not found.');
  });
});

describe('parseProblemDetails', () => {
  it('returns null for invalid payloads', () => {
    // Arrange
    const data = { foo: 'bar' };

    // Act
    const result = parseProblemDetails(data);

    // Assert
    expect(result).toBeNull();
  });
});

describe('parseProblemDetails existingId', () => {
  it('reads the submission a submission_exists 409 names', () => {
    // Arrange
    const data = {
      status: 409,
      detail: 'A submission already exists for this user and form.',
      errorCode: 'submission_exists',
      submissionId: '1526934587983265792',
    };

    // Act
    const result = parseProblemDetails(data);

    // Assert
    expect(result?.existingId).toBe('1526934587983265792');
  });

  it('leaves existingId out for other error codes', () => {
    // Arrange
    const data = { status: 409, errorCode: 'conflict', submissionId: '1' };

    // Act
    const result = parseProblemDetails(data);

    // Assert
    expect(result?.existingId).toBeUndefined();
  });
});
