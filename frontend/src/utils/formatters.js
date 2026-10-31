export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString) {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRoleBadge(role) {
  switch (role) {
    case 'admin':
      return {
        label: 'Admin',
        variant: 'destructive',
        bg: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
      };
    case 'staff':
      return {
        label: 'Staff',
        variant: 'primary',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10',
      };
    case 'customer':
      return {
        label: 'Customer',
        variant: 'success',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
      };
    default:
      return {
        label: role || 'Unknown',
        variant: 'secondary',
        bg: 'bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10',
      };
  }
}

