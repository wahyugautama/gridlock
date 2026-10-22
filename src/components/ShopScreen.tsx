import { useEffect, useRef, useState } from 'react';
import { canPurchaseOffer } from '../engine/shop';
import { Motion } from './Motion';
import type { GameState } from '../types/game';

interface Props {
  readonly state: GameState;
  readonly onBuy: (offerId: string) => void;
  readonly onContinue: () => void;
}

export const ShopScreen = ({ state, onBuy, onContinue }: Props) => {
  const [notice, setNotice] = useState('');
  const handlePurchase = (offerId: string) => {
    if (!canPurchaseOffer(state, offerId)) return;
    const offer = state.shopOffers.find(candidate => candidate.id === offerId)!;
    onBuy(offerId);
    setNotice(`${offer.modifier.name} acquired. ${offer.cost} Credits spent. Active for the rest of this run.`);
  };
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section aria-labelledby="shop-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-amber-200">Between rounds</p><h2 ref={heading} tabIndex={-1} id="shop-title" className="text-3xl font-semibold outline-none">Modifier shop</h2></div>
        <p role="status" aria-live="polite" className="text-sm text-amber-200"><strong className="text-3xl tabular-nums">{state.credits}</strong> Credits available</p>
      </div>
      <p className="mb-6 text-xs leading-6 text-stone-400">Upgrades last for this run. Each modifier can be owned once. Spend your Credits or save them for the next shop.</p>
      {state.shopOffers.length === 0 && <p className="rounded-lg border border-white/10 p-6 text-sm text-stone-400">You own every modifier. Continue to the next round.</p>}
      <div role="status" aria-live="polite" aria-atomic="true" className="mb-4 min-h-12 text-xs leading-5 text-amber-200">{notice ? <Motion key={notice}><span aria-hidden="true">✓ </span>{notice}</Motion> : <span className="text-stone-400">Choose an upgrade. Purchases take effect immediately.</span>}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        {state.shopOffers.map(offer => <article key={offer.id} data-purchased={offer.purchased} className="flex min-w-0 flex-col rounded-sm border border-white/10 bg-white/[0.025] p-4 transition-colors data-[purchased=true]:border-amber-200/40 data-[purchased=true]:bg-amber-200/5 motion-reduce:transition-none sm:p-5">
          <h3 className="text-base font-semibold">{offer.modifier.name}</h3>
          <p className="mt-3 flex-1 text-xs leading-6 text-stone-400">{offer.modifier.description}</p>
          <p className="mt-5 text-sm text-amber-200">{offer.cost} Credits</p>
          <button type="button" onClick={() => handlePurchase(offer.id)} aria-disabled={!canPurchaseOffer(state, offer.id)} aria-label={`${offer.purchased ? 'Purchased' : 'Buy'} ${offer.modifier.name} for ${offer.cost} Credits`} className="mt-4 rounded border border-amber-200/40 px-3 py-3 text-xs text-amber-200 transition-colors aria-[disabled=false]:hover:bg-amber-200/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 aria-disabled:cursor-not-allowed aria-disabled:border-white/10 aria-disabled:text-stone-400 motion-reduce:transition-none">{offer.purchased ? '✓ Purchased' : canPurchaseOffer(state, offer.id) ? 'Buy' : 'Not enough Credits'}</button>
        </article>)}
      </div>
      <button type="button" onClick={onContinue} className="mt-6 w-full rounded-md bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200 motion-reduce:transition-none">Continue to Next Round</button>
    </section>
  );
};
