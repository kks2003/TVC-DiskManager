export type DiskSystemType = 'UPM' | 'DOS';

export interface DiskFormat {
  id: string;
  system: DiskSystemType;
  name: string;
  tracks: number;          // cilinder/sáv száma (pl. 80)
  heads: number;           // oldalak/fejek száma (pl. 2)
  sectorsPerTrack: number; // 9
  bytesPerSector: number;  // 512
  trackOffset: number;     // UPM: 4, DOS: 0
  blockSize: number;       // UPM: 2048, DOS klaszterméret: pl. 1024
  dirBlocks: number;       // 2
  maxDirEntries: number;   // 128 (UPM) vagy 112/224 (DOS)
  totalBlocks: number;     // 351 (UPM)
  totalSize: number;       // 737280
}

export const DISK_FORMATS: Record<string, DiskFormat> = {
  '96tpi_ds': {
    id: '96tpi_ds',
    system: 'UPM',
    name: 'UPM 96 TPI Kétoldalas (720 KB) - TVC Standard',
    tracks: 80,
    heads: 2,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 4,
    blockSize: 2048,
    dirBlocks: 2,
    maxDirEntries: 128,
    totalBlocks: 351,
    totalSize: 737280
  },
  'vtdos_720k': {
    id: 'vtdos_720k',
    system: 'DOS',
    name: 'VT-DOS / FAT12 Kétoldalas (720 KB) - Hierarchikus',
    tracks: 80,
    heads: 2,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 0,
    blockSize: 1024,
    dirBlocks: 0,
    maxDirEntries: 112,
    totalBlocks: 713,
    totalSize: 737280
  },
  'vtdos_360k': {
    id: 'vtdos_360k',
    system: 'DOS',
    name: 'VT-DOS / FAT12 Kétoldalas (360 KB) - Hierarchikus',
    tracks: 40,
    heads: 2,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 0,
    blockSize: 1024,
    dirBlocks: 0,
    maxDirEntries: 112,
    totalBlocks: 350,
    totalSize: 368640
  },
  '48tpi_ss': {
    id: '48tpi_ss',
    system: 'UPM',
    name: 'UPM 48 TPI Egyoldalas (180 KB)',
    tracks: 40,
    heads: 1,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 4,
    blockSize: 2048,
    dirBlocks: 2,
    maxDirEntries: 64,
    totalBlocks: 81,
    totalSize: 184320
  },
  '48tpi_ds': {
    id: '48tpi_ds',
    system: 'UPM',
    name: 'UPM 48 TPI Kétoldalas (360 KB)',
    tracks: 40,
    heads: 2,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 4,
    blockSize: 2048,
    dirBlocks: 2,
    maxDirEntries: 128,
    totalBlocks: 171,
    totalSize: 368640
  },
  '96tpi_ss': {
    id: '96tpi_ss',
    system: 'UPM',
    name: 'UPM 96 TPI Egyoldalas (360 KB)',
    tracks: 80,
    heads: 1,
    sectorsPerTrack: 9,
    bytesPerSector: 512,
    trackOffset: 4,
    blockSize: 2048,
    dirBlocks: 2,
    maxDirEntries: 128,
    totalBlocks: 171,
    totalSize: 368640
  }
};

export interface RawDirEntry {
  index: number;
  offset: number;
  user: number;
  name: string;
  ext: string;
  fullName: string;
  ex: number;
  s1: number;
  s2: number;
  extentIndex: number;
  rc: number;
  blocks: number[];
  isReadOnly: boolean;
  isSystem: boolean;
  isArchive: boolean;
  isDeleted: boolean;
  rawBytes: Uint8Array;
}

export interface CasInfo {
  fileType: number;       // 0x11 = nem pufferelt, 0x01 = pufferelt
  copyProtected: boolean; // byte 1 != 0
  numBlocks: number;      // 128-bájtos blokkok száma
  lastBlockLen: number;   // utolsó blokk hasznos bájtjai (1..128)
  exactLength: number;    // kiszámított pontos fájlhossz a fejléc alapján
  hasProgramHeader: boolean;
  headerOffset?: number;  // 128 (CAS tape után) vagy 0 (közvetlen programfejléc)
  programType?: number;   // 0x00 / 0x01 program
  programLength?: number; // 2 bájt
  autoStart?: boolean;    // 0xFF
  comment?: string;
}

export interface UpmFile {
  user: number;
  name: string;
  ext: string;
  fullName: string;
  totalRecords: number;
  logicalBytes: number;   // totalRecords * 128
  allocatedBytes: number; // blocks.length * blockSize
  exactBytes: number;     // ha CAS, akkor exactLength, egyébként logicalBytes
  blocks: number[];
  entries: RawDirEntry[];
  diskOrder: number;      // Eredeti katalógus pozíció
  isReadOnly: boolean;
  isSystem: boolean;
  isCas: boolean;
  casInfo?: CasInfo;
}

export interface BlockStatus {
  index: number;
  type: 'system' | 'directory' | 'used' | 'free';
  fileOwner?: string;
  user?: number;
}

export interface FatFileInfo {
  name: string;
  ext: string;
  fullName: string;
  path: string;           // pl. "\" vagy "\UTIL"
  size: number;           // bájtban
  firstCluster: number;
  isDirectory: boolean;
  diskOrder: number;      // Eredeti könyvtár pozíció
  isReadOnly: boolean;
  isHidden: boolean;
  isSystem: boolean;
  isArchive: boolean;
  dateTime: string;
  clusterChain: number[];
  isCas: boolean;
  casInfo?: CasInfo;
}
