import { useEffect, useRef, type KeyboardEvent } from 'react';

export const ConfirmReset = ({ clear, onConfirm, onCancel }: { readonly clear: boolean; readonly onConfirm: () => void; readonly onCancel: () => void }) => {
  const cancel = useRef<HTMLButtonElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
    if (event.key === 'Tab') {
      event.preventDefault();
      (document.activeElement === cancel.current ? confirm : cancel).current?.focus();
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5" onKeyDown={handleKey}>
    <section role="dialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-description" className="w-full max-w-sm border border-white/20 bg-[#202020] p-6">
      <h2 id="reset-title" className="text-xl font-semibold">{clear ? 'Clear save and reset?' : 'Restart this run?'}</h2>
      <p id="reset-description" className="mt-3 text-sm leading-6 text-stone-300">Your board, Credits, modifiers, and run statistics will be lost. This cannot be undone.</p>
      <div className="mt-6 flex gap-3">
        <button ref={cancel} type="button" onClick={onCancel} className="min-h-11 flex-1 border border-white/20 px-3 focus-visible:outline-2 focus-visible:outline-amber-200">Cancel</button>
        <button ref={confirm} type="button" onClick={onConfirm} className="min-h-11 flex-1 bg-amber-200 px-3 font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">{clear ? 'Clear Save' : 'Restart Run'}</button>
      </div>
    </section>
  </div>;
};
