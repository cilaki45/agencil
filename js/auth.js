window.AgendaModules = window.AgendaModules || {};

window.AgendaModules.auth = {
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

  canViewAgendaUdp(item) {
    if (!this.authKoordinator || !item) return false;
    if (this.canManageAllAgendas) return true;
    let projCoord = (this.proyekList[item.id_proyek]?.koordinator || '').trim().toUpperCase();
    return projCoord !== '' && projCoord === this.authKoordinator.trim().toUpperCase();
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

  openPinModal() {
    this.pinForm = { koordinator_input: this.authKoordinator, old_pin: '', new_pin: '', action: 'change_pin' };
    this.openPinModalBox = true;
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
  }
};