import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export function useCollection(uid, subcollectionName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid || !subcollectionName) {
      setLoading(false);
      return;
    }
    const colRef = collection(db, 'weddings', uid, subcollectionName);
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [uid, subcollectionName]);

  const addItem = async (data) => {
    const colRef = collection(db, 'weddings', uid, subcollectionName);
    await addDoc(colRef, { ...data, createdAt: serverTimestamp() });
  };

  const updateItem = async (id, data) => {
    const ref = doc(db, 'weddings', uid, subcollectionName, id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  };

  const deleteItem = async (id) => {
    const ref = doc(db, 'weddings', uid, subcollectionName, id);
    await deleteDoc(ref);
  };

  return { items, loading, addItem, updateItem, deleteItem };
}
