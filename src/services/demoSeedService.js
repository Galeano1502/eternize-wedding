import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  writeBatch,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_INVITE_TEMPLATE } from '../utils/inviteParser';

export const DEMO_WEDDING_ID = 'demo-bibi-nick';

function createDemoPhotoDataUrl(title, subtitle, bgHex = '#142B4D', accentHex = '#E6D5B8') {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 800, 600);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, 728, 528);

  ctx.lineWidth = 1;
  ctx.strokeRect(48, 48, 704, 504);

  ctx.fillStyle = accentHex;
  ctx.font = '600 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BIBI & NICK • ETERNIZE', 400, 175);

  ctx.beginPath();
  ctx.arc(384, 250, 26, 0, Math.PI * 2);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(416, 250, 26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText(title, 400, 345);

  ctx.fillStyle = accentHex;
  ctx.font = '18px sans-serif';
  ctx.fillText(subtitle, 400, 395);

  return canvas.toDataURL('image/jpeg', 0.82);
}

function createGiftSvgDataUrl(label, bgHex = '#EAE0D0', fgHex = '#0F2342') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
    <rect width="600" height="360" fill="${bgHex}"/>
    <rect x="24" y="24" width="552" height="312" rx="18" fill="none" stroke="${fgHex}" stroke-opacity="0.2" stroke-width="2"/>
    <circle cx="300" cy="145" r="38" fill="${fgHex}" fill-opacity="0.1"/>
    <path d="M284 145h32M300 129v32" stroke="${fgHex}" stroke-width="3" stroke-linecap="round"/>
    <text x="300" y="225" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="${fgHex}">${label}</text>
    <text x="300" y="255" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${fgHex}" fill-opacity="0.7">Lista de Presentes • Bibi &amp; Nick</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function seedDemoWeddingData(uid, { force = false } = {}) {
  if (!db || !uid) return DEMO_WEDDING_ID;

  const weddingRef = doc(db, 'weddings', DEMO_WEDDING_ID);
  const weddingSnap = await getDoc(weddingRef);

  if (weddingSnap.exists() && !force) {
    await updateDoc(weddingRef, {
      members: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, 'users', uid),
      { weddingId: DEMO_WEDDING_ID },
      { merge: true }
    );
    return DEMO_WEDDING_ID;
  }

  // Limpa subcoleções antigas se estiver criando ou restaurando o demo
  const subcollections = [
    'guests',
    'checklist',
    'budget',
    'vendors',
    'tables',
    'layoutItems',
    'gifts',
    'photos',
  ];

  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, 'weddings', DEMO_WEDDING_ID, sub));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  if (!weddingSnap.exists()) {
    await setDoc(weddingRef, {
      coupleNames: 'Bibi & Nick',
      weddingDate: '2027-06-19',
      weddingTime: '16:30',
      venue: 'Espaço Villa Jardim — Fazenda Santa Clara',
      inviteTemplate: DEFAULT_INVITE_TEMPLATE,
      inviteCode: 'BIBI27',
      ownerUid: uid,
      members: [uid],
      hallWidth: 20,
      hallLength: 14,
      hallShape: 'rect',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(weddingRef, {
      coupleNames: 'Bibi & Nick',
      weddingDate: '2027-06-19',
      weddingTime: '16:30',
      venue: 'Espaço Villa Jardim — Fazenda Santa Clara',
      inviteTemplate: DEFAULT_INVITE_TEMPLATE,
      inviteCode: 'BIBI27',
      members: arrayUnion(uid),
      hallWidth: 20,
      hallLength: 14,
      hallShape: 'rect',
      updatedAt: serverTimestamp(),
    });
  }

  await setDoc(
    doc(db, 'users', uid),
    { weddingId: DEMO_WEDDING_ID },
    { merge: true }
  );

  // Mesas
  const tablesCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'tables');
  const tableSeeds = [
    { name: 'Mesa 01 • Família Bibi', capacity: 8, shape: 'round', x: 4, y: 4, rotation: 0 },
    { name: 'Mesa 02 • Família Nick', capacity: 8, shape: 'round', x: 4, y: 9, rotation: 0 },
    { name: 'Mesa 03 • Padrinhos', capacity: 10, shape: 'rect', x: 10, y: 4, rotation: 0 },
    { name: 'Mesa 04 • Amigos', capacity: 8, shape: 'round', x: 10, y: 9, rotation: 0 },
  ];

  const createdTableIds = [];
  for (const t of tableSeeds) {
    const ref = await addDoc(tablesCol, { ...t, createdAt: serverTimestamp() });
    createdTableIds.push(ref.id);
  }

  // Convidados (PINs 1001 a 1008)
  const guestsCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'guests');
  const guestSeeds = [
    {
      name: 'Mariana Costa',
      phone: '(11) 98811-1001',
      email: 'mariana.costa@exemplo.com',
      group: 'Padrinhos',
      adults: 2,
      children: 0,
      rsvp: 'confirmado',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: createdTableIds[2],
      dietary: '',
      pin: '1001',
    },
    {
      name: 'Lucas Almeida',
      phone: '(11) 98811-1002',
      email: 'lucas.almeida@exemplo.com',
      group: 'Padrinhos',
      adults: 2,
      children: 1,
      rsvp: 'confirmado',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: createdTableIds[2],
      dietary: 'Cadeirinha para criança',
      pin: '1002',
    },
    {
      name: 'Família Silva (Carlos e Ana)',
      phone: '(11) 98811-1003',
      email: 'familia.silva@exemplo.com',
      group: 'Família Noiva',
      adults: 3,
      children: 1,
      rsvp: 'confirmado',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: createdTableIds[0],
      dietary: '1 vegetariano',
      pin: '1003',
    },
    {
      name: 'Beatriz Mendes',
      phone: '(11) 98811-1004',
      email: '',
      group: 'Amigos',
      adults: 2,
      children: 0,
      rsvp: 'confirmado',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: createdTableIds[3],
      dietary: 'Sem lactose',
      pin: '1004',
    },
    {
      name: 'Rafael & Camila Oliveira',
      phone: '(11) 98811-1005',
      email: 'rafael.oliveira@exemplo.com',
      group: 'Família Noivo',
      adults: 2,
      children: 0,
      rsvp: 'confirmado',
      inviteSent: true,
      inviteChannel: 'email',
      tableId: createdTableIds[1],
      dietary: '',
      pin: '1005',
    },
    {
      name: 'Pedro Henrique Rocha',
      phone: '(11) 98811-1006',
      email: '',
      group: 'Amigos',
      adults: 1,
      children: 0,
      rsvp: 'pendente',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: createdTableIds[3],
      dietary: '',
      pin: '1006',
    },
    {
      name: 'Juliana Martins',
      phone: '(11) 98811-1007',
      email: 'juliana.m@exemplo.com',
      group: 'Trabalho',
      adults: 2,
      children: 0,
      rsvp: 'pendente',
      inviteSent: false,
      inviteChannel: null,
      tableId: '',
      dietary: '',
      pin: '1007',
    },
    {
      name: 'Fernando & Helena Souza',
      phone: '(11) 98811-1008',
      email: '',
      group: 'Família Noivo',
      adults: 2,
      children: 0,
      rsvp: 'recusado',
      inviteSent: true,
      inviteChannel: 'whatsapp',
      tableId: '',
      dietary: '',
      pin: '1008',
    },
  ];

  const createdGuests = [];
  for (const g of guestSeeds) {
    const ref = await addDoc(guestsCol, { ...g, createdAt: serverTimestamp() });
    createdGuests.push({ id: ref.id, ...g });
  }

  // Checklist
  const checklistCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'checklist');
  const checklistSeeds = [
    { title: 'Definir orçamento geral e lista inicial', stage: '12+ meses antes', completed: true, dueDate: '2026-07-15' },
    { title: 'Reservar espaço da cerimônia e recepção', stage: '12+ meses antes', completed: true, dueDate: '2026-08-10' },
    { title: 'Contratar equipe de fotografia e filmagem', stage: '9 a 11 meses antes', completed: true, dueDate: '2026-09-20' },
    { title: 'Fechar buffet e degustação do cardápio', stage: '6 a 8 meses antes', completed: true, dueDate: '2026-11-30' },
    { title: 'Escolher decoração floral e paleta de cores', stage: '6 a 8 meses antes', completed: false, dueDate: '2027-01-15' },
    { title: 'Enviar convites com QR Code e PINs', stage: '3 a 5 meses antes', completed: false, dueDate: '2027-03-10' },
    { title: 'Definir mapa de mesas e restrições alimentares', stage: '1 a 2 meses antes', completed: false, dueDate: '2027-05-15' },
    { title: 'Reunião final de cronograma com cerimonialista', stage: 'Semana do casamento', completed: false, dueDate: '2027-06-12' },
  ];
  for (const item of checklistSeeds) {
    await addDoc(checklistCol, { ...item, createdAt: serverTimestamp() });
  }

  // Orçamento
  const budgetCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'budget');
  const budgetSeeds = [
    { category: 'Espaço & Buffet', description: 'Locação Espaço Villa Jardim + Coquetel e Jantar', estimated: 38000, closed: 36500, paid: 22000 },
    { category: 'Fotografia & Vídeo', description: 'Cobertura completa + Álbum impresso', estimated: 9500, closed: 9200, paid: 5000 },
    { category: 'Decoração & Flores', description: 'Cerimônia ao ar livre, altar e arranjos das mesas', estimated: 14000, closed: 13500, paid: 6750 },
    { category: 'Música & DJ', description: 'Quarteto cerimônia + DJ e iluminação pista', estimated: 7500, closed: 7200, paid: 3600 },
    { category: 'Vestido & Traje', description: 'Vestido da noiva e traje sob medida do noivo', estimated: 11000, closed: 10400, paid: 7000 },
    { category: 'Bolo & Doces', description: 'Bolo cenográfico + 800 doces finos', estimated: 4200, closed: 3900, paid: 1950 },
  ];
  for (const item of budgetSeeds) {
    await addDoc(budgetCol, { ...item, createdAt: serverTimestamp() });
  }

  // Fornecedores
  const vendorsCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'vendors');
  const vendorSeeds = [
    {
      name: 'Espaço Villa Jardim',
      category: 'Espaço & Buffet',
      phone: '(11) 99100-2001',
      instagram: '@espacovillajardim',
      status: 'Fechado',
      notes: 'Cerimônia no gramado às 16h30; plano B coberto incluso.',
    },
    {
      name: 'Atelier Luz & Memória',
      category: 'Fotografia & Vídeo',
      phone: '(11) 99100-2002',
      instagram: '@luzememoriafoto',
      status: 'Fechado',
      notes: '2 fotógrafos + 1 videomaker + drone.',
    },
    {
      name: 'Flora Botânica Eventos',
      category: 'Decoração',
      phone: '(11) 99100-2003',
      instagram: '@florabotanicaeventos',
      status: 'Fechado',
      notes: 'Paleta branco, verde oliva e azul marinho.',
    },
    {
      name: 'Som & Pista Produções',
      category: 'Música & DJ',
      phone: '(11) 99100-2004',
      instagram: '@somepistadj',
      status: 'Em negociação',
      notes: 'Confirmar pacote de pista de LED.',
    },
  ];
  for (const item of vendorSeeds) {
    await addDoc(vendorsCol, { ...item, createdAt: serverTimestamp() });
  }

  // Layout do Salão
  const layoutCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'layoutItems');
  const layoutSeeds = [
    { type: 'altar', label: 'Altar Cerimônia', x: 1, y: 5, width: 2.5, height: 4, rotation: 0 },
    { type: 'dancefloor', label: 'Pista de Dança', x: 14, y: 5, width: 4.5, height: 4.5, rotation: 0 },
    { type: 'cake', label: 'Mesa do Bolo & Doces', x: 15, y: 1.5, width: 3.5, height: 1.8, rotation: 0 },
    { type: 'bar', label: 'Bar de Drinks', x: 15, y: 11, width: 3.5, height: 1.8, rotation: 0 },
    { type: 'buffet', label: 'Ilha de Buffet', x: 7, y: 1.2, width: 5, height: 1.6, rotation: 0 },
  ];
  for (const item of layoutSeeds) {
    await addDoc(layoutCol, { ...item, createdAt: serverTimestamp() });
  }

  // Lista de Presentes
  const giftsCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'gifts');
  const giftSeeds = [
    {
      title: 'Cafeteira Espresso Automática',
      category: 'Cozinha',
      price: 1290,
      link: 'https://www.amazon.com.br',
      imageUrl: createGiftSvgDataUrl('Cafeteira Espresso'),
      status: 'disponivel',
      reservedBy: '',
      reservedByGuestId: '',
    },
    {
      title: 'Jogo de Panelas Inox 5 Peças',
      category: 'Cozinha',
      price: 890,
      link: 'https://www.amazon.com.br',
      imageUrl: createGiftSvgDataUrl('Jogo de Panelas Inox'),
      status: 'reservado',
      reservedBy: createdGuests[0].name,
      reservedByGuestId: createdGuests[0].id,
    },
    {
      title: 'Cota Lua de Mel • Jantar Romântico',
      category: 'Lua de Mel',
      price: 650,
      link: '',
      imageUrl: createGiftSvgDataUrl('Cota Lua de Mel'),
      status: 'disponivel',
      reservedBy: '',
      reservedByGuestId: '',
    },
    {
      title: 'Robô Aspirador Inteligente',
      category: 'Casa & Sala',
      price: 1650,
      link: 'https://www.mercadolivre.com.br',
      imageUrl: createGiftSvgDataUrl('Robô Aspirador'),
      status: 'reservado',
      reservedBy: createdGuests[1].name,
      reservedByGuestId: createdGuests[1].id,
    },
    {
      title: 'Jogo de Cama King 400 Fios',
      category: 'Quarto',
      price: 540,
      link: '',
      imageUrl: createGiftSvgDataUrl('Jogo de Cama King'),
      status: 'disponivel',
      reservedBy: '',
      reservedByGuestId: '',
    },
    {
      title: 'Adega Climatizada 12 Garrafas',
      category: 'Bar & Gourmet',
      price: 1150,
      link: '',
      imageUrl: createGiftSvgDataUrl('Adega Climatizada'),
      status: 'disponivel',
      reservedBy: '',
      reservedByGuestId: '',
    },
  ];
  for (const item of giftSeeds) {
    await addDoc(giftsCol, { ...item, createdAt: serverTimestamp() });
  }

  // Fotos dos Convidados
  const photosCol = collection(db, 'weddings', DEMO_WEDDING_ID, 'photos');
  const photoSeeds = [
    {
      guestName: 'Mariana Costa',
      caption: 'O sim mais lindo! Felicidades, Bibi & Nick!',
      imageData: createDemoPhotoDataUrl(
        'O Sim no Altar',
        'Cerimônia ao pôr do sol • Foto por Mariana Costa',
        '#0F2342',
        '#E6D5B8'
      ),
    },
    {
      guestName: 'Mariana Costa',
      caption: 'Brinde dos padrinhos antes da festa começar!',
      imageData: createDemoPhotoDataUrl(
        'Brinde dos Padrinhos',
        'Mesa 03 • Foto por Mariana Costa',
        '#1D3B66',
        '#F3EAD8'
      ),
    },
    {
      guestName: 'Lucas Almeida',
      caption: 'Pista de dança lotada com Bibi & Nick!',
      imageData: createDemoPhotoDataUrl(
        'Pista de Dança',
        'Abertura da pista • Foto por Lucas Almeida',
        '#142B4D',
        '#E6D5B8'
      ),
    },
    {
      guestName: 'Lucas Almeida',
      caption: 'Detalhes perfeitos da mesa do bolo.',
      imageData: createDemoPhotoDataUrl(
        'Mesa do Bolo & Doces',
        'Decoração Villa Jardim • Foto por Lucas Almeida',
        '#243E63',
        '#F3EAD8'
      ),
    },
    {
      guestName: 'Beatriz Mendes',
      caption: 'Noite inesquecível celebrando o amor de vocês!',
      imageData: createDemoPhotoDataUrl(
        'Noite Inesquecível',
        'Amigos da Noiva • Foto por Beatriz Mendes',
        '#091526',
        '#E6D5B8'
      ),
    },
  ];

  for (const p of photoSeeds) {
    await addDoc(photosCol, { ...p, createdAt: serverTimestamp() });
  }

  return DEMO_WEDDING_ID;
}