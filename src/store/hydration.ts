import { useEffect, useState } from 'react';

import { useCustomCardsStore } from './customCardsStore';
import { useGameStore } from './gameStore';
import { useHiddenCardsStore } from './hiddenCardsStore';
import { useSettingsStore } from './settingsStore';

function allHydrated(): boolean {
  return (
    useSettingsStore.persist.hasHydrated() &&
    useGameStore.persist.hasHydrated() &&
    useCustomCardsStore.persist.hasHydrated() &&
    useHiddenCardsStore.persist.hasHydrated()
  );
}

/** True once every persisted store has been restored from the device storage. */
export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);

  useEffect(() => {
    const check = () => setHydrated(allHydrated());
    const unsubscribeSettings = useSettingsStore.persist.onFinishHydration(check);
    const unsubscribeGame = useGameStore.persist.onFinishHydration(check);
    const unsubscribeCustom = useCustomCardsStore.persist.onFinishHydration(check);
    const unsubscribeHidden = useHiddenCardsStore.persist.onFinishHydration(check);
    check();
    return () => {
      unsubscribeSettings();
      unsubscribeGame();
      unsubscribeCustom();
      unsubscribeHidden();
    };
  }, []);

  return hydrated;
}
