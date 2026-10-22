// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../engine/game', async importOriginal => {
  const actual = await importOriginal<typeof import('../engine/game')>();
  return { ...actual, restartRun: (seed: number) => ({ ...actual.restartRun(seed), queue: Array.from({ length: 9 }, () => ({ value: 1 as const })) }) };
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('supports arrow keys, placement, occupied-cell rejection, and board boundary navigation', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  const board = screen.getByRole('group', { name: 'Game board' });
  const cells = within(board).getAllByRole('button');
  cells[0].focus();
  await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');
  expect(cells[6]).toHaveFocus();
  expect(cells[6]).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('list', { name: 'Remaining tiles in placement order' }).children).toHaveLength(8);
  await user.keyboard('{Enter} ');
  expect(screen.getByRole('list', { name: 'Remaining tiles in placement order' }).children).toHaveLength(8);
  await user.keyboard('{Control>}{Home}{/Control}{ArrowLeft}{ArrowUp}');
  expect(cells[0]).toHaveFocus();
  await user.keyboard('{Control>}{End}{/Control}{ArrowRight}{ArrowDown}');
  expect(cells[24]).toHaveFocus();
});

it('accepts touch-style placement once and announces exact scores under reduced motion', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  const cells = within(screen.getByRole('group', { name: 'Game board' })).getAllByRole('button');
  await user.pointer([{ keys: '[TouchA>]', target: cells[0] }, { keys: '[/TouchA]' }]);
  expect(cells[0]).toHaveAttribute('aria-disabled', 'true');
  await user.click(cells[1]);
  await user.click(cells[2]);
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '30');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '40 of 30 points');
  const line = screen.getByRole('button', { name: /Three of a kind/, pressed: false });
  await user.click(line);
  expect(cells[0]).toHaveAttribute('data-selected', 'true');
  expect(cells[2]).toHaveAttribute('data-selected', 'true');
});

it('handles batched Continue, duplicate buys, and restart without double rewards or lost shop', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /^Play$/ }));
  const cells = within(screen.getByRole('group', { name: 'Game board' })).getAllByRole('button');
  for (const index of [2, 7, 10, 11, 12, 13, 14, 17, 22]) await user.click(cells[index]);
  expect(screen.getByRole('heading', { name: 'Round Clear' })).toHaveFocus();
  const visit = screen.getByRole('button', { name: 'Visit Shop' });
  act(() => { fireEvent.click(visit); fireEvent.click(visit); });
  expect(screen.getByRole('heading', { name: 'Modifier shop' })).toHaveFocus();
  const buy = screen.getAllByRole('button', { name: /^Buy / })[0];
  const price = Number(buy.getAttribute('aria-label')!.match(/for (\d+) Credits/)![1]);
  await user.dblClick(buy);
  expect(buy).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText(`${15 - price} Credits · 1 active modifiers`)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Continue to Next Round' }));
  expect(screen.getByRole('heading', { name: /Round 2\s*\/\s*8/ })).toHaveFocus();
  expect(screen.getByRole('list', { name: 'Remaining tiles in placement order' }).children).toHaveLength(9);
  await user.click(screen.getByRole('button', { name: /New Run/ }));
  await user.click(screen.getByRole('button', { name: 'Restart Run' }));
  expect(screen.getByText('0 Credits · 0 active modifiers')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Round 1\s*\/\s*8/ })).toHaveFocus();
});
