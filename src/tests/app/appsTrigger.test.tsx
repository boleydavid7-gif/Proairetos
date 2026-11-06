// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AllAppsTrigger } from '../../components/layout/AppsTab';

/*
 * Managing the dock is for the computer's side rail only (from 62rem). On phones and tablets Apps is the plain grid of the
 * added apps, as it was before the dock could be managed.
 */
function screenWidth(desktop: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 62rem') ? desktop : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  localStorage.clear();
  // jsdom has no modal dialogs; the sheet only needs to be in the page.
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Apps on a phone or tablet', () => {
  it('is the original all-apps button and grid: no Manage dock, no pinning', () => {
    screenWidth(false);
    render(<AllAppsTrigger />);
    const button = screen.getByRole('button', { name: 'Apps' });
    expect(button.getAttribute('title')).toBe('All apps');
    expect(button.textContent).toBe('All apps');
    expect(screen.queryByText('Manage dock')).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { hidden: true, name: 'Your apps' })).toBeTruthy();
    expect(screen.getByText('All apps', { selector: 'p' })).toBeTruthy();
    expect(screen.queryByText('Manage dock')).toBeNull();
    expect(screen.queryByText('Add to dock')).toBeNull();
    expect(screen.queryByText('Remove from dock')).toBeNull();
    expect(screen.getByText('Store')).toBeTruthy();
  });
});

describe('Manage dock on a computer', () => {
  it('is on the rail with its own label, and the sheet lets each app be added to or removed from the dock', () => {
    screenWidth(true);
    render(<AllAppsTrigger desktopOnly />);
    const button = screen.getByRole('button', { name: 'Manage dock' });
    expect(button.getAttribute('title')).toBe('Manage dock');
    expect(button.className).toContain('tab-bar__desktop-only');
    expect(screen.queryByRole('button', { name: 'Apps' })).toBeNull();
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { hidden: true, name: 'Manage dock' })).toBeTruthy();
    expect(screen.getByText('Manage dock', { selector: 'p' })).toBeTruthy();
  });
});
