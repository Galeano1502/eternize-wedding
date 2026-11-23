import { formatDateBR } from './formatters';

export const DEFAULT_INVITE_TEMPLATE = `Olá, {convidado}! 💍✨

Com muita alegria, convidamos você para celebrar o casamento de {casal}!

📅 Data: {data}
⏰ Horário: {hora}
📍 Local: {local}

Confirme sua presença e veja nossa lista de presentes pelo link:
{link}
🔑 Seu PIN de acesso: {pin}

Esperamos por você!`;

export function buildGuestPortalUrl(weddingId, pin = '') {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://eternize.vercel.app';
  const base = `${origin}/?convite=${encodeURIComponent(weddingId || '')}`;
  return pin ? `${base}&pin=${encodeURIComponent(pin)}` : base;
}

export function parseInviteMessage(template, guest, wedding, weddingId = '') {
  const source = template && template.trim() ? template : DEFAULT_INVITE_TEMPLATE;
  const couple = wedding?.coupleNames?.trim() || 'Nosso Casamento';
  const date = formatDateBR(wedding?.weddingDate);
  const time = wedding?.weddingTime?.trim() || 'horário a confirmar';
  const venue = wedding?.venue?.trim() || 'local a confirmar';
  const guestName = guest?.name?.trim() || 'Convidado(a)';
  const pin = guest?.pin || '0000';
  const link = buildGuestPortalUrl(weddingId, guest?.pin || '');

  return source
    .replace(/\{convidado\}/gi, guestName)
    .replace(/\{casal\}/gi, couple)
    .replace(/\{data\}/gi, date)
    .replace(/\{hora\}/gi, time)
    .replace(/\{local\}/gi, venue)
    .replace(/\{pin\}/gi, pin)
    .replace(/\{link\}/gi, link);
}

export function buildWhatsAppUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(email, coupleNames, message) {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) return null;
  const subject = `Convite de Casamento — ${coupleNames || 'Eternize'}`;
  return `mailto:${cleanEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export function buildSmsUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `sms:${digits}?body=${encodeURIComponent(message)}`;
}