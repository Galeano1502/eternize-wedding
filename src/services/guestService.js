import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export function generateGuestPin(existingPins = new Set()) {
  for (let i = 0; i < 50; i++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!existingPins.has(candidate)) return candidate;
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function addGuest(uid, guestData, existingPins = new Set()) {
  const colRef = collection(db, 'weddings', uid, 'guests');
  const pin = guestData.pin || generateGuestPin(existingPins);

  const docRef = await addDoc(colRef, {
    name: guestData.name || '',
    phone: guestData.phone || '',
    email: guestData.email || '',
    group: guestData.group || 'Amigos',
    adults: Number(guestData.adults) || 1,
    children: Number(guestData.children) || 0,
    rsvp: guestData.rsvp || 'pendente',
    inviteSent: Boolean(guestData.inviteSent),
    inviteChannel: guestData.inviteChannel || null,
    inviteSentAt: guestData.inviteSent ? serverTimestamp() : null,
    tableId: guestData.tableId || null,
    dietary: guestData.dietary || '',
    pin,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateGuest(uid, guestId, updates) {
  const ref = doc(db, 'weddings', uid, 'guests', guestId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGuest(uid, guestId) {
  const ref = doc(db, 'weddings', uid, 'guests', guestId);
  await deleteDoc(ref);
}

export async function markInviteSent(uid, guestId, channel) {
  const ref = doc(db, 'weddings', uid, 'guests', guestId);
  await updateDoc(ref, {
    inviteSent: true,
    inviteChannel: channel,
    inviteSentAt: serverTimestamp(),
  });
}

export async function bulkUpdateGuests(uid, guestIds, updates) {
  if (!guestIds.length) return;
  const batch = writeBatch(db);
  guestIds.forEach((id) => {
    const ref = doc(db, 'weddings', uid, 'guests', id);
    batch.update(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function bulkDeleteGuests(uid, guestIds) {
  if (!guestIds.length) return;
  const batch = writeBatch(db);
  guestIds.forEach((id) => {
    const ref = doc(db, 'weddings', uid, 'guests', id);
    batch.delete(ref);
  });
  await batch.commit();
}

export async function bulkImportGuests(uid, rows, existingPins = new Set()) {
  if (!rows.length) return;
  const usedPins = new Set(existingPins);
  const batch = writeBatch(db);
  const colRef = collection(db, 'weddings', uid, 'guests');

  rows.forEach((row) => {
    const pin = generateGuestPin(usedPins);
    usedPins.add(pin);
    const newDoc = doc(colRef);
    batch.set(newDoc, {
      name: row.name,
      phone: row.phone || '',
      email: row.email || '',
      group: row.group || 'Amigos',
      adults: Number(row.adults) || 1,
      children: Number(row.children) || 0,
      rsvp: 'pendente',
      inviteSent: false,
      inviteChannel: null,
      inviteSentAt: null,
      tableId: null,
      dietary: row.dietary || '',
      pin,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export function exportGuestsCSV(guests, tablesMap = {}) {
  const headers = [
    'Nome',
    'PIN de Acesso',
    'Celular/WhatsApp',
    'E-mail',
    'Grupo',
    'Adultos',
    'Crianças',
    'Total Pessoas',
    'RSVP',
    'Convite Enviado',
    'Canal Envio',
    'Mesa',
    'Restrição Alimentar',
  ];

  const escapeCsv = (val) => {
    const str = String(val ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(';'),
    ...guests.map((g) => {
      const total = (Number(g.adults) || 0) + (Number(g.children) || 0);
      return [
        g.name,
        g.pin || '-',
        g.phone,
        g.email,
        g.group,
        g.adults ?? 1,
        g.children ?? 0,
        total,
        g.rsvp,
        g.inviteSent ? 'Sim' : 'Não',
        g.inviteChannel || '-',
        g.tableId ? tablesMap[g.tableId] || 'Atribuída' : 'Sem mesa',
        g.dietary || '',
      ]
        .map(escapeCsv)
        .join(';');
    }),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `convidados-eternize-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}