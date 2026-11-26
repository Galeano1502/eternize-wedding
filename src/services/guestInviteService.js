import { signInAnonymously, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export async function findGuestByPin({ pin, weddingCode }) {
  if (!db || !auth) {
    throw new Error('Firebase não configurado.');
  }

  const cleanPin = String(pin || '').trim();
  const cleanCode = String(weddingCode || '').trim().toUpperCase();

  if (!cleanPin) {
    throw new Error('Informe o PIN do convite.');
  }

  let createdAnonSession = false;
  if (!auth.currentUser) {
    await signInAnonymously(auth);
    createdAnonSession = true;
  }

  try {
    let targetWeddingDoc = null;

    if (cleanCode) {
      const byCodeQ = query(
        collection(db, 'weddings'),
        where('inviteCode', '==', cleanCode)
      );
      const byCodeSnap = await getDocs(byCodeQ);
      if (!byCodeSnap.empty) {
        targetWeddingDoc = byCodeSnap.docs[0];
      } else {
        const directRef = doc(db, 'weddings', weddingCode.trim());
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          targetWeddingDoc = directSnap;
        }
      }

      if (!targetWeddingDoc) {
        throw new Error('Código do casal não encontrado.');
      }

      const guestsQ = query(
        collection(db, 'weddings', targetWeddingDoc.id, 'guests'),
        where('pin', '==', cleanPin)
      );
      const guestsSnap = await getDocs(guestsQ);

      if (guestsSnap.empty) {
        throw new Error('PIN não encontrado para este casamento.');
      }

      const guestDoc = guestsSnap.docs[0];
      return {
        weddingId: targetWeddingDoc.id,
        weddingData: { id: targetWeddingDoc.id, ...targetWeddingDoc.data() },
        guestData: { id: guestDoc.id, ...guestDoc.data() },
      };
    }

    const weddingsSnap = await getDocs(collection(db, 'weddings'));
    for (const wDoc of weddingsSnap.docs) {
      const guestsQ = query(
        collection(db, 'weddings', wDoc.id, 'guests'),
        where('pin', '==', cleanPin)
      );
      const guestsSnap = await getDocs(guestsQ);
      if (!guestsSnap.empty) {
        const guestDoc = guestsSnap.docs[0];
        return {
          weddingId: wDoc.id,
          weddingData: { id: wDoc.id, ...wDoc.data() },
          guestData: { id: guestDoc.id, ...guestDoc.data() },
        };
      }
    }

    throw new Error('PIN inválido ou não cadastrado.');
  } catch (err) {
    if (createdAnonSession && auth.currentUser?.isAnonymous) {
      await signOut(auth).catch(() => {});
    }
    throw err;
  }
}