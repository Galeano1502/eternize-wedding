import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { resolveUserWeddingId, EMPTY_WEDDING_DATA } from '../services/weddingService';

export function useWedding(uid) {
  const [weddingId, setWeddingId] = useState(null);
  const [wedding, setWedding] = useState(EMPTY_WEDDING_DATA);
  const [loading, setLoading] = useState(true);

  const syncWeddingId = useCallback(async () => {
    if (!db || !uid) {
      setWeddingId(null);
      setLoading(false);
      return;
    }
    try {
      const resolvedId = await resolveUserWeddingId(uid);
      setWeddingId(resolvedId);
    } catch (err) {
      console.error('Erro ao carregar casamento:', err);
      setWeddingId(uid);
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    syncWeddingId();
  }, [syncWeddingId]);

  useEffect(() => {
    if (!db || !weddingId) return;
    const ref = doc(db, 'weddings', weddingId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setWedding({ ...EMPTY_WEDDING_DATA, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [weddingId]);

  return { wedding, weddingId, setWeddingId, loading };
}