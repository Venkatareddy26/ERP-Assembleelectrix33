import { useEffect } from 'react';

// A pointer choice may leave a native select looking permanently focused.
// Keep keyboard focus visible; release focus only after a mobile pointer choice.
export function useMobileSelectFocus() {
  useEffect(() => {
    let pointerChoice = false;
    const pointer = () => { pointerChoice = true; };
    const keyboard = () => { pointerChoice = false; };
    const changed = (event: Event) => {
      if (pointerChoice && event.target instanceof HTMLSelectElement && matchMedia('(max-width: 639.98px)').matches) event.target.blur();
      pointerChoice = false;
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('change', changed);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('change', changed);
    };
  }, []);
}
