// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from '../../app/ErrorBoundary';
import AppShell from '../../app/AppShell';
import { useRoutes } from '../../app/family/shell';

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
});

function Broken(): never {
  throw new Error('boom');
}

describe('when a screen breaks', () => {
  it('shows a calm page with a way forward instead of a blank window', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toMatch(/safe on this device/);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Save a copy/ })).toBeTruthy();
  });

  it('shows the page when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>All well</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('All well')).toBeTruthy();
  });
});

describe('main navigation', () => {
  it('has a named button for every page, marks the current one, and navigates', () => {
    const onNavigate = vi.fn();
    render(<AppShell route="plan" onNavigate={onNavigate} />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const buttons = nav.querySelectorAll('button');
    // Four pages and Apps, which opens the added apps; Compass and Meditate open from Reflect.
    expect(buttons).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Compass' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Apps' }).getAttribute('aria-haspopup')).toBe('dialog');
    for (const button of buttons) expect((button.textContent ?? '').trim().length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Days ahead' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Reflect' }));
    expect(onNavigate).toHaveBeenCalledWith('reflect');
  });

  it('keeps Reflect marked while Compass is open', () => {
    render(<AppShell route="compass" onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reflect' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('family app history', () => {
  function RouteProbe() {
    const { route, nav } = useRoutes('history-test', ['home', 'detail'], () => ({ name: 'home' }), { name: 'home' });
    return (
      <>
        <output aria-label="route">{route.name}</output>
        <button type="button" onClick={() => nav.go({ name: 'detail' })}>Open detail</button>
        <button type="button" onClick={nav.back}>Back</button>
      </>
    );
  }

  it('keeps an in-app back action on the previous route', () => {
    render(<RouteProbe />);
    fireEvent.click(screen.getByRole('button', { name: 'Open detail' }));
    expect(screen.getByLabelText('route').textContent).toBe('detail');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('route').textContent).toBe('home');
    expect((history.state as { 'history-test'?: { name: string } } | null)?.['history-test']?.name).toBe('home');
  });

  it('handles the browser back gesture without leaving the app route stack', async () => {
    render(<RouteProbe />);
    fireEvent.click(screen.getByRole('button', { name: 'Open detail' }));
    history.back();
    await waitFor(() => expect(screen.getByLabelText('route').textContent).toBe('home'));
  });
});
