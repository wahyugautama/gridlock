import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

export const Motion = ({ children, tile = false }: { readonly children: ReactNode; readonly tile?: boolean }) => {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !ref.current?.animate) return;
    const animation = ref.current.animate([
      { opacity: 0, transform: tile ? 'scale(0.88)' : 'translateY(6px)' },
      { opacity: 1, transform: tile ? 'scale(1)' : 'translateY(0)' },
    ], { duration: tile ? 160 : 220, easing: 'ease-out' });
    return () => animation.cancel();
  }, [reduced, tile]);
  if (tile) return <span ref={element => { ref.current = element; }} className="pointer-events-none inline-block">{children}</span>;
  return <div ref={element => { ref.current = element; }} className="min-w-0">{children}</div>;
};
