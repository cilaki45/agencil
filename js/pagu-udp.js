window.AgendaModules = window.AgendaModules || {};

window.AgendaModules.paguUdp = {
  udpReviewSearch: '',
  udpReviewFilter: 'all', // 'all' | 'Menunggu Review PM' | 'ACC Final' | 'Revisi PM' | 'Ditolak'

  // State Card Drill-Down Drawer
  openCardDrawer: false,
  activeCardType: null, // 'total_pagu' | 'realisasi_selesai' | 'dana_terkunci' | 'sisa_saldo'
  cardDrawerSearch: '',

  get pendingUdpReviewCount() {
    return this.paguControlData.pendingReviewCount || 0;
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

  // --- CARD DRILL-DOWN DRAWER ---
  openCardDrillDown(cardType) {
    this.activeCardType = cardType;
    this.cardDrawerSearch = '';
    this.openCardDrawer = true;
  },

  get cardDrawerTitle() {
    const map = {
      'total_pagu': 'Rincian Alokasi Pagu Kegiatan',
      'realisasi_selesai': 'Daftar Realisasi Kegiatan Selesai',
      'dana_terkunci': 'Daftar Kegiatan & Dana Terkunci',
      'sisa_saldo': 'Analisis Sisa Saldo & Status Anggaran'
    };
    return map[this.activeCardType] || 'Rincian Data Anggaran';
  },

  get cardDrawerSubtitle() {
    const map = {
      'total_pagu': 'Akumulasi plafon pagu kegiatan seluruh proyek terpantau',
      'realisasi_selesai': 'Serapan anggaran dari agenda kegiatan yang sudah terlaksana',
      'dana_terkunci': 'Alokasi dana aktif untuk jadwal hari ini dan mendatang',
      'sisa_saldo': 'Evaluasi saldo bersih dan deteksi dini risiko defisit anggaran'
    };
    return map[this.activeCardType] || '';
  },

  get cardDrawerItems() {
    const q = (this.cardDrawerSearch || '').toLowerCase();

    if (this.activeCardType === 'total_pagu') {
      let cards = this.paguOverview.cards;
      if (q) {
        cards = cards.filter(c => c.nickname.toLowerCase().includes(q) || c.koordinator.toLowerCase().includes(q));
      }
      return cards.map(c => ({
        title: c.nickname,
        subtitle: 'PIC: ' + c.koordinator,
        badge: c.pagu > 0 ? this.formatRupiah(c.pagu) : 'Belum Diatur',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 font-extrabold',
        detailText: 'Realisasi: ' + this.formatRupiah(c.realisasiSelesai) + ' | Terkunci: ' + this.formatRupiah(c.danaTerkunci),
        isOver: c.isOverBudget,
        rawObject: c
      }));
    } else if (this.activeCardType === 'realisasi_selesai') {
      let items = this.agendaList.filter(a => {
        if (!this.isAllProjectsSelected && !this.selectedProjects.includes(a.id_proyek)) return false;
        let effUdp = this.getEffectiveUdp(a);
        if (effUdp <= 0) return false;
        return this.isPastAgenda(a);
      });
      if (q) {
        items = items.filter(a => {
          let prj = this.proyekList[a.id_proyek] || {};
          return (a.nama_kegiatan + ' ' + (prj.nickname || '')).toLowerCase().includes(q);
        });
      }
      return items.map(a => {
        let prj = this.proyekList[a.id_proyek] || {};
        let effUdp = this.getEffectiveUdp(a);
        return {
          title: a.nama_kegiatan,
          subtitle: (prj.nickname || a.id_proyek) + ' • ' + (a.tanggal_tampil || a.tanggal),
          badge: this.formatRupiah(effUdp),
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold',
          detailText: 'Status: Selesai Terlaksana' + (a.status_udp ? ' (' + a.status_udp + ')' : ''),
          agendaObj: a
        };
      });
    } else if (this.activeCardType === 'dana_terkunci') {
      let items = this.agendaList.filter(a => {
        if (!this.isAllProjectsSelected && !this.selectedProjects.includes(a.id_proyek)) return false;
        let effUdp = this.getEffectiveUdp(a);
        if (effUdp <= 0) return false;
        return !this.isPastAgenda(a);
      });
      if (q) {
        items = items.filter(a => {
          let prj = this.proyekList[a.id_proyek] || {};
          return (a.nama_kegiatan + ' ' + (prj.nickname || '')).toLowerCase().includes(q);
        });
      }
      return items.map(a => {
        let prj = this.proyekList[a.id_proyek] || {};
        let effUdp = this.getEffectiveUdp(a);
        return {
          title: a.nama_kegiatan,
          subtitle: (prj.nickname || a.id_proyek) + ' • ' + (a.tanggal_tampil || a.tanggal),
          badge: this.formatRupiah(effUdp),
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-extrabold',
          detailText: 'Review UDP: ' + (a.status_udp || 'Menunggu Review PM'),
          agendaObj: a
        };
      });
    } else if (this.activeCardType === 'sisa_saldo') {
      let cards = this.paguOverview.cards;
      if (q) {
        cards = cards.filter(c => c.nickname.toLowerCase().includes(q) || c.koordinator.toLowerCase().includes(q));
      }
      return cards.map(c => ({
        title: c.nickname,
        subtitle: 'PIC: ' + c.koordinator,
        badge: this.formatRupiah(c.sisaSaldo),
        badgeClass: c.isOverBudget ? 'bg-rose-600 text-white border-rose-700 font-extrabold' : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold',
        detailText: 'Pagu: ' + this.formatRupiah(c.pagu) + ' | Terpakai: ' + this.formatRupiah(c.realisasiSelesai + c.danaTerkunci),
        isOver: c.isOverBudget,
        rawObject: c
      }));
    }
    return [];
  },

  handleCardDrawerItemClick(item) {
    if (item.agendaObj) {
      this.openCardDrawer = false;
      this.viewAgenda(item.agendaObj);
    } else if (item.rawObject) {
      this.openCardDrawer = false;
      this.selectSingleProject(item.rawObject.id_proyek);
    }
  }
};