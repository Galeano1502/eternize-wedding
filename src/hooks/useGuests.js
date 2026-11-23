import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useGuests(uid) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'weddings', uid, 'guests'),
      orderBy('name', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGuests(list);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  const stats = useMemo(() => {
    let totalAdults = 0;
    let totalChildren = 0;
    let confirmedPeople = 0;
    let confirmedAdults = 0;
    let confirmedChildren = 0;
    let pendingPeople = 0;
    let declinedPeople = 0;
    let invitesSent = 0;
    let withTable = 0;
    let withDietary = 0;

    guests.forEach((g) => {
      const adults = Number(g.adults) || 0;
      const children = Number(g.children) || 0;
      const people = adults + children;

      totalAdults += adults;
      totalChildren += children;

      if (g.rsvp === 'confirmado') {
        confirmedPeople += people;
        confirmedAdults += adults;
        confirmedChildren += children;
      } else if (g.rsvp === 'recusado') {
        declinedPeople += people;
      } else {
        pendingPeople += people;
      }

      if (g.inviteSent) invitesSent += 1;
      if (g.tableId) withTable += 1;
      if (g.dietary && g.dietary.trim()) withDietary += 1;
    });

    const totalPeople = totalAdults + totalChildren;
    const totalInvites = guests.length;
    const invitesPending = totalInvites - invitesSent;

    return {
      totalPeople,
      totalAdults,
      totalChildren,
      totalInvites,
      confirmedPeople,
      confirmedAdults,
      confirmedChildren,
      pendingPeople,
      declinedPeople,
      invitesSent,
      invitesPending,
      withTable,
      withDietary,
    };
  }, [guests]);

  return { guests, stats, loading };
}
