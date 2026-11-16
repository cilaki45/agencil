const API_URL = 'https://script.google.com/macros/s/AKfycbysAMTC4DKtT90-koizvBg7_9jYCAg1TYmGtbnp_MaARZGKsW3-LYAQmMxc_P-KQx6Rtw/exec';

function agendaApp() {
  const baseState = {
    loading: true,
    agendaList: [],
    proyekList: {},
    users: {},
    selectedProjects: ['ALL'],
    udpFilterMode: '', // '' | 'h2' | 'h7' | 'h14' | 'all_udp'
    activeTab: 'kalender', // 'kalender' | 'pagu'
    paguStatusFilter: 'ALL', // 'ALL' | 'Menunggu Review PM' | 'ACC Final' | 'Revisi PM' | 'Ditolak'
    autoRefreshTimer: null,
    initialHtml: '',
    sidebarOpen: true,
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    openProjectSheet: false,
    projectSearch: '',
    sidebarProjectSearch: '',
    showUdpBreakdown: false,
    viewAgendaData: null,
    viewModal: false,
    openModal: false,
    openPinModalBox: false,
    openLoginModal: false,
    openPaguModal: false,
    openReviewUdpModal: false,
    confirmingDelete: false,
    submitting: false,
    submittingPin: false,
    submittingPagu: false,
    submittingReviewUdp: false,
    toast: { show: false, message: '', type: 'success' },
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    monthNames: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    form: { 
      id_agenda: '', 
      id_proyek: '', 
      nama_kegiatan: '', 
      tanggal: '', 
      durasi_hari: 1,
      jadwal_teks: '', 
      tim_jumlah_orang: 1,
      tim_jumlah_hari: 1,
      tim_durasi: '1 Orang, 1 Hari', 
      paket_peserta: '', 
      lokasi: '', 
      status: 'Fix',
      keterangan: '', 
      udp: 0,
      udp_display: '',
      file_udp_url: '',
      file_udp_name: '',
      udp_file_base64: '',
      udp_file_orig_name: '',
      udp_file_mime: '',
      udp_file_size_label: '',
      koordinator_input: '', 
      pin_input: '' 
    },
    paguForm: {
      id_proyek: '',
      nickname: '',
      koordinator: '',
      terpakai: 0,
      anggaran_kegiatan: 0,
      anggaran_display: ''
    },
    reviewUdpForm: {
      id_agenda: '',
      id_proyek: '',
      nickname: '',
      nama_kegiatan: '',
      tanggal_tampil: '',
      jadwal_teks: '',
      koordinator: '',
      file_udp_url: '',
      file_udp_name: '',
      udp_usulan: 0,
      udp_final: 0,
      udp_final_display: '',
      status_udp: 'ACC Final',
      catatan_pm: ''
    },
    pinForm: { koordinator_input: '', old_pin: '', new_pin: '', action: 'change_pin' },
    authKoordinator: sessionStorage.getItem('agencil_coord') || '',
    authPin: sessionStorage.getItem('agencil_pin') || '',
    loginForm: {
      koordinator: '',
      pin: ''
    },

    async checkAppUpdate(isBackground) {
      try {
        let htmlRes = await fetch(`index.html?t=${Date.now()}`);
        if (!htmlRes.ok) return;
        let latestHtml = await htmlRes.text();
        if (!isBackground) {
          this.initialHtml = latestHtml;
        } else if (this.initialHtml && latestHtml !== this.initialHtml) {
          window.location.reload();
        }
      } catch (e) {}
    },

    async initData(isBackground = false) {
      await this.checkAppUpdate(isBackground);
      try {
        let separator = API_URL.includes('?') ? '&' : '?';
        let authQuery = '';
        if (this.authKoordinator && this.authPin) {
          authQuery = `&coord=${encodeURIComponent(this.authKoordinator)}&pin=${encodeURIComponent(this.authPin)}`;
        }
        let res = await fetch(`${API_URL}${separator}t=${Date.now()}${authQuery}`);
        let data = await res.json();
        this.agendaList = data.agenda;
        this.proyekList = data.proyek;
        this.users = data.users || {};
        if (!isBackground && !this.autoRefreshTimer) {
          this.autoRefreshTimer = setInterval(() => {
            if (!this.openModal && !this.viewModal && !this.openPinModalBox && !this.openLoginModal && !this.openPaguModal && !this.openReviewUdpModal) {
              this.initData(true);
            }
          }, 30000);
        }
      } catch (err) {
        if (!isBackground) {
          this.showToast('Gagal memuat data dari API.', 'error');
        }
      } finally {
        this.loading = false;
      }
    }
  };

  const modules = window.AgendaModules || {};
  const mergedApp = {};
  [baseState, modules.ui, modules.auth, modules.calendar, modules.paguUdp].forEach(mod => {
    if (mod && typeof mod === 'object') {
      Object.defineProperties(mergedApp, Object.getOwnPropertyDescriptors(mod));
    }
  });

  return mergedApp;
}