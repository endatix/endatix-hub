import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorPage } from '@/components/error-handling/error-page';
import { NotFoundComponent } from '@/components/error-handling/not-found';

describe('ErrorPage', () => {
  it('renders status watermark, title, and sheep chrome', () => {
    // Arrange & Act
    render(
      <ErrorPage
        statusCode="500"
        title="Something went wrong."
        subtitle="An unexpected error interrupted this page."
        message="Try again."
      />,
    );

    // Assert
    expect(screen.getAllByText('500').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Something went wrong.',
    );
    expect(document.querySelector('.sheep')).not.toBeNull();
  });
});

describe('NotFoundComponent', () => {
  it('renders via shared ErrorPage chrome', () => {
    // Arrange & Act
    render(
      <NotFoundComponent
        notFoundTitle="404"
        notFoundSubtitle="This page could not be found."
        notFoundMessage="Check the URL."
      />,
    );

    // Assert
    expect(screen.getAllByText('404').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'This page could not be found.',
    );
    expect(document.querySelector('.sheep')).not.toBeNull();
  });
});
