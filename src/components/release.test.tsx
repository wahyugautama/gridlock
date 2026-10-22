// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { SAVE_KEY } from '../storage/local-save';
import { parseSave } from '../engine/save';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('starts on the menu, explains rules, resumes a saved board, and confirms reset', async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  expect(screen.queryByRole('group', { name: 'Game board' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'How to Play' }));
  expect(screen.getByRole('heading', { name: 'How to Play' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  await user.click(within(screen.getByRole('group', { name: 'Game board' })).getAllByRole('button')[0]);
  const saved = localStorage.getItem(SAVE_KEY);
  expect(parseSave(saved).state?.placements).toBe(1);
  view.unmount();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /Resume Run/ }));
  expect(within(screen.getByRole('group', { name: 'Game board' })).getAllByRole('button')[0]).toHaveAttribute('aria-disabled', 'true');
  await user.click(screen.getByRole('button', { name: /New Run/ }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(parseSave(localStorage.getItem(SAVE_KEY))).toEqual(parseSave(saved));
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  await user.click(screen.getByRole('button', { name: 'Clear Save / Reset' }));
  await user.click(screen.getByRole('button', { name: /^Clear Save$/ }));
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  expect(screen.queryByRole('button', { name: /Resume Run/ })).not.toBeInTheDocument();
});

it.each(['{broken', JSON.stringify({ version: 999, ruleset: 'future', state: {} })])('handles unusable saves without silently replacing them', async raw => {
  const user = userEvent.setup();
  localStorage.setItem(SAVE_KEY, raw);
  render(<App />);
  expect(screen.queryByRole('button', { name: /Resume Run/ })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(/invalid|incompatible/);
  expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  expect(parseSave(localStorage.getItem(SAVE_KEY)).status).toBe('ready');
});

it('continues playing when saving is blocked', async () => {
  const user = userEvent.setup();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
  render(<App />);
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  expect(screen.getByText(/Could not save progress/)).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Game board' })).toBeInTheDocument();
});

it('reports blocked storage reads and failed deletion instead of claiming success', async () => {
  const user = userEvent.setup();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Browser storage is unavailable');
  await user.click(screen.getByRole('button', { name: 'Clear Save / Reset' }));
  await user.click(screen.getByRole('button', { name: /^Clear Save$/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Could not remove the save');
});
