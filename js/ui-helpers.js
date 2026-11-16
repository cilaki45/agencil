window.AgendaModules = window.AgendaModules || {};

window.AgendaModules.ui = {
  formatRupiah(angka) {
    let num = Number(angka) || 0;
    const prefix = num < 0 ? '-Rp ' : 'Rp ';
    return prefix + Math.abs(num).toLocaleString('id-ID');
  },

  formatRibuan(angka) {
    let num = parseInt(String(angka || '0').replace(/[^0-9]/g, ''), 10) || 0;
    return num > 0 ? num.toLocaleString('id-ID') : '';
  },

  showToast(message, type = 'success') {
    this.toast = { show: true, message: message, type: type };
    setTimeout(() => { this.toast.show = false; }, 4000);
  },

  getUdpStatusBadgeClass(status) {
    const map = {
      'ACC Final': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'Revisi PM': 'bg-blue-50 text-blue-800 border-blue-200',
      'Ditolak': 'bg-rose-50 text-rose-800 border-rose-200',
      'Menunggu Review PM': 'bg-amber-50 text-amber-800 border-amber-200'
    };
    return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  },

  getBadgeBgClass(warna) {
    const map = { 
      blue: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100', 
      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100', 
      amber: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100', 
      purple: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100', 
      rose: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100', 
      cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100', 
      indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100', 
      teal: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
      red: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
      orange: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
      yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      lime: 'bg-lime-50 text-lime-800 border-lime-200 hover:bg-lime-100',
      green: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
      sky: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
      violet: 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100',
      fuchsia: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100',
      pink: 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100'
    };
    return map[warna] || 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100';
  },

  getBadgeDotClass(warna) {
    const map = { 
      blue: 'bg-blue-600', 
      emerald: 'bg-emerald-600', 
      amber: 'bg-amber-600', 
      purple: 'bg-purple-600', 
      rose: 'bg-rose-600', 
      cyan: 'bg-cyan-600', 
      indigo: 'bg-indigo-600', 
      teal: 'bg-teal-600',
      red: 'bg-red-600',
      orange: 'bg-orange-600',
      yellow: 'bg-yellow-600',
      lime: 'bg-lime-600',
      green: 'bg-green-600',
      sky: 'bg-sky-600',
      violet: 'bg-violet-600',
      fuchsia: 'bg-fuchsia-600',
      pink: 'bg-pink-600'
    };
    return map[warna] || 'bg-slate-500';
  },

  getSidebarCheckboxUncheckedClass(warna) {
    const map = {
      blue: 'bg-slate-900/70 border-blue-500/70 group-hover:border-blue-400',
      emerald: 'bg-slate-900/70 border-emerald-500/70 group-hover:border-emerald-400',
      amber: 'bg-slate-900/70 border-amber-500/70 group-hover:border-amber-400',
      purple: 'bg-slate-900/70 border-purple-500/70 group-hover:border-purple-400',
      rose: 'bg-slate-900/70 border-rose-500/70 group-hover:border-rose-400',
      cyan: 'bg-slate-900/70 border-cyan-500/70 group-hover:border-cyan-400',
      indigo: 'bg-slate-900/70 border-indigo-500/70 group-hover:border-indigo-400',
      teal: 'bg-slate-900/70 border-teal-500/70 group-hover:border-teal-400',
      red: 'bg-slate-900/70 border-red-500/70 group-hover:border-red-400',
      orange: 'bg-slate-900/70 border-orange-500/70 group-hover:border-orange-400',
      yellow: 'bg-slate-900/70 border-yellow-500/70 group-hover:border-yellow-400',
      lime: 'bg-slate-900/70 border-lime-500/70 group-hover:border-lime-400',
      green: 'bg-slate-900/70 border-green-500/70 group-hover:border-green-400',
      sky: 'bg-slate-900/70 border-sky-500/70 group-hover:border-sky-400',
      violet: 'bg-slate-900/70 border-violet-500/70 group-hover:border-violet-400',
      fuchsia: 'bg-slate-900/70 border-fuchsia-500/70 group-hover:border-fuchsia-400',
      pink: 'bg-slate-900/70 border-pink-500/70 group-hover:border-pink-400'
    };
    return map[warna] || 'bg-slate-900/70 border-slate-500/70 group-hover:border-slate-400';
  },

  getSidebarCheckboxCheckedClass(warna) {
    const map = {
      blue: 'bg-blue-600 border-blue-500 shadow-xs shadow-blue-600/40',
      emerald: 'bg-emerald-600 border-emerald-500 shadow-xs shadow-emerald-600/40',
      amber: 'bg-amber-600 border-amber-500 shadow-xs shadow-amber-600/40',
      purple: 'bg-purple-600 border-purple-500 shadow-xs shadow-purple-600/40',
      rose: 'bg-rose-600 border-rose-500 shadow-xs shadow-rose-600/40',
      cyan: 'bg-cyan-600 border-cyan-500 shadow-xs shadow-cyan-600/40',
      indigo: 'bg-indigo-600 border-indigo-500 shadow-xs shadow-indigo-600/40',
      teal: 'bg-teal-600 border-teal-500 shadow-xs shadow-teal-600/40',
      red: 'bg-red-600 border-red-500 shadow-xs shadow-red-600/40',
      orange: 'bg-orange-600 border-orange-500 shadow-xs shadow-orange-600/40',
      yellow: 'bg-yellow-600 border-yellow-500 shadow-xs shadow-yellow-600/40',
      lime: 'bg-lime-600 border-lime-500 shadow-xs shadow-lime-600/40',
      green: 'bg-green-600 border-green-500 shadow-xs shadow-green-600/40',
      sky: 'bg-sky-600 border-sky-500 shadow-xs shadow-sky-600/40',
      violet: 'bg-violet-600 border-violet-500 shadow-xs shadow-violet-600/40',
      fuchsia: 'bg-fuchsia-600 border-fuchsia-500 shadow-xs shadow-fuchsia-600/40',
      pink: 'bg-pink-600 border-pink-500 shadow-xs shadow-pink-600/40'
    };
    return map[warna] || 'bg-slate-600 border-slate-500 shadow-xs';
  },

  getMobileCheckboxUncheckedClass(warna) {
    const map = {
      blue: 'bg-white border-blue-500/80',
      emerald: 'bg-white border-emerald-500/80',
      amber: 'bg-white border-amber-500/80',
      purple: 'bg-white border-purple-500/80',
      rose: 'bg-white border-rose-500/80',
      cyan: 'bg-white border-cyan-500/80',
      indigo: 'bg-white border-indigo-500/80',
      teal: 'bg-white border-teal-500/80',
      red: 'bg-white border-red-500/80',
      orange: 'bg-white border-orange-500/80',
      yellow: 'bg-white border-yellow-500/80',
      lime: 'bg-white border-lime-500/80',
      green: 'bg-white border-green-500/80',
      sky: 'bg-white border-sky-500/80',
      violet: 'bg-white border-violet-500/80',
      fuchsia: 'bg-white border-fuchsia-500/80',
      pink: 'bg-white border-pink-500/80'
    };
    return map[warna] || 'bg-white border-slate-400';
  },

  getMobileCheckboxCheckedClass(warna) {
    const map = {
      blue: 'bg-blue-600 border-blue-500 text-white shadow-xs',
      emerald: 'bg-emerald-600 border-emerald-500 text-white shadow-xs',
      amber: 'bg-amber-600 border-amber-500 text-white shadow-xs',
      purple: 'bg-purple-600 border-purple-500 text-white shadow-xs',
      rose: 'bg-rose-600 border-rose-500 text-white shadow-xs',
      cyan: 'bg-cyan-600 border-cyan-500 text-white shadow-xs',
      indigo: 'bg-indigo-600 border-indigo-500 text-white shadow-xs',
      teal: 'bg-teal-600 border-teal-500 text-white shadow-xs',
      red: 'bg-red-600 border-red-500 text-white shadow-xs',
      orange: 'bg-orange-600 border-orange-500 text-white shadow-xs',
      yellow: 'bg-yellow-600 border-yellow-500 text-white shadow-xs',
      lime: 'bg-lime-600 border-lime-500 text-white shadow-xs',
      green: 'bg-green-600 border-green-500 text-white shadow-xs',
      sky: 'bg-sky-600 border-sky-500 text-white shadow-xs',
      violet: 'bg-violet-600 border-violet-500 text-white shadow-xs',
      fuchsia: 'bg-fuchsia-600 border-fuchsia-500 text-white shadow-xs',
      pink: 'bg-pink-600 border-pink-500 text-white shadow-xs'
    };
    return map[warna] || 'bg-blue-600 border-blue-500 text-white shadow-xs';
  }
};