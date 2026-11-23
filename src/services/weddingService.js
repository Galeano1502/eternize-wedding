import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_INVITE_TEMPLATE } from '../utils/inviteParser';

export const EMPTY_WEDDING_DATA = {
  coupleNames: '',
  weddingDate: '',
  weddingTime: '',
  venue: '',
  inviteTemplate: DEFAULT_INVITE_TEMPLATE,
  inviteCode: '',
  members: [],
};

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function resolveUserWeddingId(uid) {
  if (!db || !uid) return null;

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().weddingId) {
    return userSnap.data().weddingId;
  }

  const weddingRef = doc(db, 'weddings', uid);
  const weddingSnap = await getDoc(weddingRef);

  if (!weddingSnap.exists()) {
    await setDoc(weddingRef, {
      ...EMPTY_WEDDING_DATA,
      ownerUid: uid,
      members: [uid],
      inviteCode: generateInviteCode(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const existing = weddingSnap.data();
    await setDoc(
      weddingRef,
      {
        ownerUid: existing.ownerUid || uid,
        members: arrayUnion(uid),
        inviteCode: existing.inviteCode || generateInviteCode(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await setDoc(userRef, { weddingId: uid }, { merge: true });
  return uid;
}

export async function joinWeddingByCode(uid, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) throw new Error('Informe o código do casal.');

  const q = query(collection(db, 'weddings'), where('inviteCode', '==', code));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Código não encontrado. Verifique com seu parceiro(a).');
  }

  const targetWedding = snap.docs[0];

  await updateDoc(targetWedding.ref, {
    members: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'users', uid),
    { weddingId: targetWedding.id },
    { merge: true }
  );

  return targetWedding.id;
}

export async function updateWeddingInfo(weddingId, data) {
  if (!db || !weddingId) return;
  const ref = doc(db, 'weddings', weddingId);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function clearAllWeddingData(weddingId) {
  if (!db || !weddingId) return;
  const subcollections = ['guests', 'checklist', 'budget', 'vendors', 'tables'];

  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'weddings', weddingId, sub));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await updateDoc(doc(db, 'weddings', weddingId), {
    coupleNames: '',
    weddingDate: '',
    weddingTime: '',
    venue: '',
    inviteTemplate: DEFAULT_INVITE_TEMPLATE,
    updatedAt: serverTimestamp(),
  });
}

export function downloadJsonBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `eternize-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}