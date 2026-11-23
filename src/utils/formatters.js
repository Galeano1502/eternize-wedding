export function formatPhone(value = '') {
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCurrency(value = 0) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBR(dateStr = '') {
  if (!dateStr) return 'Data a definir';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getCountdown(dateStr = '', timeStr = '16:00') {
  if (!dateStr) {
    return { isEmpty: true, isPast: false, days: '--', hours: '--', minutes: '--', seconds: '--' };
  }
  const target = new Date(`${dateStr}T${timeStr || '00:00'}:00`);
  if (Number.isNaN(target.getTime())) {
    return { isEmpty: true, isPast: false, days: '--', hours: '--', minutes: '--', seconds: '--' };
  }
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    return { isEmpty: false, isPast: true, days: '00', hours: '00', minutes: '00', seconds: '00' };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    isEmpty: false,
    isPast: false,
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}
