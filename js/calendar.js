window.AgendaModules = window.AgendaModules || {};

window.AgendaModules.calendar = {
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

  handleUdpInput(val) {
    let cleanNum = parseInt(String(val || '0').replace(/[^0-9]/g, ''), 10) || 0;
    this.form.udp = cleanNum;
    this.form.udp_display = cleanNum > 0 ? cleanNum.toLocaleString('id-ID') : '';
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
  }
};