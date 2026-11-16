const API_URL = 'https://script.google.com/macros/s/AKfycbysAMTC4DKtT90-koizvBg7_9jYCAg1TYmGtbnp_MaARZGKsW3-LYAQmMxc_P-KQx6Rtw/exec';

function agendaApp() {
  return {
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

    // --- COMPATIBILITY & ROLE GETTERS ---
    get authRole() {
      if (!this.authKoordinator) return '';
      let coordKey = this.authKoordinator.trim().toUpperCase();
      if (coordKey === 'SUPERADMIN') return 'superadmin';
      if (this.users && this.users[coordKey] && this.users[coordKey].role) {
        let r = String(this.users[coordKey].role).trim().toLowerCase();
        if (r === 'project_officer' || r === 'officer' || r === 'project officer') {
          return 'project_officer';
        }
        return r;
      }
      return 'koordinator';
    },

    get isSuperAdmin() {
      return this.authRole === 'superadmin';
    },

    get isPM() {
      return this.authRole === 'pm';
    },

    get isProjectOfficer() {
      return this.authRole === 'project_officer';
    },

    get isPMOrSuperAdmin() {
      return this.isSuperAdmin || this.isPM;
    },

    get canManageAllAgendas() {
      return this.isSuperAdmin || this.isPM || this.isProjectOfficer;
    },

    get canManageFinance() {
      // Project Officer TIDAK BISA mengatur pagu anggaran / keuangan
      return this.isSuperAdmin || this.isPM;
    },

    get userRoleLabel() {
      if (this.isSuperAdmin) return 'Superadmin';
      if (this.isProjectOfficer) return 'Project Officer';
      if (this.isPM) return 'Project Manager';
      if (this.authKoordinator) return 'Koordinator';
      return '';
    },

    get pendingUdpReviewCount() {
      return this.paguControlData.pendingReviewCount || 0;
    },

    get canAddAgenda() {
      if (!this.authKoordinator) return false;
      return this.isSuperAdmin || this.isProjectOfficer || Object.keys(this.filteredProyekOptions).length > 0;
    },

    canEditAgenda(item) {
      if (!this.authKoordinator || !item) return false;
      if (this.isSuperAdmin || this.isProjectOfficer) return true;
      let projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
      return projCoord !== '' && projCoord === this.authKoordinator.trim().toUpperCase();
    },

    get isAllProjectsSelected() {
      return this.selectedProjects.includes('ALL') || this.selectedProjects.length === 0;
    },

    get hasActiveFilter() {
      return Boolean(this.udpFilterMode) || !this.isAllProjectsSelected;
    },

    get activeFilterSummaryLabel() {
      const parts = [];
      if (!this.isAllProjectsSelected) {
        parts.push(this.selectedProjectInfo.nickname);
      }
      if (this.udpFilterMode) {
        parts.push(this.udpFilterLabel);
      }
      return parts.join(' • ');
    },

    resetAllFilters() {
      this.udpFilterMode = '';
      this.selectAllProjects();
    },

    isProjectSelected(id) {
      return !this.isAllProjectsSelected && this.selectedProjects.includes(id);
    },

    selectAllProjects() {
      this.selectedProjects = ['ALL'];
    },

    selectSingleProject(id) {
      if (id === 'ALL') {
        this.selectedProjects = ['ALL'];
      } else {
        this.selectedProjects = [id];
      }
    },

    selectUdpProjectRow(idProyek) {
      if (!idProyek) return;
      this.selectedProjects = [idProyek];
      if (!this.udpFilterMode) {
        this.udpFilterMode = 'all_udp';
      }
      this.jumpToFirstFilteredMonth();
    },

    jumpToFirstFilteredMonth() {
      const matched = this.filteredAgenda;
      if (matched.length > 0) {
        const hasInCurrentMonth = matched.some(item => {
          if (!item.tanggal) return false;
          let parts = String(item.tanggal).split('T')[0].split('-');
          if (parts.length !== 3) return false;
          return parseInt(parts[0], 10) === this.currentYear && (parseInt(parts[1], 10) - 1) === this.currentMonth;
        });

        if (!hasInCurrentMonth) {
          let firstWithDate = matched.find(item => item.tanggal);
          if (firstWithDate) {
            let parts = String(firstWithDate.tanggal).split('T')[0].split('-');
            if (parts.length === 3) {
              this.currentYear = parseInt(parts[0], 10);
              this.currentMonth = parseInt(parts[1], 10) - 1;
            }
          }
        }
      }
    },

    toggleProjectSelection(id) {
      if (id === 'ALL') {
        this.selectedProjects = ['ALL'];
        return;
      }

      if (this.isAllProjectsSelected) {
        this.selectedProjects = [id];
        return;
      }

      if (this.selectedProjects.includes(id)) {
        const remaining = this.selectedProjects.filter(item => item !== id);
        this.selectedProjects = remaining.length > 0 ? remaining : ['ALL'];
      } else {
        this.selectedProjects = [...this.selectedProjects, id];
      }
    },

    get uniqueCoordinators() {
      if (this.users && Object.keys(this.users).length > 0) {
        return Object.keys(this.users).sort();
      }
      const coords = Object.values(this.proyekList).map(p => p.koordinator).filter(Boolean);
      return [...new Set(coords)].sort();
    },

    get authCoordinatorFullName() {
      if (!this.authKoordinator) return '';
      let coordKey = this.authKoordinator.trim().toUpperCase();

      if (this.users && this.users[coordKey]) {
        let userFull = this.users[coordKey].nama_koordinator || this.users[coordKey].nama_lengkap;
        if (userFull && String(userFull).trim() !== '') {
          return String(userFull).trim();
        }
      }

      const matchedProject = Object.values(this.proyekList || {}).find(p => {
        return (p.koordinator || '').trim().toUpperCase() === coordKey &&
               ((p.nama_koordinator && String(p.nama_koordinator).trim() !== '') ||
                (p.nama_lengkap && String(p.nama_lengkap).trim() !== ''));
      });

      if (matchedProject) {
        return String(matchedProject.nama_koordinator || matchedProject.nama_lengkap).trim();
      }

      return this.authKoordinator;
    },

    formatRupiah(angka) {
      let num = Number(angka) || 0;
      const prefix = num < 0 ? '-Rp ' : 'Rp ';
      return prefix + Math.abs(num).toLocaleString('id-ID');
    },

    formatRibuan(angka) {
      let num = parseInt(String(angka || '0').replace(/[^0-9]/g, ''), 10) || 0;
      return num > 0 ? num.toLocaleString('id-ID') : '';
    },

    getEffectiveUdp(item) {
      if (!item) return 0;
      if (item.status_udp === 'Ditolak') return 0;
      if (item.udp_efektif !== undefined && item.udp_efektif !== null) {
        return Number(item.udp_efektif) || 0;
      }
      if (item.udp_final !== undefined && item.udp_final !== null) {
        return Number(item.udp_final) || 0;
      }
      return Number(item.udp) || 0;
    },

    handleUdpInput(val) {
      let cleanNum = parseInt(String(val || '0').replace(/[^0-9]/g, ''), 10) || 0;
      this.form.udp = cleanNum;
      this.form.udp_display = cleanNum > 0 ? cleanNum.toLocaleString('id-ID') : '';
    },

    handlePaguInput(val) {
      let cleanNum = parseInt(String(val || '0').replace(/[^0-9]/g, ''), 10) || 0;
      this.paguForm.anggaran_kegiatan = cleanNum;
      this.paguForm.anggaran_display = cleanNum > 0 ? cleanNum.toLocaleString('id-ID') : '';
    },

    handleReviewUdpInput(val) {
      let cleanNum = parseInt(String(val || '0').replace(/[^0-9]/g, ''), 10) || 0;
      this.reviewUdpForm.udp_final = cleanNum;
      this.reviewUdpForm.udp_final_display = cleanNum > 0 ? cleanNum.toLocaleString('id-ID') : '';
      if (this.reviewUdpForm.status_udp === 'Ditolak' && cleanNum > 0) {
        this.reviewUdpForm.status_udp = 'Revisi PM';
      } else if (this.reviewUdpForm.status_udp === 'ACC Final' && cleanNum !== this.reviewUdpForm.udp_usulan) {
        this.reviewUdpForm.status_udp = 'Revisi PM';
      }
    },

    matchReviewUdpToUsulan() {
      const val = Number(this.reviewUdpForm.udp_usulan) || 0;
      this.reviewUdpForm.udp_final = val;
      this.reviewUdpForm.udp_final_display = val > 0 ? val.toLocaleString('id-ID') : '';
      this.reviewUdpForm.status_udp = 'ACC Final';
    },

    handleUdpFileChange(event) {
      const file = event.target && event.target.files ? event.target.files[0] : null;
      if (!file) {
        this.clearUdpFile();
        return;
      }

      const fileName = file.name || '';
      const isExcelExt = /\.(xlsx|xls|xlsm)$/i.test(fileName);
      const allowedMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroenabled.12',
        'application/octet-stream',
        ''
      ];
      const fileMime = (file.type || '').toLowerCase();

      if (!isExcelExt || !allowedMimes.includes(fileMime)) {
        event.target.value = '';
        this.clearUdpFile();
        this.showToast('Format file ditolak! Hanya file Excel (.xlsx, .xls, .xlsm) yang diperbolehkan.', 'error');
        return;
      }

      const maxBytes = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxBytes) {
        event.target.value = '';
        this.clearUdpFile();
        this.showToast('Ukuran file Excel maksimal 10 MB.', 'error');
        return;
      }

      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const sizeLabel = sizeKb >= 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

      const reader = new FileReader();
      reader.onload = () => {
        const resultStr = String(reader.result || '');
        const base64Part = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
        this.form.udp_file_base64 = base64Part;
        this.form.udp_file_orig_name = fileName;
        this.form.udp_file_mime = file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        this.form.udp_file_size_label = sizeLabel;
      };
      reader.onerror = () => {
        this.clearUdpFile();
        this.showToast('Gagal membaca file Excel dari perangkat.', 'error');
      };
      reader.readAsDataURL(file);
    },

    clearUdpFile() {
      this.form.udp_file_base64 = '';
      this.form.udp_file_orig_name = '';
      this.form.udp_file_mime = '';
      this.form.udp_file_size_label = '';
      const inputEl = document.getElementById('udpExcelInput');
      if (inputEl) inputEl.value = '';
    },

    canViewAgendaUdp(item) {
      if (!this.authKoordinator || !item) return false;
      if (this.canManageAllAgendas) return true;
      let projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
      return projCoord !== '' && projCoord === this.authKoordinator.trim().toUpperCase();
    },

    getDiffToStartDays(item) {
      if (!item || !item.tanggal) return null;
      let parts = String(item.tanggal).split('T')[0].split('-');
      if (parts.length !== 3) return null;
      let today = new Date();
      today.setHours(0, 0, 0, 0);
      let startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      startDate.setHours(0, 0, 0, 0);
      return Math.round((startDate - today) / (1000 * 60 * 60 * 24));
    },

    matchesUdpBucket(item, mode) {
      if (!this.authKoordinator || !item) return false;
      let authKey = this.authKoordinator.trim().toUpperCase();
      if (!this.canManageAllAgendas) {
        let projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
        if (projCoord !== authKey) return false;
      }

      if (this.isPastAgenda(item)) return false;

      let udp = this.getEffectiveUdp(item);
      if (udp <= 0) return false;

      if (mode === 'all_udp') return true;

      let diffToStart = this.getDiffToStartDays(item);
      if (diffToStart === null) return false;

      if (mode === 'h2') return diffToStart <= 2;
      if (mode === 'h7') return diffToStart >= 3 && diffToStart <= 7;
      if (mode === 'h14') return diffToStart >= 8 && diffToStart <= 14;

      return false;
    },

    toggleUdpFilter(mode) {
      if (this.udpFilterMode === mode) {
        this.udpFilterMode = '';
        return;
      }
      this.udpFilterMode = mode;
      this.showUdpBreakdown = true;
      this.jumpToFirstFilteredMonth();
    },

    clearUdpFilter() {
      this.udpFilterMode = '';
    },

    get udpFilterLabel() {
      const labels = {
        h2: 'Mendesak (H-2)',
        h7: 'Minggu Ini (H-3 s.d. H-7)',
        h14: 'Minggu Depan (H-8 s.d. H-14)',
        all_udp: 'Total Kebutuhan Dana'
      };
      return labels[this.udpFilterMode] || '';
    },

    get udpSummary() {
      if (!this.authKoordinator) {
        return {
          visible: false,
          mendesakH2: 0,
          countMendesakH2: 0,
          mingguIniH7: 0,
          countMingguIniH7: 0,
          mingguDepanH14: 0,
          countMingguDepanH14: 0,
          totalKebutuhan: 0,
          countTotalKebutuhan: 0,
          perProyek: [],
          scopeLabel: ''
        };
      }

      let authKey = this.authKoordinator.trim().toUpperCase();

      let scopedAgendas = this.agendaList.filter(item => {
        if (this.canManageAllAgendas) return true;
        let projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
        return projCoord === authKey;
      });

      if (!this.isAllProjectsSelected) {
        scopedAgendas = scopedAgendas.filter(item => this.selectedProjects.includes(item.id_proyek));
      }

      let activeAgendas = scopedAgendas.filter(item => !this.isPastAgenda(item));

      let mendesakH2 = 0;
      let countMendesakH2 = 0;
      let mingguIniH7 = 0;
      let countMingguIniH7 = 0;
      let mingguDepanH14 = 0;
      let countMingguDepanH14 = 0;
      let totalKebutuhan = 0;
      let countTotalKebutuhan = 0;
      let proyekMap = {};

      activeAgendas.forEach(item => {
        let udp = this.getEffectiveUdp(item);
        totalKebutuhan += udp;
        if (udp > 0) countTotalKebutuhan++;

        let diffToStart = this.getDiffToStartDays(item);

        let isH2Urgent = (diffToStart !== null && diffToStart <= 2);
        let isH7Week = (diffToStart !== null && diffToStart >= 3 && diffToStart <= 7);
        let isH14NextWeek = (diffToStart !== null && diffToStart >= 8 && diffToStart <= 14);

        if (isH2Urgent) {
          mendesakH2 += udp;
          if (udp > 0) countMendesakH2++;
        } else if (isH7Week) {
          mingguIniH7 += udp;
          if (udp > 0) countMingguIniH7++;
        } else if (isH14NextWeek) {
          mingguDepanH14 += udp;
          if (udp > 0) countMingguDepanH14++;
        }

        if (udp > 0) {
          let pid = item.id_proyek || 'UMUM';
          if (!proyekMap[pid]) {
            let infoP = this.proyekList[pid] || {};
            proyekMap[pid] = {
              id_proyek: pid,
              nickname: infoP.nickname || item.nickname || pid,
              warna: infoP.warna || item.warna || 'blue',
              koordinator: infoP.nama_koordinator || infoP.nama_lengkap || infoP.koordinator || '-',
              mendesakH2: 0,
              countMendesakH2: 0,
              mingguIniH7: 0,
              countMingguIniH7: 0,
              mingguDepanH14: 0,
              countMingguDepanH14: 0,
              totalKebutuhan: 0,
              count: 0,
              displayCount: 0,
              files: []
            };
          }
          proyekMap[pid].totalKebutuhan += udp;
          proyekMap[pid].count++;

          let fileUrl = item.file_udp_url || item.file_udp || '';
          if (fileUrl) {
            proyekMap[pid].files.push({
              url: fileUrl,
              name: item.file_udp_name || item.nama_kegiatan,
              agendaName: item.nama_kegiatan
            });
          }

          if (isH2Urgent) {
            proyekMap[pid].mendesakH2 += udp;
            proyekMap[pid].countMendesakH2++;
          } else if (isH7Week) {
            proyekMap[pid].mingguIniH7 += udp;
            proyekMap[pid].countMingguIniH7++;
          } else if (isH14NextWeek) {
            proyekMap[pid].mingguDepanH14 += udp;
            proyekMap[pid].countMingguDepanH14++;
          }
        }
      });

      let perProyek = Object.values(proyekMap).map(p => {
        if (this.udpFilterMode === 'h2') {
          p.displayCount = p.countMendesakH2;
        } else if (this.udpFilterMode === 'h7') {
          p.displayCount = p.countMingguIniH7;
        } else if (this.udpFilterMode === 'h14') {
          p.displayCount = p.countMingguDepanH14;
        } else {
          p.displayCount = p.count;
        }
        return p;
      });

      if (this.udpFilterMode === 'h2') {
        perProyek = perProyek
          .filter(p => p.mendesakH2 > 0)
          .sort((a, b) => b.mendesakH2 - a.mendesakH2);
      } else if (this.udpFilterMode === 'h7') {
        perProyek = perProyek
          .filter(p => p.mingguIniH7 > 0)
          .sort((a, b) => b.mingguIniH7 - a.mingguIniH7);
      } else if (this.udpFilterMode === 'h14') {
        perProyek = perProyek
          .filter(p => p.mingguDepanH14 > 0)
          .sort((a, b) => b.mingguDepanH14 - a.mingguDepanH14);
      } else {
        perProyek = perProyek.sort((a, b) => b.totalKebutuhan - a.totalKebutuhan);
      }

      let scopeLabel = this.canManageAllAgendas
        ? (this.isAllProjectsSelected ? (this.isPM ? 'Semua Proyek (PM)' : (this.isProjectOfficer ? 'Semua Proyek (Officer)' : 'Semua Proyek (Superadmin)')) : this.selectedProjectInfo.nickname)
        : (this.isAllProjectsSelected ? `Proyek Anda (${this.authCoordinatorFullName})` : this.selectedProjectInfo.nickname);

      return {
        visible: true,
        mendesakH2,
        countMendesakH2,
        mingguIniH7,
        countMingguIniH7,
        mingguDepanH14,
        countMingguDepanH14,
        totalKebutuhan,
        countTotalKebutuhan,
        perProyek,
        scopeLabel
      };
    },

    // =========================================================================
    // DATA & ANALITIK TAB 3: KONTROL PAGU ANGGARAN & MEJA BEDAH UDP PM
    // =========================================================================
    get paguControlData() {
      if (!this.authKoordinator) {
        return {
          totalPagu: 0,
          totalRealisasi: 0,
          totalTerkunci: 0,
          totalSisa: 0,
          pendingReviewCount: 0,
          projects: [],
          udpItems: []
        };
      }

      const authKey = this.authKoordinator.trim().toUpperCase();

      const scopedProjectIds = Object.keys(this.proyekList || {}).filter(id => {
        const p = this.proyekList[id];
        if (!p) return false;
        const status = (p.status || 'Aktif').trim().toLowerCase();
        const isAktif = (status === 'aktif' || status === 'active');
        if (!isAktif) return false;

        if (!this.canManageAllAgendas) {
          const projCoord = (p.koordinator || '').trim().toUpperCase();
          if (projCoord !== authKey) return false;
        }

        if (!this.isAllProjectsSelected && !this.selectedProjects.includes(id)) {
          return false;
        }
        return true;
      }).sort((a, b) => {
        let nameA = (this.proyekList[a].nickname || '').toLowerCase();
        let nameB = (this.proyekList[b].nickname || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      let totalPagu = 0;
      let totalRealisasi = 0;
      let totalTerkunci = 0;
      let pendingReviewCount = 0;

      const projects = scopedProjectIds.map(id => {
        const p = this.proyekList[id];
        const pagu = Number(p.anggaran_kegiatan) || 0;
        const projAgendas = this.agendaList.filter(a => a.id_proyek === id);

        let realisasi = 0;
        let countRealisasi = 0;
        let terkunci = 0;
        let countTerkunci = 0;
        let countPending = 0;

        projAgendas.forEach(item => {
          const rawUdp = Number(item.udp) || 0;
          const effUdp = this.getEffectiveUdp(item);
          const statusUdp = item.status_udp || (rawUdp > 0 ? 'Menunggu Review PM' : '');

          if (rawUdp > 0 && statusUdp === 'Menunggu Review PM') {
            countPending++;
            pendingReviewCount++;
          }

          if (effUdp > 0) {
            if (this.isPastAgenda(item)) {
              realisasi += effUdp;
              countRealisasi++;
            } else {
              terkunci += effUdp;
              countTerkunci++;
            }
          }
        });

        const terpakai = realisasi + terkunci;
        const sisa = pagu - terpakai;
        const isOverBudget = pagu > 0 && terpakai > pagu;

        let pctRealisasi = 0;
        let pctTerkunci = 0;
        let pctUsedTotal = 0;

        if (pagu > 0) {
          pctUsedTotal = Math.round((terpakai / pagu) * 100);
          if (terpakai <= pagu) {
            pctRealisasi = (realisasi / pagu) * 100;
            pctTerkunci = (terkunci / pagu) * 100;
          } else {
            pctRealisasi = (realisasi / terpakai) * 100;
            pctTerkunci = (terkunci / terpakai) * 100;
          }
        }

        totalPagu += pagu;
        totalRealisasi += realisasi;
        totalTerkunci += terkunci;

        return {
          id_proyek: id,
          nickname: p.nickname || id,
          nama_lengkap: p.nama_lengkap || '',
          koordinator: p.nama_koordinator || p.nama_lengkap || p.koordinator || '-',
          warna: p.warna || 'blue',
          pagu,
          realisasi,
          countRealisasi,
          terkunci,
          countTerkunci,
          terpakai,
          sisa,
          isOverBudget,
          pctRealisasi: Number(pctRealisasi.toFixed(2)),
          pctTerkunci: Number(pctTerkunci.toFixed(2)),
          pctUsedTotal,
          countPending
        };
      }).sort((a, b) => a.nickname.localeCompare(b.nickname));

      let udpItems = this.agendaList.filter(item => {
        if ((Number(item.udp) || 0) <= 0) return false;
        if (!this.canManageAllAgendas) {
          const projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
          if (projCoord !== authKey) return false;
        }
        if (!this.isAllProjectsSelected && !this.selectedProjects.includes(item.id_proyek)) {
          return false;
        }
        return true;
      }).map(item => {
        const infoP = this.proyekList[item.id_proyek] || {};
        const rawUdp = Number(item.udp) || 0;
        const statusUdp = item.status_udp || 'Menunggu Review PM';
        const effUdp = this.getEffectiveUdp(item);
        return {
          ...item,
          nickname: infoP.nickname || item.nickname || item.id_proyek,
          warna: infoP.warna || item.warna || 'blue',
          koordinator_proyek: infoP.nama_koordinator || infoP.nama_lengkap || infoP.koordinator || '-',
          status_udp_resolved: statusUdp,
          udp_usulan_num: rawUdp,
          udp_efektif_num: effUdp,
          is_past: this.isPastAgenda(item)
        };
      });

      if (this.paguStatusFilter !== 'ALL') {
        udpItems = udpItems.filter(item => item.status_udp_resolved === this.paguStatusFilter);
      }

      udpItems.sort((a, b) => {
        const pA = a.status_udp_resolved === 'Menunggu Review PM' ? 0 : 1;
        const pB = b.status_udp_resolved === 'Menunggu Review PM' ? 0 : 1;
        if (pA !== pB) return pA - pB;
        if (!a.tanggal) return 1;
        if (!b.tanggal) return -1;
        return new Date(a.tanggal) - new Date(b.tanggal);
      });

      return {
        totalPagu,
        totalRealisasi,
        totalTerkunci,
        totalSisa: totalPagu - (totalRealisasi + totalTerkunci),
        pendingReviewCount,
        projects,
        udpItems
      };
    },

    // --- MAPPING FOR index.html PAGU & UDP REVIEW TABS ---
    get paguOverview() {
      const data = this.paguControlData;
      return {
        totalPagu: data.totalPagu,
        totalRealisasiSelesai: data.totalRealisasi,
        totalDanaTerkunci: data.totalTerkunci,
        totalSisaSaldo: data.totalSisa,
        cards: data.projects.map(p => ({
          ...p,
          realisasiSelesai: p.realisasi,
          danaTerkunci: p.terkunci,
          sisaSaldo: p.sisa,
          pctSelesai: p.pctRealisasi // Sinkronisasi properti progress bar HTML
        }))
      };
    },

    udpReviewSearch: '',
    udpReviewFilter: 'all', // 'all' | 'Menunggu Review PM' | 'ACC Final' | 'Revisi PM' | 'Ditolak'

    get filteredUdpReviewList() {
      let items = this.paguControlData.udpItems || [];
      
      if (this.udpReviewFilter !== 'all') {
        items = items.filter(i => (i.status_udp || 'Menunggu Review PM') === this.udpReviewFilter);
      }

      if (this.udpReviewSearch.trim()) {
        const q = this.udpReviewSearch.trim().toLowerCase();
        items = items.filter(i => 
          (i.nama_kegiatan && i.nama_kegiatan.toLowerCase().includes(q)) ||
          (i.nickname && i.nickname.toLowerCase().includes(q)) ||
          (i.catatan_pm && i.catatan_pm.toLowerCase().includes(q)) ||
          (i.lokasi && i.lokasi.toLowerCase().includes(q))
        );
      }

      return items.map(i => ({
        ...i,
        status_udp: i.status_udp || 'Menunggu Review PM',
        udp_final: i.udp_final !== undefined ? i.udp_final : null,
        tanggal_tampil: i.tanggal_tampil || ''
      }));
    },

    openBedahUdpModal(item) {
      this.openReviewModalForAgenda(item);
    },

    openEditPaguModal(proj) {
      if (!proj) return;
      const currentPagu = Number(proj.pagu) || 0;
      this.paguForm = {
        id_proyek: proj.id_proyek,
        nickname: proj.nickname,
        koordinator: proj.koordinator,
        terpakai: Number(proj.terpakai) || 0,
        anggaran_kegiatan: currentPagu,
        anggaran_display: currentPagu > 0 ? currentPagu.toLocaleString('id-ID') : ''
      };
      this.openPaguModal = true;
    },

    async submitUpdatePagu() {
      if (!this.paguForm.id_proyek) return;
      this.submittingPagu = true;
      try {
        let res = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'update_pagu',
            koordinator_input: this.authKoordinator,
            pin_input: this.authPin,
            id_proyek: this.paguForm.id_proyek,
            anggaran_kegiatan: this.paguForm.anggaran_kegiatan
          })
        });
        let result = await res.json();
        if (result.status === 'sukses') {
          this.openPaguModal = false;
          await this.initData(true);
          this.showToast(result.message || 'Pagu anggaran kegiatan berhasil diperbarui!', 'success');
        } else {
          this.showToast(result.message || 'Gagal memperbarui pagu anggaran.', 'error');
        }
      } catch (err) {
        this.showToast('Kesalahan jaringan: ' + err.message, 'error');
      } finally {
        this.submittingPagu = false;
      }
    },

    openReviewModalForAgenda(item) {
      if (!item) return;
      const infoP = this.proyekList[item.id_proyek] || {};
      const usulan = Number(item.udp) || 0;
      const currentStatus = (item.status_udp && item.status_udp !== 'Menunggu Review PM')
        ? item.status_udp
        : 'ACC Final';
      const initialFinal = currentStatus === 'Ditolak'
        ? 0
        : (item.udp_final !== null && item.udp_final !== undefined ? Number(item.udp_final) : usulan);

      this.reviewUdpForm = {
        id_agenda: item.id_agenda,
        id_proyek: item.id_proyek,
        nickname: infoP.nickname || item.nickname || item.id_proyek,
        nama_kegiatan: item.nama_kegiatan,
        tanggal_tampil: item.tanggal_tampil || '',
        jadwal_teks: this.formatAgendaDate(item),
        koordinator: infoP.nama_koordinator || infoP.nama_lengkap || infoP.koordinator || '-',
        file_udp_url: item.file_udp_url || item.file_udp || '',
        file_udp_name: item.file_udp_name || '',
        udp_usulan: usulan,
        udp_usulan_display: usulan > 0 ? usulan.toLocaleString('id-ID') : '',
        udp_final: initialFinal,
        udp_final_display: initialFinal > 0 ? initialFinal.toLocaleString('id-ID') : (currentStatus === 'Ditolak' ? '0' : ''),
        status_udp: currentStatus,
        catatan_pm: item.catatan_pm || ''
      };
      this.openReviewUdpModal = true;
    },

    async submitReviewUdp() {
      if (!this.reviewUdpForm.id_agenda) return;
      this.submittingReviewUdp = true;
      try {
        let res = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'review_udp',
            koordinator_input: this.authKoordinator,
            pin_input: this.authPin,
            id_agenda: this.reviewUdpForm.id_agenda,
            status_udp: this.reviewUdpForm.status_udp,
            udp_final: this.reviewUdpForm.status_udp === 'Ditolak' ? 0 : this.reviewUdpForm.udp_final,
            catatan_pm: this.reviewUdpForm.catatan_pm
          })
        });
        let result = await res.json();
        if (result.status === 'sukses') {
          this.openReviewUdpModal = false;
          await this.initData(true);
          this.showToast(result.message || 'Keputusan review UDP berhasil disimpan!', 'success');
        } else {
          this.showToast(result.message || 'Gagal menyimpan review UDP.', 'error');
        }
      } catch (err) {
        this.showToast('Kesalahan jaringan: ' + err.message, 'error');
      } finally {
        this.submittingReviewUdp = false;
      }
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
      this.udpFilterMode = '';
      this.showUdpBreakdown = false;
      this.activeTab = 'kalender';
      this.paguStatusFilter = 'ALL';
      sessionStorage.removeItem('agencil_coord');
      sessionStorage.removeItem('agencil_pin');
      this.initData(true);
      this.showToast('Sesi login diakhiri.', 'success');
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
      if (this.isAllProjectsSelected) {
        return { nickname: 'Semua Proyek', warna: 'blue', count: this.agendaList.length };
      }

      const validIds = this.selectedProjects.filter(id => this.proyekList[id]);
      if (validIds.length === 0) {
        return { nickname: 'Semua Proyek', warna: 'blue', count: this.agendaList.length };
      }

      if (validIds.length === 1) {
        const proj = this.proyekList[validIds[0]];
        return { nickname: proj.nickname, warna: proj.warna, count: this.getProjectCount(validIds[0]) };
      }

      const names = validIds.map(id => this.proyekList[id].nickname);
      const label = validIds.length === 2 ? names.join(', ') : `${validIds.length} Proyek Dipilih`;
      const totalCount = validIds.reduce((sum, id) => sum + this.getProjectCount(id), 0);
      return { nickname: label, warna: this.proyekList[validIds[0]].warna || 'blue', count: totalCount };
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

    get sortedFilteredDesktopProyekList() {
      const base = this.sortedActiveProyekList;
      if (!this.sidebarProjectSearch.trim()) return base;
      const keyword = this.sidebarProjectSearch.trim().toLowerCase();
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
      this.selectSingleProject(id);
      this.projectSearch = '';
      this.openProjectSheet = false;
    },
    
    get filteredAgenda() {
      let list = this.isAllProjectsSelected
        ? this.agendaList
        : this.agendaList.filter(item => this.selectedProjects.includes(item.id_proyek));

      if (this.udpFilterMode) {
        list = list.filter(item => this.matchesUdpBucket(item, this.udpFilterMode));
      }

      return list;
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
      
      if (this.isSuperAdmin || this.isProjectOfficer) {
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

    openReviewFromView() {
      const target = this.viewAgendaData;
      this.viewModal = false;
      this.openReviewModalForAgenda(target);
    },

    openAddModal() {
      this.form = { 
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
        koordinator_input: this.authKoordinator, 
        pin_input: this.authPin 
      };
      this.confirmingDelete = false;
      this.openModal = true;
      this.$nextTick(() => this.clearUdpFile());
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
      if (cleanJadwalTeks && cleanDate) {
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        let dateParts = cleanDate.split('-');
        let startYear = parseInt(dateParts[0], 10);
        let startMonthIdx = parseInt(dateParts[1], 10) - 1;
        let startDay = parseInt(dateParts[2], 10);
        let startD = new Date(startYear, startMonthIdx, startDay);

        let matchCrossMonth = cleanJadwalTeks.match(/(\d+)\s+([A-Za-z]+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchSameMonth = cleanJadwalTeks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);

        if (matchCrossMonth) {
          let eDay = parseInt(matchCrossMonth[3], 10);
          let eMonthStr = matchCrossMonth[4].toLowerCase();
          let eYear = parseInt(matchCrossMonth[5], 10);
          let eMonthIdx = monthNames.findIndex(m => eMonthStr.includes(m));
          if (eMonthIdx !== -1) {
            let endD = new Date(eYear, eMonthIdx, eDay);
            let diffDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > 0) calculatedDurasi = diffDays;
          }
        } else if (matchSameMonth) {
          let eDay = parseInt(matchSameMonth[2], 10);
          let monthStr = matchSameMonth[3].toLowerCase();
          let year = parseInt(matchSameMonth[4], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          if (monthIdx !== -1) {
            let endD = new Date(year, monthIdx, eDay);
            let diffDays = Math.round((endD - startD) / (1000 * 60 * 60 * 24)) + 1;
            if (diffDays > 0) calculatedDurasi = diffDays;
          }
        }
      }

      let orangMatch = item.tim_durasi ? String(item.tim_durasi).match(/(\d+)\s*Orang/i) : null;
      let hariMatch = item.tim_durasi ? String(item.tim_durasi).match(/(\d+)\s*Hari/i) : null;
      let numericUdp = Number(item.udp) || 0;

      this.form = { 
        ...item, 
        tanggal: cleanDate,
        jadwal_teks: cleanJadwalTeks,
        durasi_hari: calculatedDurasi,
        tim_jumlah_orang: orangMatch ? orangMatch[1] : '',
        tim_jumlah_hari: hariMatch ? hariMatch[1] : '',
        status: item.status || 'Fix',
        keterangan: item.keterangan || '',
        udp: numericUdp,
        udp_display: numericUdp > 0 ? numericUdp.toLocaleString('id-ID') : '',
        file_udp_url: item.file_udp_url || item.file_udp || '',
        file_udp_name: item.file_udp_name || '',
        udp_file_base64: '',
        udp_file_orig_name: '',
        udp_file_mime: '',
        udp_file_size_label: '',
        koordinator_input: this.authKoordinator, 
        pin_input: this.authPin 
      };

      if (!this.form.jadwal_teks) {
        this.generateJadwalTeks();
      }
      this.confirmingDelete = false;
      this.openModal = true;
      this.$nextTick(() => this.clearUdpFile());
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
        let matchCrossMonth = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchRange = item.jadwal_teks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchSingle = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        
        if (matchCrossMonth) {
          let endDay = parseInt(matchCrossMonth[3], 10);
          let monthStr = matchCrossMonth[4].toLowerCase();
          let endYear = parseInt(matchCrossMonth[5], 10);
          let monthIdx = monthNames.findIndex(m => monthStr.includes(m));
          if (monthIdx !== -1) {
            endDateObj = new Date(endYear, monthIdx, endDay);
          }
        } else if (matchRange) {
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
        let matchCrossMonth = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchRange = item.jadwal_teks.match(/(\d+)\s*-\s*(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        let matchSingle = item.jadwal_teks.match(/(\d+)\s+([A-Za-z]+)\s+(\d{4})/);
        const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
        
        if (matchCrossMonth) {
          let eDay = parseInt(matchCrossMonth[3], 10);
          let eMonthStr = matchCrossMonth[4].toLowerCase();
          let eYear = parseInt(matchCrossMonth[5], 10);
          let eMonthIdx = monthNames.findIndex(m => eMonthStr.includes(m));
          if (eMonthIdx !== -1) {
            endDateObj = new Date(eYear, eMonthIdx, eDay);
          }
        } else if (matchRange) {
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

          let hasUploadedFile = Boolean(this.form.udp_file_base64);
          this.clearUdpFile();
          this.openModal = false;
          this.initData(true);
          this.showToast(
            hasUploadedFile ? 'Agenda & file rincian Excel berhasil disimpan!' : 'Agenda berhasil disimpan!',
            'success'
          );
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
  }
}