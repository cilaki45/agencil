const API_URL = 'https://script.google.com/macros/s/AKfycbysAMTC4DKtT90-koizvBg7_9jYCAg1TYmGtbnp_MaARZGKsW3-LYAQmMxc_P-KQx6Rtw/exec';

function agendaApp() {
  return {
    loading: true,
    agendaList: [],
    proyekList: {},
    users: {},
    selectedProject: 'ALL',
    
    // State Sidebar Collapse / Expand
    sidebarOpen: true,
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    
    openProjectSheet: false,
    projectSearch: '',
    
    viewAgendaData: null,
    viewModal: false,
    openModal: false,
    openPinModalBox: false,
    openLoginModal: false,
    
    confirmingDelete: false,
    submitting: false,
    submittingPin: false,
    
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
      tim_jumlah_orang: '',
      tim_jumlah_hari: '',
      tim_durasi: '', 
      paket_peserta: '', 
      lokasi: '', 
      keterangan: 'Fix', 
      koordinator_input: '', 
      pin_input: '' 
    },
    
    pinForm: { koordinator_input: '', old_pin: '', new_pin: '', action: 'change_pin' },

    // Sesi Login Koordinator
    authKoordinator: sessionStorage.getItem('agencil_coord') || '',
    authPin: sessionStorage.getItem('agencil_pin') || '',
    loginForm: {
      koordinator: '',
      pin: ''
    },

    get uniqueCoordinators() {
      if (this.users && Object.keys(this.users).length > 0) {
        return Object.keys(this.users).sort();
      }
      const coords = Object.values(this.proyekList).map(p => p.koordinator).filter(Boolean);
      return [...new Set(coords)].sort();
    },

    loginSession() {
      if (!this.loginForm.koordinator || !this.loginForm.pin) {
        this.showToast('Pilih koordinator dan masukkan PIN terlebih dahulu!', 'error');
        return;
      }
      this.authKoordinator = this.loginForm.koordinator;
      this.authPin = this.loginForm.pin;
      sessionStorage.setItem('agencil_coord', this.authKoordinator);
      sessionStorage.setItem('agencil_pin', this.authPin);
      this.loginForm.pin = '';
      this.openLoginModal = false;
      this.showToast(`Berhasil masuk sesi sebagai ${this.authKoordinator}`, 'success');
    },

    logoutSession() {
      this.authKoordinator = '';
      this.authPin = '';
      sessionStorage.removeItem('agencil_coord');
      sessionStorage.removeItem('agencil_pin');
      this.showToast('Sesi login koordinator diakhiri.', 'success');
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message: message, type: type };
      setTimeout(() => { this.toast.show = false; }, 4000);
    },

    // Otomatisasi generate format teks jadwal (Rentang Hari seragam)
    generateJadwalTeks() {
      if (!this.form.tanggal) return;
      let parts = this.form.tanggal.split('-');
      if (parts.length !== 3) return;
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let day = parseInt(parts[2], 10);
      
      let startDate = new Date(year, month, day);
      let durasi = parseInt(this.form.durasi_hari, 10) || 1;
      
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      let startDay = startDate.getDate();
      let startMonthName = months[startDate.getMonth()];
      
      if (durasi <= 1) {
        this.form.jadwal_teks = `${startDay} ${startMonthName} ${startDate.getFullYear()}`;
      } else {
        let endDate = new Date(year, month, day + durasi - 1);
        let endDay = endDate.getDate();
        let endMonthName = months[endDate.getMonth()];
        
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          this.form.jadwal_teks = `${startDay}-${endDay} ${endMonthName} ${endDate.getFullYear()}`;
        } else {
          this.form.jadwal_teks = `${startDay} ${startMonthName} - ${endDay} ${endMonthName} ${endDate.getFullYear()}`;
        }
      }
    },

    // Helper format tanggal seragam untuk kartu kalender
    formatAgendaDate(item) {
      // 1. Jika di sheet kolom jadwal_teks ada isinya, mutlak pakai itu!
      if (item.jadwal_teks && item.jadwal_teks.trim() !== '' && !item.jadwal_teks.includes('T17:00:00')) {
        return item.jadwal_teks;
      }
      
      // 2. Jika kosong atau kebawa format timestamp ISO, fallback ke tanggal pelaksanaan
      if (!item.tanggal) return '-';
      
      let cleanDate = String(item.tanggal).split('T')[0];
      let parts = cleanDate.split('-');
      if (parts.length !== 3) return cleanDate;
      
      let year = parts[0];
      let monthIdx = parseInt(parts[1], 10) - 1;
      let day = parseInt(parts[2], 10);
      
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return `${day} ${months[monthIdx]} ${year}`;
    },

    get selectedProjectInfo() {
      if (this.selectedProject === 'ALL' || !this.proyekList[this.selectedProject]) {
        return { nickname: 'Semua Proyek', warna: 'blue', count: this.agendaList.length };
      }
      const proj = this.proyekList[this.selectedProject];
      return { nickname: proj.nickname, warna: proj.warna, count: this.getProjectCount(this.selectedProject) };
    },

    get filteredMobileProjects() {
      if (!this.projectSearch.trim()) return this.proyekList;
      const keyword = this.projectSearch.trim().toLowerCase();
      const filtered = {};
      Object.keys(this.proyekList).forEach(id => {
        const proj = this.proyekList[id];
        if ((proj.nickname && proj.nickname.toLowerCase().includes(keyword)) || (proj.koordinator && proj.koordinator.toLowerCase().includes(keyword))) {
          filtered[id] = proj;
        }
      });
      return filtered;
    },

    getProjectCount(idProyek) {
      return this.agendaList.filter(item => item.id_proyek === idProyek).length;
    },

    selectMobileProject(id) {
      this.selectedProject = id;
      this.projectSearch = '';
      this.openProjectSheet = false;
    },
    
    get filteredAgenda() {
      if (this.selectedProject === 'ALL') return this.agendaList;
      return this.agendaList.filter(item => item.id_proyek === this.selectedProject);
    },

    get filteredProyekOptions() {
      let activeCoord = this.authKoordinator;
      if (!activeCoord) return {};
      let keyword = activeCoord.trim().toLowerCase();
      let filtered = {};
      Object.keys(this.proyekList).forEach(id => {
        if (this.proyekList[id].koordinator && this.proyekList[id].koordinator.toLowerCase() === keyword) {
          filtered[id] = this.proyekList[id];
        }
      });
      return filtered;
    },

    get calendarGrid() {
      const year = this.currentYear;
      const month = this.currentMonth;
      const firstDayIndex = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const prevTotalDays = new Date(year, month, 0).getDate();
      
      let days = [];
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        let d = prevTotalDays - i;
        let dateStr = `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ dayNum: d, dateStr: dateStr, isCurrentMonth: false, agendas: [] });
      }
      for (let i = 1; i <= totalDays; i++) {
        let dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let matchedAgendas = this.filteredAgenda.filter(item => item.tanggal === dateStr);
        days.push({ dayNum: i, dateStr: dateStr, isCurrentMonth: true, agendas: matchedAgendas });
      }
      let remainingCells = 7 - (days.length % 7);
      if (remainingCells < 7 && remainingCells > 0) {
        for (let i = 1; i <= remainingCells; i++) {
          let dateStr = `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          days.push({ dayNum: i, dateStr: dateStr, isCurrentMonth: false, agendas: [] });
        }
      }
      return days;
    },

    viewAgenda(item) {
      this.viewAgendaData = item;
      this.viewModal = true;
    },

    openModalFromView() {
      this.viewModal = false;
      this.editAgenda(this.viewAgendaData);
    },

    openAddModal() {
      this.form = { 
        id_agenda: '', 
        id_proyek: '', 
        nama_kegiatan: '', 
        tanggal: '', 
        durasi_hari: 1,
        jadwal_teks: '', 
        tim_jumlah_orang: '',
        tim_jumlah_hari: '',
        tim_durasi: '', 
        paket_peserta: '', 
        lokasi: '', 
        keterangan: 'Fix', 
        koordinator_input: this.authKoordinator, 
        pin_input: this.authPin 
      };
      this.confirmingDelete = false;
      this.openModal = true;
    },

    openPinModal() {
      this.pinForm = { koordinator_input: this.authKoordinator, old_pin: '', new_pin: '', action: 'change_pin' };
      this.openPinModalBox = true;
    },

    editAgenda(item) {
      this.form = { 
        ...item, 
        durasi_hari: 1,
        tim_jumlah_orang: '',
        tim_jumlah_hari: '',
        koordinator_input: this.authKoordinator, 
        pin_input: this.authPin 
      };
      this.confirmingDelete = false;
      this.openModal = true;
    },

    prevMonth() { if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; } else { this.currentMonth--; } },
    nextMonth() { if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; } else { this.currentMonth++; } },
    goToToday() { let now = new Date(); this.currentYear = now.getFullYear(); this.currentMonth = now.getMonth(); },
    isToday(dateStr) {
      let today = new Date();
      return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    },

    async initData() {
      try {
        let res = await fetch(API_URL);
        let data = await res.json();
        this.agendaList = data.agenda;
        this.proyekList = data.proyek;
        this.users = data.users || {};
      } catch (err) { this.showToast('Gagal memuat data dari API.', 'error'); } finally { this.loading = false; }
    },

    async submitForm() {
      if (!this.form.koordinator_input && this.authKoordinator) {
        this.form.koordinator_input = this.authKoordinator;
      }
      if (!this.form.pin_input && this.authPin) {
        this.form.pin_input = this.authPin;
      }

      this.submitting = true;
      try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(this.form) });
        let result = await res.json();
        if(result.status === 'sukses') {
          if (this.form.koordinator_input && this.form.pin_input) {
            this.authKoordinator = this.form.koordinator_input;
            this.authPin = this.form.pin_input;
            sessionStorage.setItem('agencil_coord', this.authKoordinator);
            sessionStorage.setItem('agencil_pin', this.authPin);
          }

          this.openModal = false;
          this.initData();
          this.showToast('Agenda berhasil disimpan!', 'success');
        } else { this.showToast(result.message, 'error'); }
      } catch (err) { this.showToast('Kesalahan jaringan: ' + err.message, 'error'); } finally { this.submitting = false; }
    },

    async submitChangePin() {
      if (!this.pinForm.koordinator_input && this.authKoordinator) {
        this.pinForm.koordinator_input = this.authKoordinator;
      }
      this.submittingPin = true;
      try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(this.pinForm) });
        let result = await res.json();
        if(result.status === 'sukses') {
          this.authPin = this.pinForm.new_pin;
          sessionStorage.setItem('agencil_pin', this.authPin);
          this.showToast(result.message, 'success');
          this.openPinModalBox = false;
        } else { this.showToast(result.message, 'error'); }
      } catch (err) { this.showToast('Kesalahan jaringan.', 'error'); } finally { this.submittingPin = false; }
    },

    async deleteAgenda() {
      if (!this.form.koordinator_input && this.authKoordinator) {
        this.form.koordinator_input = this.authKoordinator;
      }
      if (!this.form.pin_input && this.authPin) {
        this.form.pin_input = this.authPin;
      }

      this.submitting = true;
      this.confirmingDelete = false;
      try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ ...this.form, action: 'delete' }) });
        let result = await res.json();
        if(result.status === 'sukses') {
          this.openModal = false;
          this.initData();
          this.showToast('Agenda dihapus permanen.', 'success');
        } else { this.showToast(result.message, 'error'); }
      } catch (err) { this.showToast('Kesalahan jaringan.', 'error'); } finally { this.submitting = false; }
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
        teal: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' 
      };
      return map[warna] || 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100';
    },

    getBadgeDotClass(warna) {
      const map = { blue: 'bg-blue-600', emerald: 'bg-emerald-600', amber: 'bg-amber-600', purple: 'bg-purple-600', rose: 'bg-rose-600', cyan: 'bg-cyan-600', indigo: 'bg-indigo-600', teal: 'bg-teal-600' };
      return map[warna] || 'bg-slate-500';
    }
  }
}