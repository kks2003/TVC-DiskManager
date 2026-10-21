import { UpmDisk } from './upm_disk.js';
import { FatDisk } from './fat_disk.js';
import { UpmFile, FatFileInfo, DiskSystemType, DISK_FORMATS } from './types.js';
import { SimpleZip } from './zip_writer.js';
import { CasParser } from './cas_parser.js';

// Univerzális, kristálytiszta SVG ikonok (nem fognak "i" betűnek kinézni semmilyen böngészőben)
const ICON_DOWNLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_VIEW = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_RENAME = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
const ICON_DELETE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
const ICON_FOLDER = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

export class UpmApp {
  private activeSystem: DiskSystemType = 'UPM';
  private disk: UpmDisk;
  private fatDisk: FatDisk;

  private currentFilter: string = '';
  private currentUserFilter: string = 'all';
  private selectedFiles: Set<string> = new Set();
  private highlightedBlocks: Set<number> = new Set();

  // Rendezési állapot: 'original' az alapértelmezett (ahogy a lemezen van!)
  private sortMode: 'original' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc' = 'original';

  private activeViewerFile: { name: string; user?: number; isCas?: boolean; casInfo?: any; isDirectory?: boolean } | null = null;
  private viewerTab: 'hex' | 'text' | 'cas' = 'hex';

  constructor() {
    this.disk = new UpmDisk();
    this.fatDisk = new FatDisk();
  }

