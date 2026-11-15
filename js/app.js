const API_URL = 'https://script.google.com/macros/s/AKfycbysAMTC4DKtT90-koizvBg7_9jYCAg1TYmGtbnp_MaARZGKsW3-LYAQmMxc_P-KQx6Rtw/exec';

function agendaApp() {
  return {
    loading: true,
    agendaList: [],
    proyekList: {},
    users: {},
    selectedProject: 'ALL',
    autoRefreshTimer: null,
    initialHtml: '',
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

    get isSuperAdmin() {
      if (!this.authKoordinator) return false;
      let coordKey = this.authKoordinator.trim().toUpperCase();
      if (coordKey === 'SUPERADMIN') return true;
      if (this.users && this.users[coordKey] && this.users[coordKey].role === 'superadmin') {
        return true;
      }
      return false;
    },

    async loginSession() {
      if (!this.loginForm.koordinator || !this.loginForm.pin) {
        this.showToast('Pilih koordinator dan masukkan PIN terlebih dahulu!', 'error');
        return;
      }

      try {
        let res = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({
            action: 'login',
            koordinator_input: this.loginForm.koordinator,
            koordinator: this.loginForm.koordinator,
            pin_input: this.loginForm.pin,
            pin: this.loginForm.pin
          }) 
        });
        let result = await res.json();

        if (result.status === 'sukses') {
          this.authKoordinator = this.loginForm.koordinator;
          this.authPin = this.loginForm.pin;
          sessionStorage.setItem('agencil_coord', this.authKoordinator);
          sessionStorage.setItem('agencil_pin', this.authPin);
          this.loginForm.pin = '';
          this.openLoginModal = false;
          this.showToast(`Berhasil masuk sesi sebagai ${this.authKoordinator}`, 'success');
          this.initData(true);
        } else {
          this.showToast(result.message || 'Gagal login!', 'error');
        }
      } catch (err) {
        this.showToast('Kesalahan jaringan: ' + err.message, 'error');
      }
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

    formatAgendaDate(item) {
      if (item.jadwal_teks && item.jadwal_teks.trim() !== '' && !item.jadwal_teks.includes('T17:00:00')) {
        return item.jadwal_teks;
      }
      
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

    get sortedActiveProyekList() {
      if (!this.proyekList) return {};
      const filtered = {};
      const sortedKeys = Object.keys(this.proyekList).filter(id => {
        const p = this.proyekList[id];
        let status = (p.status || 'Aktif').trim().toLowerCase();
        return status === 'aktif' || status === 'active';
      }).sort((a, b) => {
        let nameA = (this.proyekList[a].nickname || '').toLowerCase();
        let nameB = (this.proyekList[b].nickname || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      sortedKeys.forEach(id => {
        filtered[id] = this.proyekList[id];
      });
      return filtered;
    },

    get filteredMobileProjects() {
      const base = this.sortedActiveProyekList;
      if (!this.projectSearch.trim()) return base;
      const keyword = this.projectSearch.trim().toLowerCase();
      const filtered = {};
      Object.keys(base).forEach(id => {
        const proj = base[id];
        if ((proj.nickname && proj.nickname.toLowerCase().includes(keyword)) || 
            (proj.koordinator && proj.koordinator.toLowerCase().includes(keyword)) ||
            (proj.nama_koordinator && proj.nama_koordinator.toLowerCase().includes(keyword)) ||
            (proj.nama_lengkap && proj.nama_lengkap.toLowerCase().includes(keyword))) {
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

    get currentMonthActiveCount() {
      return this.filteredAgenda.filter(item => {
        if (!item.tanggal) return false;
        let parts = String(item.tanggal).split('T')[0].split('-');
        if (parts.length !== 3) return false;
        let y = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10) - 1;
        
        if (y !== this.currentYear || m !== this.currentMonth) return false;
        
        return !this.isPastAgenda(item);
      }).length;
    },

    get filteredProyekOptions() {
      let activeCoord = this.authKoordinator;
      if (!activeCoord) return {};
      
      if (this.isSuperAdmin) {
        return this.proyekList;
      }

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

    updateTimDurasi() {
      let org = this.form.tim_jumlah_orang ? this.form.tim_jumlah_orang + ' Orang' : '';
      let day = this.form.tim_jumlah_hari ? this.form.tim_jumlah_hari + ' Hari' : '';
      if (org && day) {
        this.form.tim_durasi = `${org}, ${day}`;
      } else {
        this.form.tim_durasi = org || day;
      }
    },

    editAgenda(item) {
      let cleanDate = item.tanggal ? String(item.tanggal).split('T')[0] : '';
      let cleanJadwalTeks = item.jadwal_teks;
      if (!cleanJadwalTeks || cleanJadwalTeks.includes('T17:00:00') || cleanJadwalTeks.includes('Z')) {
        cleanJadwalTeks = '';
      }

      let calculatedDurasi = 1;
      if (cleanJadwalTeks) {
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        let matchRange = cleanJadwalTeks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        
        if (matchRange && cleanDate) {
          let startDay = parseInt(matchRange[1], 10);
          let endDay = parseInt(matchRange[2], 10);
          let monthStr = matchRange[3].toLowerCase();
          let year = parseInt(matchRange[4], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          
          if (monthIdx !== -1) {
            let startD = new Date(year, monthIdx, startDay);
            let endD = new Date(year, monthIdx, endDay);
            let diffDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > 0) calculatedDurasi = diffDays;
          }
        }
      }

      let orangMatch = item.tim_durasi ? String(item.tim_durasi).match(/(\d+)\s*Orang/i) : null;
      let hariMatch = item.tim_durasi ? String(item.tim_durasi).match(/(\d+)\s*Hari/i) : null;

      this.form = { 
        ...item, 
        tanggal: cleanDate,
        jadwal_teks: cleanJadwalTeks,
        durasi_hari: calculatedDurasi,
        tim_jumlah_orang: orangMatch ? orangMatch[1] : '',
        tim_jumlah_hari: hariMatch ? hariMatch[1] : '',
        koordinator_input: this.authKoordinator, 
        pin_input: this.authPin 
      };

      if (!this.form.jadwal_teks) {
        this.generateJadwalTeks();
      }
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

    isPastAgenda(item) {
      if (!item.tanggal) return false;
      
      let cleanDate = String(item.tanggal).split('T')[0];
      let parts = cleanDate.split('-');
      if (parts.length !== 3) return false;
      
      let year = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let day = parseInt(parts[2], 10);
      
      let endDateObj = new Date(year, month, day);
      
      if (item.jadwal_teks) {
        let matchRange = item.jadwal_teks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchSingle = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        
        if (matchRange) {
          let endDay = parseInt(matchRange[2], 10);
          let monthStr = matchRange[3].toLowerCase();
          let endYear = parseInt(matchRange[4], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          
          if (monthIdx !== -1) {
            endDateObj = new Date(endYear, monthIdx, endDay);
          }
        } else if (matchSingle) {
          let singleDay = parseInt(matchSingle[1], 10);
          let monthStr = matchSingle[2].toLowerCase();
          let singleYear = parseInt(matchSingle[3], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          
          if (monthIdx !== -1) {
            endDateObj = new Date(singleYear, monthIdx, singleDay);
          }
        }
      }

      let endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
      let today = new Date();
      let todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      return todayStr > endDateStr;
    },

    getAgendaStatusInfo(item) {
      if (!item.tanggal) return { text: 'Aktif / Berjalan', isFinished: false, isTodayOrOngoing: true };
      
      let cleanDate = String(item.tanggal).split('T')[0];
      let parts = cleanDate.split('-');
      if (parts.length !== 3) return { text: 'Aktif / Berjalan', isFinished: false, isTodayOrOngoing: true };
      
      let startYear = parseInt(parts[0], 10);
      let startMonth = parseInt(parts[1], 10) - 1;
      let startDay = parseInt(parts[2], 10);
      
      let startDateObj = new Date(startYear, startMonth, startDay);
      let endDateObj = new Date(startYear, startMonth, startDay);
      
      if (item.jadwal_teks) {
        let matchRange = item.jadwal_teks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchSingle = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        
        if (matchRange) {
          let sDay = parseInt(matchRange[1], 10);
          let eDay = parseInt(matchRange[2], 10);
          let monthStr = matchRange[3].toLowerCase();
          let year = parseInt(matchRange[4], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          
          if (monthIdx !== -1) {
            startDateObj = new Date(year, monthIdx, sDay);
            endDateObj = new Date(year, monthIdx, eDay);
          }
        } else if (matchSingle) {
          let singleDay = parseInt(matchSingle[1], 10);
          let monthStr = matchSingle[2].toLowerCase();
          let year = parseInt(matchSingle[3], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          
          if (monthIdx !== -1) {
            startDateObj = new Date(year, monthIdx, singleDay);
            endDateObj = new Date(year, monthIdx, singleDay);
          }
        }
      }

      let today = new Date();
      today.setHours(0, 0, 0, 0);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj.setHours(0, 0, 0, 0);

      if (today > endDateObj) {
        return { text: 'Selesai', isFinished: true, isTodayOrOngoing: false };
      }

      let diffToStart = Math.round((startDateObj - today) / (1000 * 60 * 60 * 24));

      if (diffToStart > 0) {
        return { text: `H-${diffToStart}`, isFinished: false, isTodayOrOngoing: false };
      }

      if (today.getTime() === startDateObj.getTime()) {
        return { text: 'Hari Ini', isFinished: false, isTodayOrOngoing: true };
      }

      if (today > startDateObj && today <= endDateObj) {
        let diffFromStart = Math.round((today - startDateObj) / (1000 * 60 * 60 * 24));
        return { text: `H+${diffFromStart}`, isFinished: false, isTodayOrOngoing: true };
      }

      return { text: 'Aktif / Berjalan', isFinished: false, isTodayOrOngoing: true };
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
        let res = await fetch(`${API_URL}${separator}t=${Date.now()}`);
        let data = await res.json();
        this.agendaList = data.agenda;
        this.proyekList = data.proyek;
        this.users = data.users || {};
        if (!isBackground && !this.autoRefreshTimer) {
          this.autoRefreshTimer = setInterval(() => {
            if (!this.openModal && !this.viewModal && !this.openPinModalBox && !this.openLoginModal) {
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
          this.initData(true);
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
          this.initData(true);
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
    }
  }
}