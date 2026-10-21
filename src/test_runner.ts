// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { UpmDisk } from './upm_disk.js';
import { FatDisk } from './fat_disk.js';
import { CasParser } from './cas_parser.js';

function runTest() {
  console.log("=== UPM & VT-DOS DISK MANAGER & CASREPAIR TEST ===");
  const disk = new UpmDisk();

  // 1. Meglévő UPM lemez teszt
  const testImagePath = path.resolve('../UPM/IMA6.IMG');
  if (fs.existsSync(testImagePath)) {
    console.log(`\n1. Betöltés: ${testImagePath}`);
    const buf = fs.readFileSync(testImagePath);
    disk.load(new Uint8Array(buf), 'IMA6.IMG');

    const files = disk.getFiles();
    console.log(`Katalógus mérete: ${files.length} fájl található.`);
    for (const f of files.slice(0, 10)) {
      console.log(` - [User ${f.user}] ${f.fullName.padEnd(12)} | ${f.logicalBytes.toString().padStart(6)} B | Blokk: ${f.blocks.length} | CAS: ${f.isCas ? (f.casInfo ? `${f.casInfo.exactLength} B (exact)` : 'Igen') : 'Nem'}`);
    }

    // Fájl olvasás
    const target = 'BPIP.CAS';
    console.log(`\n2. Fájl olvasás: ${target}`);
    const fileBytes = disk.readFile(target, 0, true);
    console.log(`Kiolvasott méret (exact CAS): ${fileBytes.length} bájt`);
    const parsedCas = CasParser.parse(fileBytes);
    console.log(`CAS metaadatok:`, parsedCas);
  }

  // 2. Új lemez létrehozása és írás teszt
  console.log(`\n3. Új üres lemez formázása (96 TPI DS 720KB)`);
  const newDisk = new UpmDisk();
  newDisk.createNew('96tpi_ds', 'TEST.IMG');
  console.log(`Új lemez fájlok száma: ${newDisk.getFiles().length}`);
  console.log(`Szabad blokkok száma: ${newDisk.getFreeBlockIndices().length}`);

  // Fájl írás
  console.log(`\n4. Fájl írás az új lemezre`);
  const testData = new TextEncoder().encode("Hello Videoton TVC és UPM operációs rendszer!");
  newDisk.writeFile("HELLOTVC.TXT", testData, 0);
  console.log(`Fájl kiírva. Fájlok száma az új lemezen: ${newDisk.getFiles().length}`);
  const readFile = newDisk.readFile("HELLOTVC.TXT", 0);
  const readText = new TextDecoder().decode(readFile.subarray(0, testData.length));
  console.log(`Visszaolvasott szöveg: "${readText}"`);

  // Átnevezés
  console.log(`\n5. Fájl átnevezése HELLOTVC.TXT -> UDVOZLET.TXT`);
  newDisk.renameFile("HELLOTVC.TXT", "UDVOZLET.TXT", 0);
  console.log(`Átnevezés utáni fájlok:`, newDisk.getFiles().map(f => f.fullName));

  // Törlés
  console.log(`\n6. Fájl törlése: UDVOZLET.TXT`);
  newDisk.deleteFile("UDVOZLET.TXT", 0);
  console.log(`Törlés utáni fájlok száma: ${newDisk.getFiles().length}`);
  console.log(`Szabad blokkok száma újra: ${newDisk.getFreeBlockIndices().length}`);

  // 7. CAS Header Repair & AutoRun teszt
  console.log(`\n7. CAS Header Repair (CasRepair1.0 reverse engineering) teszt`);
  // Létrehozunk egy szimulált hibás CAS fájlt (összesen 300 bájt: 128B CAS fejléc + 16B TVC fejléc + 156B adat)
  const mockCas = new Uint8Array(300);
  mockCas[0] = 0x11; // nem pufferelt
  mockCas[1] = 0x00; // nem másolásvédett
  // Szándékosan rossz blokkszámokat adunk meg
  mockCas[2] = 0; // hibás numBlocks (2 helyett 0)
  mockCas[3] = 0;
  mockCas[4] = 0; // hibás lastBlockLen (44 helyett 0)
  // 16 bájtos TVC fejléc a 128. bájttól
  mockCas[128] = 0x00;
  mockCas[129] = 0x01; // TVC program
  mockCas[130] = 0x00; // hibás programhossz (156 helyett 0)
  mockCas[131] = 0x00;
  mockCas[132] = 0x00; // AutoRun kikapcsolva

  const validationBefore = CasParser.validateCasHeader(mockCas);
  console.log(`Validáció javítás előtt:`, validationBefore);
  if (validationBefore.isValid) {
    throw new Error("A hibás CAS fájlt érvényesnek találta!");
  }

  const repairResult = CasParser.repairCasHeader(mockCas);
  console.log(`Javítási eredmény:`, repairResult);
  const validationAfter = CasParser.validateCasHeader(mockCas);
  console.log(`Validáció javítás után:`, validationAfter);
  if (!validationAfter.isValid) {
    throw new Error("A javítás után sem lett érvényes a fejléc!");
  }
  console.log(`✓ CasRepair sikeres: numBlocks=${mockCas[2]}, lastBlockLen=${mockCas[4]}, progLen=${mockCas[130] | (mockCas[131] << 8)}`);

  // AutoRun kapcsoló teszt
  console.log(`\n8. AutoRun be- és kikapcsolás teszt`);
  CasParser.setAutoRun(mockCas, true);
  if (mockCas[132] !== 0xFF) throw new Error("AutoRun bekapcsolás sikertelen!");
  console.log(`✓ AutoRun bekapcsolva: byte 132 = 0x${mockCas[132].toString(16).toUpperCase()}`);
  CasParser.setAutoRun(mockCas, false);
  if (mockCas[132] !== 0x00) throw new Error("AutoRun kikapcsolás sikertelen!");
  console.log(`✓ AutoRun kikapcsolva: byte 132 = 0x${mockCas[132].toString(16).toUpperCase()}`);

  // TVC CRC-16 teszt
  const tvcCrc = CasParser.calculateTvcCrc16(mockCas, 0x2927);
  console.log(`✓ TVC Hardver CRC-16 kalkuláció: 0x${tvcCrc.toString(16).toUpperCase().padStart(4, '0')}`);

  console.log("\n=== MINDEN TESZT SIKERESEN LEFUTOTT! ===");
}

runTest();