  public init(): void {
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    // Fájl megnyitás
    const fileInput = document.getElementById('disk-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) this.loadDiskFile(file);
      });
    }

    // Új lemez gomb
    const btnNewDisk = document.getElementById('btn-new-disk');
    if (btnNewDisk) {
      btnNewDisk.addEventListener('click', () => this.showModal('modal-new-disk'));
    }

    // Új lemez form jóváhagyás
    const btnConfirmNewDisk = document.getElementById('btn-confirm-new-disk');
    if (btnConfirmNewDisk) {
      btnConfirmNewDisk.addEventListener('click', () => {
        const fmtSelect = document.getElementById('new-disk-format') as HTMLSelectElement;
        const nameInput = document.getElementById('new-disk-name') as HTMLInputElement;
        const formatId = fmtSelect ? fmtSelect.value : '96tpi_ds';
        const name = nameInput && nameInput.value ? nameInput.value.trim() : 'UJ_LEMEZ.IMG';

        const fmt = DISK_FORMATS[formatId];
        if (fmt && fmt.system === 'DOS') {
          this.activeSystem = 'DOS';
          this.fatDisk.createNew(formatId, name);
        } else {
          this.activeSystem = 'UPM';
          this.disk.createNew(formatId, name);
        }

        this.selectedFiles.clear();
        this.highlightedBlocks.clear();
        this.sortMode = 'original';
        this.hideModal('modal-new-disk');
        this.render();
        this.showNotification(`Új ${this.activeSystem} lemez létrehozva: ${name}`, 'success');
      });
    }

    // Lemez mentése gomb
    const btnSaveDisk = document.getElementById('btn-save-disk');
    if (btnSaveDisk) {
      btnSaveDisk.addEventListener('click', () => this.saveDiskFile());
    }

    // Fájl feltöltése a lemezre gomb
    const fileUploadInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileUploadInput) {
      fileUploadInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          this.handleUploadFiles(Array.from(files));
        }
      });
    }

    // Új mappa létrehozása gomb (DOS módban)
    const btnNewFolder = document.getElementById('btn-new-folder');
    if (btnNewFolder) {
      btnNewFolder.addEventListener('click', () => this.promptNewFolder());
    }

    // Lemez defragmentálása gomb
    const btnDefragDisk = document.getElementById('btn-defrag-disk');
    if (btnDefragDisk) {
      btnDefragDisk.addEventListener('click', () => this.handleDefrag());
    }

    // Lemeznév (.IMG / .DSK) átnevezése kattintásra
    const diskTitleEl = document.getElementById('disk-title');
    if (diskTitleEl) {
      diskTitleEl.style.cursor = 'pointer';
      diskTitleEl.title = 'Kattints a lemezképfájl (.img / .dsk) átnevezéséhez';
      diskTitleEl.addEventListener('click', () => this.promptRenameDiskImage());
    }

    // Kötetnév (Volume label) szerkesztése gomb (DOS módban)
    const btnEditLabel = document.getElementById('btn-edit-label');
    if (btnEditLabel) {
      btnEditLabel.addEventListener('click', () => this.promptEditVolumeLabel());
    }

    // Drag and drop a lemezre és a fájlokra
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      document.body.classList.add('drag-active');
    });

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) {
        document.body.classList.remove('drag-active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      document.body.classList.remove('drag-active');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const lowerName = files[0].name.toLowerCase();
        if (files.length === 1 && (lowerName.endsWith('.img') || lowerName.endsWith('.dsk'))) {
          this.loadDiskFile(files[0]);
        } else {
          this.handleUploadFiles(Array.from(files));
        }
      }
    });

    // Kereső mező
    const searchInput = document.getElementById('search-filter') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.currentFilter = (e.target as HTMLInputElement).value.toLowerCase().trim();
        this.updateFilterUI();
        this.renderFileList();
      });
    }

    // User szűrő (UPM módban)
    const userSelect = document.getElementById('user-filter') as HTMLSelectElement;
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        this.currentUserFilter = (e.target as HTMLSelectElement).value;
        this.renderFileList();
      });
    }

    // Rendezés gomb a szűrősávban
    const btnSortSelector = document.getElementById('btn-sort-selector');
    if (btnSortSelector) {
      btnSortSelector.addEventListener('click', () => this.cycleSortMode());
    }

    // Fejléc oszlopokra kattintás a rendezéshez
    const thName = document.getElementById('th-col-name');
    if (thName) {
      thName.addEventListener('click', () => {
        if (this.sortMode === 'original') this.sortMode = 'name-asc';
        else if (this.sortMode === 'name-asc') this.sortMode = 'name-desc';
        else this.sortMode = 'original';
        this.renderFileList();
        this.updateSortIndicator();
      });
    }

    const thSize = document.getElementById('th-col-size');
    if (thSize) {
      thSize.addEventListener('click', () => {
        if (this.sortMode === 'original') this.sortMode = 'size-asc';
        else if (this.sortMode === 'size-asc') this.sortMode = 'size-desc';
        else this.sortMode = 'original';
        this.renderFileList();
        this.updateSortIndicator();
      });
    }

    // Szűrés visszaállítása gombok
    const btnResetFilter = document.getElementById('btn-reset-filter');
    if (btnResetFilter) btnResetFilter.addEventListener('click', () => this.clearFilter());
    const bannerResetBtn = document.getElementById('filter-banner-reset');
    if (bannerResetBtn) bannerResetBtn.addEventListener('click', () => this.clearFilter());
    const mapResetBtn = document.getElementById('map-reset-filter');
    if (mapResetBtn) mapResetBtn.addEventListener('click', () => this.clearFilter());

    // Tömeges letöltés (ZIP)
    const btnDownloadSelected = document.getElementById('btn-download-selected');
    if (btnDownloadSelected) {
      btnDownloadSelected.addEventListener('click', () => this.downloadSelectedFiles());
    }

    // Tömeges törlés
    const btnDeleteSelected = document.getElementById('btn-delete-selected');
    if (btnDeleteSelected) {
      btnDeleteSelected.addEventListener('click', () => this.deleteSelectedFiles());
    }

    // Mind kijelölése checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (this.activeSystem === 'UPM') {
          const files = this.getVisibleUpmFiles();
          if (checked) {
            files.forEach(f => this.selectedFiles.add(`${f.user}:${f.fullName}`));
          } else {
            files.forEach(f => this.selectedFiles.delete(`${f.user}:${f.fullName}`));
          }
        } else {
          const files = this.getVisibleDosFiles().filter(f => !f.isDirectory);
          if (checked) {
            files.forEach(f => this.selectedFiles.add(f.fullName));
          } else {
            files.forEach(f => this.selectedFiles.delete(f.fullName));
          }
        }
        this.renderFileList();
      });
    }

    // Modal bezáró gombok
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = (e.target as HTMLElement).closest('.modal');
        if (modal) modal.classList.remove('active');
      });
    });

    // Viewer tab gombok
    document.querySelectorAll('.viewer-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).getAttribute('data-tab') as 'hex' | 'text' | 'cas';
        if (target) {
          this.viewerTab = target;
          this.renderViewerContent();
        }
      });
    });
  }

  private cycleSortMode(): void {
    const modes: ('original' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc')[] = [
      'original',
      'name-asc',
      'name-desc',
      'size-asc',
      'size-desc'
    ];
    const curIdx = modes.indexOf(this.sortMode);
    this.sortMode = modes[(curIdx + 1) % modes.length];
    this.updateSortIndicator();
    this.renderFileList();
  }

  private updateSortIndicator(): void {
    const btn = document.getElementById('btn-sort-selector');
    if (!btn) return;
    const labels: Record<string, string> = {
      'original': 'Rendezés: Eredeti lemezsorrend',
      'name-asc': 'Rendezés: Név (A → Z)',
      'name-desc': 'Rendezés: Név (Z → A)',
      'size-asc': 'Rendezés: Méret (Növekvő)',
      'size-desc': 'Rendezés: Méret (Csökkenő)'
    };
    btn.textContent = labels[this.sortMode] || 'Rendezés';

    const thName = document.getElementById('th-col-name');
    if (thName) {
      if (this.sortMode === 'name-asc') thName.textContent = 'Fájlnév ▴';
      else if (this.sortMode === 'name-desc') thName.textContent = 'Fájlnév ▾';
      else thName.textContent = 'Fájlnév';
    }

    const thSize = document.getElementById('th-col-size');
    if (thSize) {
      if (this.sortMode === 'size-asc') thSize.textContent = 'Pontos méret ▴';
      else if (this.sortMode === 'size-desc') thSize.textContent = 'Pontos méret ▾';
      else thSize.textContent = 'Pontos méret';
    }
  }

  public loadDiskFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuf = e.target?.result as ArrayBuffer;
        if (!arrayBuf) return;
        const bytes = new Uint8Array(arrayBuf);

        if (FatDisk.isFatImage(bytes)) {
          this.activeSystem = 'DOS';
          this.fatDisk.load(bytes, file.name);
          this.showNotification(`VT-DOS / FAT12 lemezkép felismerve: ${file.name}!`, 'success');
        } else {
          this.activeSystem = 'UPM';
          this.disk.load(bytes, file.name);
          this.showNotification(`UPM (CP/M 2.2) lemezkép felismerve: ${file.name}!`, 'success');
        }

        this.selectedFiles.clear();
        this.highlightedBlocks.clear();
        this.currentFilter = '';
        this.sortMode = 'original';
        const searchInput = document.getElementById('search-filter') as HTMLInputElement;
        if (searchInput) searchInput.value = '';

        this.render();
      } catch (err: any) {
        this.showNotification(`Hiba a lemezkép betöltésekor: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  private saveDiskFile(): void {
    try {
      const data = this.activeSystem === 'DOS' ? this.fatDisk.saveImage() : this.disk.saveImage();
      const diskName = this.activeSystem === 'DOS' ? this.fatDisk.getDiskName() : this.disk.getDiskName();
      const blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = diskName || 'LEMEZ.IMG';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showNotification(`Lemezkép kimentve: ${a.download}`, 'success');
    } catch (err: any) {
      this.showNotification(`Mentési hiba: ${err.message}`, 'error');
    }
  }

  private handleUploadFiles(files: File[]): void {
    let successCount = 0;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuf = e.target?.result as ArrayBuffer;
          if (!arrayBuf) return;
          const bytes = new Uint8Array(arrayBuf);

          if (this.activeSystem === 'DOS') {
            this.fatDisk.writeFile(file.name, bytes);
            successCount++;
            this.render();
            this.showNotification(`Fájl felmásolva a VT-DOS lemezre: ${file.name} (${bytes.length} bájt)`, 'success');
          } else {
            const targetUser = this.currentUserFilter === 'all' ? 0 : parseInt(this.currentUserFilter, 10);
            this.disk.writeFile(file.name, bytes, targetUser, true);
            successCount++;
            this.render();
            this.showNotification(`Fájl felmásolva az UPM lemezre: [User ${targetUser}] ${file.name} (${bytes.length} bájt)`, 'success');
          }
        } catch (err: any) {
          this.showNotification(`Hiba ${file.name} feltöltésekor: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  public promptNewFolder(): void {
    if (this.activeSystem !== 'DOS') return;
    const name = window.prompt("Adja meg az új könyvtár nevét (max. 8 karakter, pl. UTIL):", "");
    if (!name || !name.trim()) return;

    try {
      this.fatDisk.createDirectory(name.trim());
      this.render();
      this.showNotification(`Új könyvtár létrehozva: ${name.trim().toUpperCase()}`, 'success');
    } catch (err: any) {
      this.showNotification(`Hiba a könyvtár létrehozásakor: ${err.message}`, 'error');
    }
  }

  public promptRenameDiskImage(): void {
    const currentName = this.activeSystem === 'DOS' ? this.fatDisk.getDiskName() : this.disk.getDiskName();
    const newName = window.prompt("Adja meg a lemezképfájl nevét (.IMG vagy .DSK kiterjesztéssel):", currentName);
    if (newName !== null && newName.trim() !== '') {
      let trimmed = newName.trim();
      if (!trimmed.toLowerCase().endsWith('.img') && !trimmed.toLowerCase().endsWith('.dsk')) {
        trimmed += '.img';
      }
      if (this.activeSystem === 'DOS') {
        this.fatDisk.setDiskName(trimmed);
      } else {
        this.disk.setDiskName(trimmed);
      }
      this.render();
      this.showNotification(`Lemezfájl átnevezve: ${trimmed}`, 'success');
    }
  }

  public handleDefrag(): void {
    const sortLabels: Record<string, string> = {
      'original': 'Eredeti lemezsorrend',
      'name-asc': 'Név szerint növekvő (A → Z)',
      'name-desc': 'Név szerint csökkenő (Z → A)',
      'size-asc': 'Méret szerint növekvő',
      'size-desc': 'Méret szerint csökkenő'
    };
    const currentSortLabel = sortLabels[this.sortMode] || 'Eredeti lemezsorrend';

    const confirmed = confirm(
      `Biztosan defragmentálni és rendezni szeretnéd a lemezt?\n\n` +
      `Alkalmazott rendezési szempont: ${currentSortLabel}\n\n` +
      `A művelet során:\n` +
      `• Minden fájl és mappa adatai folytonosan, töredezettségmentesen kerülnek a lemezre.\n` +
      `• A katalógusbejegyzések az aktuális rendezés (${currentSortLabel}) szerint lesznek sorba rendezve.\n` +
      `• A szabad terület egybefüggően a lemez végére kerül.\n\n` +
      `Szeretnéd végrehajtani a defragmentálást?`
    );
    if (!confirmed) return;

    try {
      if (this.activeSystem === 'UPM') {
        this.disk.defragment(this.sortMode);
      } else {
        this.fatDisk.defragment(this.sortMode);
      }
      this.selectedFiles.clear();
      this.highlightedBlocks.clear();
      this.sortMode = 'original';
      this.updateSortIndicator();
      this.render();
      this.showNotification(`A lemez sikeresen defragmentálva és újrarendezve (${currentSortLabel})!`, 'success');
    } catch (err: any) {
      this.showNotification(`Defragmentálási hiba: ${err.message}`, 'error');
    }
  }

  public promptEditVolumeLabel(): void {
    if (this.activeSystem !== 'DOS') return;
    const current = this.fatDisk.getVolumeLabel() || 'TVC_DISC';
    const newLabel = window.prompt("Adja meg a lemez új kötetnevét / címkéjét (max. 11 karakter):", current);
    if (newLabel !== null && newLabel.trim() !== '') {
      try {
        this.fatDisk.setVolumeLabel(newLabel.trim());
        this.render();
        this.showNotification(`Kötetnév módosítva: ${newLabel.trim().toUpperCase()}`, 'success');
      } catch (err: any) {
        this.showNotification(`Hiba a kötetnév módosításakor: ${err.message}`, 'error');
      }
    }
  }

  public clearFilter(): void {
    this.currentFilter = '';
    const searchInput = document.getElementById('search-filter') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
    this.updateFilterUI();
    this.renderFileList();
    this.clearBlockHighlights();
    this.showNotification('Szűrés törölve, teljes lista megjelenítve.', 'success');
  }

  private updateFilterUI(): void {
    const hasFilter = this.currentFilter !== '';
    const btnResetFilter = document.getElementById('btn-reset-filter');
    if (btnResetFilter) btnResetFilter.style.display = hasFilter ? 'inline-flex' : 'none';

    const banner = document.getElementById('filter-active-banner');
    const bannerText = document.getElementById('filter-banner-text');
    if (banner && bannerText) {
      if (hasFilter) {
        banner.style.display = 'flex';
        bannerText.textContent = `Aktív szűrés: "${this.currentFilter.toUpperCase()}"`;
      } else {
        banner.style.display = 'none';
      }
    }

    const mapResetBtn = document.getElementById('map-reset-filter');
    if (mapResetBtn) mapResetBtn.style.display = hasFilter ? 'inline-flex' : 'none';
  }

  public render(): void {
    this.renderHeaderInfo();
    this.updateFilterUI();
    this.updateSortIndicator();
    this.renderFileList();
    this.renderBlockMap();
  }

  private renderHeaderInfo(): void {
    const diskNameEl = document.getElementById('disk-title');
    const diskFormatEl = document.getElementById('disk-format-badge');
    const systemBadgeEl = document.getElementById('system-mode-badge');
    const userSelectContainer = document.getElementById('user-filter');
    const dosFolderBar = document.getElementById('dos-folder-bar');
    const btnNewFolderSidebar = document.getElementById('btn-new-folder');
    const volumeLabelBox = document.getElementById('dos-volume-box');
    const volumeLabelText = document.getElementById('dos-volume-text');

    if (this.activeSystem === 'DOS') {
      const name = this.fatDisk.getDiskName();
      if (diskNameEl) diskNameEl.textContent = name;
      if (diskFormatEl) diskFormatEl.textContent = this.fatDisk.getFormat().name;
      if (systemBadgeEl) {
        systemBadgeEl.textContent = 'VT-DOS (FAT12)';
        systemBadgeEl.className = 'badge badge-com';
      }

      // Kötetnév megjelenítése
      const vol = this.fatDisk.getVolumeLabel();
      if (volumeLabelBox) volumeLabelBox.style.display = 'flex';
      if (volumeLabelText) volumeLabelText.textContent = vol || '(Nincs címke)';

      const files = this.fatDisk.listCurrentDirectory();
      const freeClusters = this.fatDisk.getFreeClustersCount();
      const totalClusters = this.fatDisk.getTotalClustersCount();
      const clusterKb = this.fatDisk.getClusterSize() / 1024;
      const freeKb = freeClusters * clusterKb;
      const totalKb = totalClusters * clusterKb;

      const elFilesCount = document.getElementById('stat-files-count');
      if (elFilesCount) elFilesCount.textContent = files.length.toString();

      const elFreeSpace = document.getElementById('stat-free-space');
      if (elFreeSpace) elFreeSpace.textContent = `${freeKb} KB / ${totalKb} KB`;

      const elUsedBlocks = document.getElementById('stat-used-blocks');
      if (elUsedBlocks) elUsedBlocks.textContent = `${totalClusters - freeClusters} / ${totalClusters} klaszter`;

      const elCatalogEntries = document.getElementById('stat-catalog-entries');
      if (elCatalogEntries) elCatalogEntries.textContent = `Mappa: ${this.fatDisk.getCurrentPath()}`;

      if (userSelectContainer) userSelectContainer.style.display = 'none';
      if (dosFolderBar) dosFolderBar.style.display = 'flex';
      if (btnNewFolderSidebar) btnNewFolderSidebar.style.display = 'inline-flex';

      const currentPathEl = document.getElementById('current-path-display');
      if (currentPathEl) currentPathEl.textContent = this.fatDisk.getCurrentPath();
    } else {
      const fmt = this.disk.getFormat();
      const files = this.disk.getFiles();
      const freeBlocks = this.disk.getFreeBlockIndices().length;
      const totalBlocks = fmt.totalBlocks - fmt.dirBlocks;
      const usedBlocks = totalBlocks - freeBlocks;
      const freeKb = freeBlocks * (fmt.blockSize / 1024);
      const totalKb = totalBlocks * (fmt.blockSize / 1024);
      const rawEntries = this.disk.getRawEntries();
      const usedEntries = rawEntries.filter(e => !e.isDeleted).length;

      if (diskNameEl) diskNameEl.textContent = this.disk.getDiskName();
      if (diskFormatEl) diskFormatEl.textContent = fmt.name;
      if (systemBadgeEl) {
        systemBadgeEl.textContent = 'UPM (CP/M 2.2)';
        systemBadgeEl.className = 'badge badge-tvc';
      }

      if (volumeLabelBox) volumeLabelBox.style.display = 'none';

      const elFilesCount = document.getElementById('stat-files-count');
      if (elFilesCount) elFilesCount.textContent = files.length.toString();

      const elFreeSpace = document.getElementById('stat-free-space');
      if (elFreeSpace) elFreeSpace.textContent = `${freeKb} KB / ${totalKb} KB`;

      const elUsedBlocks = document.getElementById('stat-used-blocks');
      if (elUsedBlocks) elUsedBlocks.textContent = `${usedBlocks} / ${totalBlocks} blokk`;

      const elCatalogEntries = document.getElementById('stat-catalog-entries');
      if (elCatalogEntries) elCatalogEntries.textContent = `${usedEntries} / ${fmt.maxDirEntries}`;

      if (userSelectContainer) userSelectContainer.style.display = 'inline-block';
      if (dosFolderBar) dosFolderBar.style.display = 'none';
      if (btnNewFolderSidebar) btnNewFolderSidebar.style.display = 'none';
    }
  }

  private getVisibleUpmFiles(): UpmFile[] {
    const list = this.disk.getFiles().filter(f => {
      const matchText = this.currentFilter === '' ||
        f.fullName.toLowerCase().includes(this.currentFilter) ||
        f.ext.toLowerCase().includes(this.currentFilter);
      const matchUser = this.currentUserFilter === 'all' || f.user.toString() === this.currentUserFilter;
      return matchText && matchUser;
    });

    // Rendezés alkalmazása
    if (this.sortMode === 'original') {
      list.sort((a, b) => a.diskOrder - b.diskOrder);
    } else if (this.sortMode === 'name-asc') {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (this.sortMode === 'name-desc') {
      list.sort((a, b) => b.fullName.localeCompare(a.fullName));
    } else if (this.sortMode === 'size-asc') {
      list.sort((a, b) => a.exactBytes - b.exactBytes);
    } else if (this.sortMode === 'size-desc') {
      list.sort((a, b) => b.exactBytes - a.exactBytes);
    }

    return list;
  }

  private getVisibleDosFiles(): FatFileInfo[] {
    const list = this.fatDisk.listCurrentDirectory().filter(f => {
      if (f.fullName === '.') return false;
      const matchText = this.currentFilter === '' ||
        f.fullName.toLowerCase().includes(this.currentFilter) ||
        f.ext.toLowerCase().includes(this.currentFilter);
      return matchText;
    });

    // Rendezés alkalmazása (a mappák mindig elöl maradnak)
    list.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      if (this.sortMode === 'original') {
        return a.diskOrder - b.diskOrder;
      } else if (this.sortMode === 'name-asc') {
        return a.fullName.localeCompare(b.fullName);
      } else if (this.sortMode === 'name-desc') {
        return b.fullName.localeCompare(a.fullName);
      } else if (this.sortMode === 'size-asc') {
        return a.size - b.size;
      } else if (this.sortMode === 'size-desc') {
        return b.size - a.size;
      }
      return 0;
    });

    return list;
  }

  public renderFileList(): void {
    const tbody = document.getElementById('file-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.activeSystem === 'DOS') {
      this.renderDosFileList(tbody);
    } else {
      this.renderUpmFileList(tbody);
    }
  }

  private renderDosFileList(tbody: HTMLElement): void {
    const files = this.getVisibleDosFiles();

    // Szülőkönyvtár sor ha nem a gyökérben vagyunk
    if (this.fatDisk.getCurrentPath() !== '\\' && this.currentFilter === '') {
      const trUp = document.createElement('tr');
      trUp.className = 'folder-row drop-target-row';
      trUp.innerHTML = `
        <td class="col-check"></td>
        <td class="col-user"><span class="user-pill">DIR</span></td>
        <td class="col-name" style="cursor: pointer; color: var(--accent-tvc-cyan);" colspan="2">
          <strong>📁 .. [Vissza a szülőkönyvtárba]</strong>
        </td>
        <td class="col-type"><span class="badge badge-text">Mappa</span></td>
        <td class="col-size">-</td>
        <td class="col-alloc">-</td>
        <td class="col-attr"><span class="badge badge-sys">DIR</span></td>
        <td class="col-actions">
          <button class="btn-action btn-enter-dir" title="Belépés a szülőkönyvtárba">${ICON_FOLDER} Megnyitás</button>
        </td>
      `;

      trUp.addEventListener('click', () => {
        const p = this.fatDisk.getCurrentPath();
        const lastSlash = p.lastIndexOf('\\');
        const parent = lastSlash <= 0 ? '\\' : p.substring(0, lastSlash);
        this.fatDisk.setCurrentPath(parent);
        this.selectedFiles.clear();
        this.render();
      });

      // Drag & drop drop-target a szülőkönyvtárra (fájl visszahúzása szülőbe!)
      trUp.addEventListener('dragover', (e) => {
        e.preventDefault();
        trUp.classList.add('folder-drag-over');
      });
      trUp.addEventListener('dragleave', () => {
        trUp.classList.remove('folder-drag-over');
      });
      trUp.addEventListener('drop', (e) => {
        e.preventDefault();
        trUp.classList.remove('folder-drag-over');
        const draggedFile = e.dataTransfer?.getData('text/plain');
        if (draggedFile) {
          try {
            this.fatDisk.moveFile(draggedFile, '..');
            this.render();
            this.showNotification(`"${draggedFile}" áthelyezve a szülőkönyvtárba!`, 'success');
          } catch (err: any) {
            this.showNotification(`Hiba a mozgatáskor: ${err.message}`, 'error');
          }
        }
      });

      tbody.appendChild(trUp);
    }

    if (files.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="9" class="empty-state">Ez a könyvtár üres.</td>`;
      tbody.appendChild(tr);
      return;
    }

    for (const f of files) {
      if (f.fullName === '..') continue;

      const tr = document.createElement('tr');
      const fileKey = f.fullName;
      const isSelected = this.selectedFiles.has(fileKey);
      if (isSelected) tr.classList.add('selected');

      if (!f.isDirectory) {
        tr.draggable = true;
        tr.classList.add('draggable-row');
        tr.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', f.fullName);
          tr.classList.add('dragging-file');
        });
        tr.addEventListener('dragend', () => {
          tr.classList.remove('dragging-file');
        });

        tr.addEventListener('mouseenter', () => this.highlightBlocks(f.clusterChain));
        tr.addEventListener('mouseleave', () => this.clearBlockHighlights());
      } else {
        tr.classList.add('folder-row', 'drop-target-row');

        // Drag & drop cél egy alkönyvtárra
        tr.addEventListener('dragover', (e) => {
          e.preventDefault();
          tr.classList.add('folder-drag-over');
        });
        tr.addEventListener('dragleave', () => {
          tr.classList.remove('folder-drag-over');
        });
        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          tr.classList.remove('folder-drag-over');
          const draggedFile = e.dataTransfer?.getData('text/plain');
          if (draggedFile && draggedFile !== f.fullName) {
            try {
              this.fatDisk.moveFile(draggedFile, f.fullName);
              this.render();
              this.showNotification(`"${draggedFile}" áthelyezve a(z) ${f.fullName} mappába!`, 'success');
            } catch (err: any) {
              this.showNotification(`Hiba a mozgatáskor: ${err.message}`, 'error');
            }
          }
        });
      }

      let typeBadge = '';
      if (f.isDirectory) {
        typeBadge = `<span class="badge badge-text">📁 Mappa</span>`;
      } else if (f.isCas || (f.casInfo && f.casInfo.hasProgramHeader)) {
        const autoBadge = f.casInfo?.autoStart
          ? `<span class="badge" style="background:rgba(255,200,0,0.18);color:#ffcc00;border:1px solid #eab308;font-weight:700;" title="AutoRun BEKAPCSOLVA (0xFF - LOAD után azonnal indul)">⚡ RUN</span>`
          : (f.casInfo?.hasProgramHeader ? `<span class="badge badge-raw" title="AutoRun kikapcsolva (0x00)">⚪ NoRun</span>` : '');
        typeBadge = `<span class="badge badge-cas">CAS${f.casInfo?.hasProgramHeader ? ' (PRG)' : ''}</span> ${autoBadge}`;
      } else if (f.ext.toUpperCase() === 'COM' || f.ext.toUpperCase() === 'EXE') {
        typeBadge = `<span class="badge badge-com">${f.ext}</span>`;
      } else {
        typeBadge = `<span class="badge badge-raw">${f.ext || 'BIN'}</span>`;
      }

      const roBadge = f.isReadOnly ? `<span class="badge badge-ro">R/O</span>` : `<span class="badge badge-rw">R/W</span>`;
      const sysBadge = f.isSystem ? `<span class="badge badge-sys">SYS</span>` : '';
      const hidBadge = f.isHidden ? `<span class="badge badge-raw">HID</span>` : '';

      const sizeStr = f.isDirectory ? '-' : `${f.size.toLocaleString()} B`;
      const allocStr = f.isDirectory ? '-' : `${(f.clusterChain.length * (this.fatDisk.getClusterSize() / 1024)).toFixed(0)} KB (${f.clusterChain.length} kl.)`;

      const hasAutoRunSupport = !f.isDirectory && (f.isCas || (f.casInfo && f.casInfo.fileType === 0x11));
      const autoRunBtn = hasAutoRunSupport ? `
        <button class="btn-action btn-autorun" title="${f.casInfo?.autoStart ? 'AutoRun KIKAPCSOLÁSA (0x00)' : 'AutoRun BEKAPCSOLÁSA (0xFF)'}" style="${f.casInfo?.autoStart ? 'color:#ffcc00;font-weight:bold;' : 'color:var(--text-muted);'}">
          ⚡
        </button>
      ` : '';

      const isBrokenCas = f.isCas && f.casInfo && (
        f.casInfo.numBlocks !== Math.floor(f.size / 128) ||
        f.casInfo.lastBlockLen !== (f.size % 128) ||
        (f.casInfo.hasProgramHeader && f.casInfo.programLength !== Math.max(0, f.size - 144))
      );
      const repairBtn = isBrokenCas ? `
        <button class="btn-action btn-repair-cas" title="Hibás CAS fejléc adatok! Kattints a javításhoz (CasRepair / Error 231 fix)" style="color:#ffaa00;font-weight:bold;">
          🛠️
        </button>
      ` : '';

      tr.innerHTML = `
        <td class="col-check">
          ${f.isDirectory ? '' : `<input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''} data-key="${fileKey}">`}
        </td>
        <td class="col-user"><span class="user-pill">${f.isDirectory ? 'DIR' : 'DOS'}</span></td>
        <td class="col-name" style="${f.isDirectory ? 'cursor: pointer; color: var(--accent-tvc-cyan);' : ''}">
          <strong>${f.isDirectory ? '📁 ' : ''}${f.name}</strong>
        </td>
        <td class="col-ext">${f.ext}</td>
        <td class="col-type">${typeBadge}</td>
        <td class="col-size">${sizeStr}</td>
        <td class="col-alloc">${allocStr}</td>
        <td class="col-attr">${roBadge} ${sysBadge} ${hidBadge}</td>
        <td class="col-actions">
          ${f.isDirectory ? `
            <button class="btn-action btn-open-dir" title="Belépés a könyvtárba">${ICON_FOLDER} Megnyitás</button>
            <button class="btn-action btn-del-dir" title="Könyvtár törlése">${ICON_DELETE}</button>
          ` : `
            ${repairBtn}
            ${autoRunBtn}
            <button class="btn-action btn-view" title="Megtekintés">${ICON_VIEW}</button>
            <button class="btn-action btn-download" title="Fájl letöltése">${ICON_DOWNLOAD}</button>
            <button class="btn-action btn-rename" title="Átnevezés">${ICON_RENAME}</button>
            <button class="btn-action btn-delete" title="Törlés">${ICON_DELETE}</button>
          `}
        </td>
      `;

      if (f.isDirectory) {
        const enterDir = () => {
          const newP = this.fatDisk.getCurrentPath() === '\\' ? `\\${f.fullName}` : `${this.fatDisk.getCurrentPath()}\\${f.fullName}`;
          this.fatDisk.setCurrentPath(newP);
          this.selectedFiles.clear();
          this.render();
        };

        tr.querySelector('.col-name')?.addEventListener('click', enterDir);
        tr.querySelector('.btn-open-dir')?.addEventListener('click', enterDir);

        tr.querySelector('.btn-del-dir')?.addEventListener('click', () => {
          if (window.confirm(`Biztosan törli a(z) ${f.fullName} könyvtárat?`)) {
            try {
              this.fatDisk.deleteFile(f.fullName);
              this.render();
              this.showNotification(`Könyvtár törölve: ${f.fullName}`, 'success');
            } catch (err: any) {
              this.showNotification(`Hiba: ${err.message}`, 'error');
            }
          }
        });
      } else {
        const chk = tr.querySelector('.file-checkbox') as HTMLInputElement;
        if (chk) {
          chk.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            if (checked) this.selectedFiles.add(fileKey);
            else this.selectedFiles.delete(fileKey);
            tr.classList.toggle('selected', checked);
          });
        }

        tr.querySelector('.btn-repair-cas')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.repairFileCas(f);
        });
        tr.querySelector('.btn-autorun')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFileAutoRun(f);
        });
        tr.querySelector('.btn-view')?.addEventListener('click', () => this.openViewerDos(f));
        tr.querySelector('.btn-download')?.addEventListener('click', () => this.downloadDosFile(f));
        tr.querySelector('.btn-rename')?.addEventListener('click', () => this.promptRenameDos(f));
        tr.querySelector('.btn-delete')?.addEventListener('click', () => {
          if (window.confirm(`Biztosan törli a(z) ${f.fullName} fájlt?`)) {
            try {
              this.fatDisk.deleteFile(f.fullName);
              this.selectedFiles.delete(fileKey);
              this.render();
              this.showNotification(`Fájl törölve: ${f.fullName}`, 'success');
            } catch (err: any) {
              this.showNotification(`Hiba: ${err.message}`, 'error');
            }
          }
        });
      }

      tbody.appendChild(tr);
    }
  }

  private renderUpmFileList(tbody: HTMLElement): void {
    const visibleFiles = this.getVisibleUpmFiles();

    if (visibleFiles.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            Nincs megjeleníthető fájl a lemezen. Új fájlt az „Fájl másolása a lemezre” gombbal vagy drag&drop módszerrel tölthetsz fel!
          </td>
        </tr>
      `;
      return;
    }

    for (const f of visibleFiles) {
      const tr = document.createElement('tr');
      const fileKey = `${f.user}:${f.fullName}`;
      const isSelected = this.selectedFiles.has(fileKey);
      if (isSelected) tr.classList.add('selected');

      tr.addEventListener('mouseenter', () => this.highlightBlocks(f.blocks));
      tr.addEventListener('mouseleave', () => this.clearBlockHighlights());

      let typeLabel = '';
      if (f.isCas || (f.casInfo && f.casInfo.hasProgramHeader)) {
        if (f.casInfo) {
          const typeStr = f.casInfo.fileType === 0x11 ? 'CAS/Prog' : 'Pufferelt';
          const autoBadge = f.casInfo.autoStart
            ? ` <span class="badge" style="background:rgba(255,200,0,0.18);color:#ffcc00;border:1px solid #eab308;font-weight:700;" title="AutoRun BEKAPCSOLVA (0xFF - LOAD után azonnal indul)">⚡ RUN</span>`
            : (f.casInfo.hasProgramHeader ? ` <span class="badge badge-raw" title="AutoRun kikapcsolva (0x00)">⚪ NoRun</span>` : '');
          typeLabel = `<span class="badge badge-tvc">${typeStr}</span>${autoBadge}`;
        } else {
          typeLabel = `<span class="badge badge-cas">CAS</span>`;
        }
      } else if (f.ext.toUpperCase() === 'COM') {
        typeLabel = `<span class="badge badge-com">COM (UPM)</span>`;
      } else if (['TXT', 'DOC', 'BAS', 'HLP', 'HEX'].includes(f.ext.toUpperCase())) {
        typeLabel = `<span class="badge badge-text">${f.ext}</span>`;
      } else {
        typeLabel = `<span class="badge badge-raw">${f.ext || 'BIN'}</span>`;
      }

      const roBadge = f.isReadOnly
        ? `<span class="badge badge-ro btn-toggle-ro" style="cursor:pointer;" title="Kattints az írhatóvá tételéhez">R/O</span>`
        : `<span class="badge badge-rw btn-toggle-ro" style="cursor:pointer;" title="Kattints az írásvédetté tételéhez">R/W</span>`;
      const sysBadge = f.isSystem
        ? `<span class="badge badge-sys btn-toggle-sys" style="cursor:pointer;" title="Kattints a normál státuszhoz">SYS</span>`
        : `<span class="badge badge-raw btn-toggle-sys" style="cursor:pointer;" title="Kattints a rendszer státuszhoz">DIR</span>`;

      const exactSizeFormatted = f.isCas && f.casInfo
        ? `${f.casInfo.exactLength.toLocaleString()} B`
        : `${f.logicalBytes.toLocaleString()} B`;

      const allocatedFormatted = `${(f.allocatedBytes / 1024).toFixed(0)} KB (${f.blocks.length} blokk)`;

      const hasAutoRunSupport = f.isCas || (f.casInfo && f.casInfo.fileType === 0x11);
      const autoRunBtn = hasAutoRunSupport ? `
        <button class="btn-action btn-autorun" title="${f.casInfo?.autoStart ? 'AutoRun KIKAPCSOLÁSA (0x00)' : 'AutoRun BEKAPCSOLÁSA (0xFF)'}" style="${f.casInfo?.autoStart ? 'color:#ffcc00;font-weight:bold;' : 'color:var(--text-muted);'}">
          ⚡
        </button>
      ` : '';

      const isBrokenCas = f.isCas && f.casInfo && (
        f.casInfo.numBlocks !== Math.floor(f.logicalBytes / 128) ||
        f.casInfo.lastBlockLen !== (f.logicalBytes % 128) ||
        (f.casInfo.hasProgramHeader && f.casInfo.programLength !== Math.max(0, f.logicalBytes - 144))
      );
      const repairBtn = isBrokenCas ? `
        <button class="btn-action btn-repair-cas" title="Hibás CAS fejléc adatok! Kattints a javításhoz (CasRepair / Error 231 fix)" style="color:#ffaa00;font-weight:bold;">
          🛠️
        </button>
      ` : '';

      tr.innerHTML = `
        <td class="col-check">
          <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''} data-key="${fileKey}">
        </td>
        <td class="col-user"><span class="user-pill">${f.user}</span></td>
        <td class="col-name"><strong>${f.name}</strong></td>
        <td class="col-ext">${f.ext}</td>
        <td class="col-type">${typeLabel}</td>
        <td class="col-size" title="Logikai: ${f.logicalBytes} B, Lefoglalt: ${f.allocatedBytes} B">
          ${exactSizeFormatted}
        </td>
        <td class="col-alloc">${allocatedFormatted}</td>
        <td class="col-attr">${roBadge} ${sysBadge}</td>
        <td class="col-actions">
          ${repairBtn}
          ${autoRunBtn}
          <button class="btn-action btn-view" title="Megtekintés">${ICON_VIEW}</button>
          <button class="btn-action btn-download" title="Fájl letöltése">${ICON_DOWNLOAD}</button>
          <button class="btn-action btn-rename" title="Átnevezés">${ICON_RENAME}</button>
          <button class="btn-action btn-delete" title="Törlés">${ICON_DELETE}</button>
        </td>
      `;

      const chk = tr.querySelector('.file-checkbox') as HTMLInputElement;
      chk.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) this.selectedFiles.add(fileKey);
        else this.selectedFiles.delete(fileKey);
        tr.classList.toggle('selected', checked);
      });

      const btnRo = tr.querySelector('.btn-toggle-ro');
      if (btnRo) {
        btnRo.addEventListener('click', () => {
          this.disk.setFileAttributes(f.fullName, f.user, !f.isReadOnly, f.isSystem);
          this.render();
          this.showNotification(`[User ${f.user}] ${f.fullName} módosítva: ${!f.isReadOnly ? 'R/O' : 'R/W'}`, 'success');
        });
      }

      const btnSys = tr.querySelector('.btn-toggle-sys');
      if (btnSys) {
        btnSys.addEventListener('click', () => {
          this.disk.setFileAttributes(f.fullName, f.user, f.isReadOnly, !f.isSystem);
          this.render();
          this.showNotification(`[User ${f.user}] ${f.fullName} módosítva: ${!f.isSystem ? 'SYS' : 'DIR'}`, 'success');
        });
      }

      tr.querySelector('.btn-repair-cas')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.repairFileCas(f);
      });
      tr.querySelector('.btn-autorun')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFileAutoRun(f);
      });
      tr.querySelector('.btn-view')?.addEventListener('click', () => this.openViewerUpm(f));
      tr.querySelector('.btn-download')?.addEventListener('click', () => this.downloadUpmFile(f));
      tr.querySelector('.btn-rename')?.addEventListener('click', () => this.promptRenameUpm(f));
      tr.querySelector('.btn-delete')?.addEventListener('click', () => this.confirmDeleteUpm(f));

      tbody.appendChild(tr);
    }
  }

  public renderBlockMap(): void {
    const container = document.getElementById('block-map-grid');
    if (!container) return;
    container.innerHTML = '';

    const map = this.activeSystem === 'DOS' ? this.fatDisk.getBlockAllocationMap() : this.disk.getBlockAllocationMap();

    for (const b of map) {
      const cell = document.createElement('div');
      cell.className = `block-cell block-${b.type}`;
      cell.setAttribute('data-block', b.index.toString());

      if (this.highlightedBlocks.has(b.index)) {
        cell.classList.add('highlighted');
      }

      let tip = `${this.activeSystem === 'DOS' ? 'Klaszter' : 'Blokk'} #${b.index}`;
      if (b.type === 'directory') {
        tip += ' (Katalógus / FAT)';
      } else if (b.type === 'used') {
        tip += `: ${b.fileOwner} (kattints a szűréshez / visszavonáshoz)`;
        cell.addEventListener('click', () => {
          const searchInput = document.getElementById('search-filter') as HTMLInputElement;
          if (b.fileOwner) {
            if (this.currentFilter.toLowerCase() === b.fileOwner.toLowerCase()) {
              this.clearFilter();
            } else {
              if (searchInput) searchInput.value = b.fileOwner;
              this.currentFilter = b.fileOwner.toLowerCase();
              this.updateFilterUI();
              this.renderFileList();
            }
          }
        });
      } else {
        tip += ' (Szabad - kattints a szűrés törléséhez)';
        cell.addEventListener('click', () => {
          if (this.currentFilter !== '') this.clearFilter();
        });
      }
      cell.title = tip;
      container.appendChild(cell);
    }
  }

  private highlightBlocks(blocks: number[]): void {
    this.highlightedBlocks = new Set(blocks);
    const cells = document.querySelectorAll('.block-cell');
    cells.forEach(c => {
      const blk = parseInt(c.getAttribute('data-block') || '-1', 10);
      c.classList.toggle('highlighted', this.highlightedBlocks.has(blk));
    });
  }

  private clearBlockHighlights(): void {
    this.highlightedBlocks.clear();
    const cells = document.querySelectorAll('.block-cell.highlighted');
    cells.forEach(c => c.classList.remove('highlighted'));
  }

  // --- Megtekintés (Viewer) ---

  public openViewerUpm(file: UpmFile): void {
    this.activeViewerFile = file;
    const titleEl = document.getElementById('viewer-file-title');
    if (titleEl) titleEl.textContent = `[User ${file.user}] ${file.fullName}`;

    if ((file.isCas && file.casInfo) || file.casInfo?.hasProgramHeader) this.viewerTab = 'cas';
    else if (['TXT', 'DOC', 'BAS', 'HLP', 'BAT'].includes(file.ext.toUpperCase())) this.viewerTab = 'text';
    else this.viewerTab = 'hex';

    this.renderViewerContent();
    this.showModal('modal-viewer');
  }

  public openViewerDos(file: FatFileInfo): void {
    this.activeViewerFile = file;
    const titleEl = document.getElementById('viewer-file-title');
    if (titleEl) titleEl.textContent = `${this.fatDisk.getCurrentPath()}\\${file.fullName}`;

    if ((file.isCas && file.casInfo) || file.casInfo?.hasProgramHeader) this.viewerTab = 'cas';
    else if (['TXT', 'DOC', 'BAT', 'HLP', 'BAS'].includes(file.ext.toUpperCase())) this.viewerTab = 'text';
    else this.viewerTab = 'hex';

    this.renderViewerContent();
    this.showModal('modal-viewer');
  }

  private renderViewerContent(): void {
    if (!this.activeViewerFile) return;

    document.querySelectorAll('.viewer-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      btn.classList.toggle('active', tab === this.viewerTab);
    });

    const contentEl = document.getElementById('viewer-body');
    if (!contentEl) return;

    let bytes: Uint8Array;
    if (this.activeSystem === 'DOS') {
      bytes = this.fatDisk.readFile((this.activeViewerFile as FatFileInfo).fullName);
    } else {
      bytes = this.disk.readFile((this.activeViewerFile as any).fullName, this.activeViewerFile.user ?? 0, true);
    }

    if (this.viewerTab === 'hex') {
      contentEl.innerHTML = this.generateHexDump(bytes);
    } else if (this.viewerTab === 'text') {
      const dec = new TextDecoder('latin1');
      contentEl.innerHTML = `<pre class="text-view">${this.escapeHtml(dec.decode(bytes))}</pre>`;
    } else if (this.viewerTab === 'cas') {
      contentEl.innerHTML = this.generateCasInfoView(this.activeViewerFile, bytes);

      // Eseménykezelő az AutoRun gombra a nézőkén belül
      const btnToggleAuto = contentEl.querySelector('#btn-viewer-toggle-autorun');
      if (btnToggleAuto && this.activeViewerFile) {
        btnToggleAuto.addEventListener('click', () => {
          this.toggleFileAutoRun(this.activeViewerFile);
          // Frissítsük az aktív néző fájl adatait
          if (this.activeSystem === 'DOS') {
            const files = this.fatDisk.listCurrentDirectory();
            const updated = files.find(f => f.fullName.toUpperCase() === (this.activeViewerFile as FatFileInfo).fullName.toUpperCase());
            if (updated) this.activeViewerFile = updated;
          } else {
            const files = this.disk.getFiles();
            const updated = files.find(f => f.fullName.toUpperCase() === (this.activeViewerFile as UpmFile).fullName.toUpperCase() && f.user === (this.activeViewerFile as UpmFile).user);
            if (updated) this.activeViewerFile = updated;
          }
          this.renderViewerContent();
        });
      }

      // Eseménykezelő a CasRepair javító gombra a nézőkén belül
      const btnRepairCas = contentEl.querySelector('#btn-viewer-repair-cas');
      if (btnRepairCas && this.activeViewerFile) {
        btnRepairCas.addEventListener('click', () => {
          this.repairFileCas(this.activeViewerFile);
        });
      }
    }
  }

  private generateHexDump(bytes: Uint8Array): string {
    const maxBytes = Math.min(bytes.length, 16384);
    let html = '<div class="hex-dump">';

    for (let offset = 0; offset < maxBytes; offset += 16) {
      const chunk = bytes.subarray(offset, offset + 16);
      const hexArr: string[] = [];
      let asciiStr = '';

      for (let i = 0; i < 16; i++) {
        if (i < chunk.length) {
          const b = chunk[i];
          hexArr.push(b.toString(16).padStart(2, '0').toUpperCase());
          asciiStr += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '·';
        } else {
          hexArr.push('  ');
          asciiStr += ' ';
        }
      }

      const offsetStr = offset.toString(16).padStart(5, '0').toUpperCase();
      const hexStrPart1 = hexArr.slice(0, 8).join(' ');
      const hexStrPart2 = hexArr.slice(8, 16).join(' ');

      html += `<div class="hex-row">
        <span class="hex-offset">${offsetStr}</span>
        <span class="hex-bytes">${hexStrPart1}  ${hexStrPart2}</span>
        <span class="hex-ascii">${this.escapeHtml(asciiStr)}</span>
      </div>`;
    }

    if (bytes.length > maxBytes) {
      html += `<div class="hex-more">... További ${(bytes.length - maxBytes).toLocaleString()} bájt nem jelenik meg ...</div>`;
    }

    html += '</div>';
    return html;
  }

  private generateCasInfoView(file: any, bytes: Uint8Array): string {
    const cas = file.casInfo;
    if (!cas) {
      return `<div class="info-card" style="padding:16px;text-align:center;color:var(--text-muted);">Nem található TVC CAS / program fejléc a fájlban.</div>`;
    }

    const validation = CasParser.validateCasHeader(bytes);
    const tvcCrc16 = CasParser.calculateTvcCrc16(bytes, 0x2927);

    const autoStatusHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
        <span class="info-val" style="color:${cas.autoStart ? '#ffcc00' : '#8c97ab'};font-weight:700;">
          ${cas.autoStart ? '⚡ BEKAPCSOLVA (0xFF - LOAD után azonnal fut)' : '⚪ KIKAPCSOLVA (0x00 - RUN szükséges)'}
        </span>
        <button class="btn btn-secondary" id="btn-viewer-toggle-autorun" style="width:auto;padding:3px 10px;font-size:11.5px;font-weight:600;">
          ${cas.autoStart ? '⚪ AutoRun kikapcsolása' : '⚡ AutoRun bekapcsolása'}
        </button>
      </div>
    `;

    return `
      <div class="cas-info-container">
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Fájltípus:</span>
            <span class="info-val">${cas.fileType === 0x11 ? '0x11 (Nem pufferelt / Gépi kód / Program)' : '0x01 (Pufferelt adat)'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Másolásvédelem:</span>
            <span class="info-val">${cas.copyProtected ? 'Igen (Védett)' : 'Nem védett'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">128-bájtos rekordok száma:</span>
            <span class="info-val">${cas.numBlocks}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Utolsó rekord hasznos mérete:</span>
            <span class="info-val">${cas.lastBlockLen} bájt</span>
          </div>
          <div class="info-item">
            <span class="info-label">Pontos számított hasznos hossz:</span>
            <span class="info-val"><strong>${cas.exactLength.toLocaleString()} bájt</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">TVC Programfejléc:</span>
            <span class="info-val" style="color:${cas.hasProgramHeader ? '#00e676' : 'var(--text-muted)'};font-weight:700;">
              ${cas.hasProgramHeader ? '✓ Érvényes 16-bájtos programfejléc' : 'Nincs programfejléc'}
            </span>
          </div>
          ${cas.hasProgramHeader ? `
            <div class="info-item">
              <span class="info-label">Program mérete (fejlécből):</span>
              <span class="info-val">${cas.programLength ? cas.programLength.toLocaleString() + ' bájt' : '-'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Automatikus indítás (AutoRun):</span>
              ${autoStatusHtml}
            </div>
          ` : `
            <div class="info-item">
              <span class="info-label">Automatikus indítás (AutoRun):</span>
              <div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
                <span class="info-val" style="color:var(--text-muted);">Nincs programfejléc</span>
                <button class="btn btn-secondary" id="btn-viewer-toggle-autorun" style="width:auto;padding:3px 10px;font-size:11.5px;font-weight:600;">
                  ⚡ AutoRun bekapcsolása (fejléc létrehozása)
                </button>
              </div>
            </div>
          `}
        </div>

        <!-- CasRepair / Fejléc épség ellenőrzés és javítás -->
        <div style="margin-top:14px;padding:12px 16px;border-radius:6px;background:${validation.isValid ? 'rgba(0,230,118,0.06)' : 'rgba(255,170,0,0.1)'};border:1px solid ${validation.isValid ? 'rgba(0,230,118,0.3)' : 'rgba(255,170,0,0.4)'};">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <strong style="color:${validation.isValid ? '#00e676' : '#ffaa00'};">
                ${validation.isValid ? '✓ Fejléc adatok szinkronban vannak (CasRepair / Error 231 teszt: OK)' : '⚠️ Hibás CAS fejléc / blokkméret adatok (TVC Error 231 veszély!)'}
              </strong>
              ${validation.issues.length > 0 ? `
                <ul style="font-size:12px;color:#fecdd3;margin-top:6px;padding-left:18px;">
                  ${validation.issues.map((iss: string) => `<li>${this.escapeHtml(iss)}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
            ${!validation.isValid ? `
              <button class="btn btn-primary" id="btn-viewer-repair-cas" style="width:auto;padding:6px 14px;font-size:12px;font-weight:700;">
                🛠️ Fejléc javítása (CasRepair)
              </button>
            ` : ''}
          </div>
        </div>

        <!-- TVC Szalag / Hardver CRC-16 -->
        <div style="margin-top:10px;padding:8px 12px;border-radius:6px;background:#11141c;border:1px solid var(--border-color);font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;">
          <span>TVC Hardveres CRC-16 (MUDDLE: 0x2927): <strong style="color:var(--accent-tvc-cyan);font-family:var(--font-mono);">0x${tvcCrc16.toString(16).toUpperCase().padStart(4, '0')}</strong></span>
          <span>Fájlméret: <strong style="color:#fff;font-family:var(--font-mono);">${bytes.length.toLocaleString()} bájt</strong></span>
        </div>
      </div>
    `;
  }

  public repairFileCas(file: any): void {
    const name = file.fullName || file.name;
    try {
      const res = this.activeSystem === 'DOS'
        ? this.fatDisk.repairFileCasHeader(name)
        : this.disk.repairFileCasHeader(name, file.user ?? 0);

      if (res.repaired) {
        this.render();
        // Frissítsük az aktív néző fájl adatait
        if (this.activeSystem === 'DOS') {
          const files = this.fatDisk.listCurrentDirectory();
          const updated = files.find(f => f.fullName.toUpperCase() === name.toUpperCase());
          if (updated) this.activeViewerFile = updated;
        } else {
          const files = this.disk.getFiles();
          const updated = files.find(f => f.fullName.toUpperCase() === name.toUpperCase() && f.user === (file.user ?? 0));
          if (updated) this.activeViewerFile = updated;
        }
        this.renderViewerContent();
        this.showNotification(`CAS Fejléc sikeresen javítva (CasRepair):\n• ${res.changes.join('\n• ')}`, 'success');
      } else {
        this.showNotification(`A CAS fejléc már helyes és szinkronban van a fájlmérettel.`, 'info');
      }
    } catch (err: any) {
      this.showNotification(`Hiba a CAS fejléc javításakor: ${err.message}`, 'error');
    }
  }

  public toggleFileAutoRun(file: any): void {
    const currentAuto = !!file.casInfo?.autoStart;
    const newAuto = !currentAuto;
    const name = file.fullName || file.name;
    try {
      if (this.activeSystem === 'DOS') {
        this.fatDisk.setFileAutoRun(name, newAuto);
      } else {
        this.disk.setFileAutoRun(name, file.user ?? 0, newAuto);
      }
      this.render();
      this.showNotification(
        `"${name}" AutoRun állapota: ${newAuto ? '⚡ BEKAPCSOLVA (0xFF - Automatikus indítás)' : '⚪ KIKAPCSOLVA (0x00 - Normál betöltés)'}`,
        'success'
      );
    } catch (err: any) {
      this.showNotification(`Hiba az AutoRun beállításakor: ${err.message}`, 'error');
    }
  }

  // --- Letöltés, Átnevezés, Törlés ---

  public downloadUpmFile(file: UpmFile): void {
    try {
      const bytes = this.disk.readFile(file.fullName, file.user, true);
      this.triggerDownload(file.fullName, bytes);
      this.showNotification(`Fájl letöltve: ${file.fullName}`, 'success');
    } catch (err: any) {
      this.showNotification(`Hiba a letöltés során: ${err.message}`, 'error');
    }
  }

  public downloadDosFile(file: FatFileInfo): void {
    try {
      const bytes = this.fatDisk.readFile(file.fullName);
      this.triggerDownload(file.fullName, bytes);
      this.showNotification(`Fájl letöltve: ${file.fullName}`, 'success');
    } catch (err: any) {
      this.showNotification(`Hiba a letöltés során: ${err.message}`, 'error');
    }
  }

  private triggerDownload(fileName: string, bytes: Uint8Array): void {
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public promptRenameUpm(file: UpmFile): void {
    const newName = window.prompt(`Adja meg az új nevet (max. 8+3 karakter, pl. PROG.CAS):`, file.fullName);
    if (!newName || !newName.trim()) return;
    try {
      this.disk.renameFile(file.fullName, newName.trim(), file.user);
      this.render();
      this.showNotification(`Átnevezve: ${file.fullName} -> ${newName.trim().toUpperCase()}`, 'success');
    } catch (err: any) {
      this.showNotification(`Hiba: ${err.message}`, 'error');
    }
  }

  public promptRenameDos(file: FatFileInfo): void {
    const newName = window.prompt(`Adja meg az új nevet (max. 8+3 karakter, pl. DATA.TXT):`, file.fullName);
    if (!newName || !newName.trim()) return;
    try {
      this.fatDisk.renameFile(file.fullName, newName.trim());
      this.render();
      this.showNotification(`Átnevezve: ${file.fullName} -> ${newName.trim().toUpperCase()}`, 'success');
    } catch (err: any) {
      this.showNotification(`Hiba: ${err.message}`, 'error');
    }
  }

  public confirmDeleteUpm(file: UpmFile): void {
    if (window.confirm(`Biztosan törölni kívánja a(z) [User ${file.user}] ${file.fullName} fájlt?`)) {
      try {
        this.disk.deleteFile(file.fullName, file.user);
        this.selectedFiles.delete(`${file.user}:${file.fullName}`);
        this.render();
        this.showNotification(`Fájl törölve: ${file.fullName}`, 'success');
      } catch (err: any) {
        this.showNotification(`Hiba: ${err.message}`, 'error');
      }
    }
  }

  public downloadSelectedFiles(): void {
    if (this.selectedFiles.size === 0) {
      this.showNotification('Nincs kijelölt fájl a letöltéshez!', 'warning');
      return;
    }

    if (this.activeSystem === 'DOS') {
      const filesToDownload = this.fatDisk.listCurrentDirectory().filter(f => !f.isDirectory && this.selectedFiles.has(f.fullName));
      if (filesToDownload.length === 1) {
        this.downloadDosFile(filesToDownload[0]);
        return;
      }
      try {
        const zip = new SimpleZip();
        for (const f of filesToDownload) {
          const bytes = this.fatDisk.readFile(f.fullName);
          zip.addFile(f.fullName, bytes);
        }
        const zipBytes = zip.generate();
        const diskName = (this.fatDisk.getDiskName() || 'VTDOS').replace(/\.[^/.]+$/, '');
        this.triggerDownload(`${diskName}_files.zip`, zipBytes);
        this.showNotification(`${filesToDownload.length} db fájl ZIP-be csomagolva és letöltve!`, 'success');
      } catch (err: any) {
        this.showNotification(`Hiba: ${err.message}`, 'error');
      }
    } else {
      const filesToDownload = this.disk.getFiles().filter(f => this.selectedFiles.has(`${f.user}:${f.fullName}`));
      if (filesToDownload.length === 1) {
        this.downloadUpmFile(filesToDownload[0]);
        return;
      }
      try {
        const zip = new SimpleZip();
        const used = new Set<string>();
        for (const f of filesToDownload) {
          const bytes = this.disk.readFile(f.fullName, f.user, true);
          let n = f.fullName;
          if (used.has(n.toUpperCase())) n = `USER${f.user}_${n}`;
          used.add(n.toUpperCase());
          zip.addFile(n, bytes);
        }
        const zipBytes = zip.generate();
        const diskName = (this.disk.getDiskName() || 'LEMEZ').replace(/\.[^/.]+$/, '');
        this.triggerDownload(`${diskName}_files.zip`, zipBytes);
        this.showNotification(`${filesToDownload.length} db fájl ZIP-be csomagolva és letöltve!`, 'success');
      } catch (err: any) {
        this.showNotification(`Hiba: ${err.message}`, 'error');
      }
    }
  }

  public deleteSelectedFiles(): void {
    if (this.selectedFiles.size === 0) {
      this.showNotification('Nincs kijelölt fájl!', 'warning');
      return;
    }

    if (window.confirm(`Biztosan törölni kívánja a kijelölt ${this.selectedFiles.size} fájlt?`)) {
      let deleted = 0;
      if (this.activeSystem === 'DOS') {
        const names = Array.from(this.selectedFiles);
        for (const fn of names) {
          try {
            this.fatDisk.deleteFile(fn);
            this.selectedFiles.delete(fn);
            deleted++;
          } catch (e) { console.error(e); }
        }
      } else {
        const keys = Array.from(this.selectedFiles);
        for (const k of keys) {
          const [uStr, fn] = k.split(':');
          try {
            this.disk.deleteFile(fn, parseInt(uStr, 10));
            this.selectedFiles.delete(k);
            deleted++;
          } catch (e) { console.error(e); }
        }
      }
      this.render();
      this.showNotification(`${deleted} fájl sikeresen törölve!`, 'success');
    }
  }

  public showModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  public hideModal(id: string): void {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  public showNotification(msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    const notif = document.getElementById('notification-toast');
    if (!notif) return;
    notif.textContent = msg;
    notif.className = `notification-toast show toast-${type}`;
    setTimeout(() => {
      notif.classList.remove('show');
    }, 4000);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
