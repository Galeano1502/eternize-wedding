import { formatDateBR } from './formatters';

export const DEFAULT_INVITE_TEMPLATE =
  'Olá {convidado}! Com muita alegria convidamos você para celebrar o casamento de {casal}, no dia {data} às {hora}, em {local}. Por favor, confirme sua presença!';

export function parseInviteMessage(template, guest, wedding) {
  const source = template && template.trim() ? template : DEFAULT_INVITE_TEMPLATE;
  const couple = wedding?.coupleNames?.trim() || 'Nosso Casamento';
  const date = formatDateBR(wedding?.weddingDate);
  const time = wedding?.weddingTime?.trim() || 'horário a confirmar';
  const venue = wedding?.venue?.trim() || 'local a confirmar';
  const guestName = guest?.name?.trim() || 'Convidado(a)';

  return source
    .replace(/\{convidado\}/gi, guestName)
    .replace(/\{casal\}/gi, couple)
    .replace(/\{data\}/gi, date)
    .replace(/\{hora\}/gi, time)
    .replace(/\{local\}/gi, venue);
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
