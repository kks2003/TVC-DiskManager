# Videoton TVC Lemezkezelő (TVC Disk Manager)

[![GitHub Pages](https://img.shields.io/badge/Online%20Webverzi%C3%B3-Megnyit%C3%A1s%20b%C3%B6ng%C3%A9sz%C5%91ben-00d2ff?style=for-the-badge&logo=github)](https://kks2003.github.io/TVC-DiskManager/)

> 🚀 **Közvetlen online futtatás (telepítés nélkül):**  
> 👉 **[https://kks2003.github.io/TVC-DiskManager/](https://kks2003.github.io/TVC-DiskManager/)**

Böngészőben futó, önálló lemezkezelő és karbantartó szoftver a **Videoton TV-Computer (TVC)** hajlékony mágneslemezes képfájljaihoz (**UPM / CP/M 2.2** és **VT-DOS / FAT12**).

A szoftver nem igényel semmilyen telepítést vagy szerveroldali hátteret: a fenti linken azonnal használható online, vagy a letöltött **`TVC_DiskManager.html`** (illetve `index.html`) fájl közvetlenül megnyitható bármilyen webböngészőben (Chrome, Firefox, Edge, Safari), és teljesen offline működik.

---

## Főbb funkciók

### 💾 Lemezformátumok és lemezképek (.IMG / .DSK)
- **Automatikus formátumfelismerés**: Betöltéskor automatikusan megállapítja, hogy UPM (CP/M 2.2) vagy VT-DOS (FAT12) lemezképről van-e szó.
- **Támogatott fizikai geometriák**:
  - **96 TPI Kétoldalas (720 KB)**: 80 pálya, 2 oldal, 9 szektor/pálya, 512 bájt/szektor – a standard TVC formátum
  - **48 TPI Kétoldalas (360 KB)**: 40 pálya, 2 oldal
  - **96 TPI Egyoldalas (360 KB)**: 80 pálya, 1 oldal
  - **48 TPI Egyoldalas (180 KB)**: 40 pálya, 1 oldal
- **Új lemez formázása**: Tetszőleges geometriájú, tiszta UPM vagy VT-DOS lemez létrehozása egyetlen kattintással.
- **Képfájl mentése**: A módosított lemezkép azonnal letölthető `.IMG` vagy `.DSK` formátumban, ami közvetlenül használható emulátorokban (pl. WinTVC, ep128emu) vagy valós hardveren (HxC, Gotek, fizikai floppy).

---

### 📂 VT-DOS (FAT12) funkciók
- **Könyvtárfa kezelése**: Új könyvtárak (mappák) létrehozása, almappák bejárása, törlése.
- **Drag & Drop mappa-áthelyezés**: Fájlok áthelyezése a mappák között egyszerű egérrel való behúzással (a szülőkönyvtár `..` sorára vagy tetszőleges almappa sorára dobva).
- **Kötetnév (Volume Label)**: A lemez címkéjének megjelenítése és közvetlen átírása.

---

### 💼 UPM (CP/M 2.2) funkciók
- **User számok (0–15)** kezelése és szűrése.
- **Extent kezelés**: Automatikus több-extent allokáció 16 KB-nál nagyobb fájlok írásakor és olvasásakor.
- **Attribútumok**: Írásvédettség (Read-Only / R/O) és Rendszer (System / SYS) bitek egykattintásos módosítása.

---

### 🛠️ Fájlműveletek és extrák
- **Feltöltés / Másolás a lemezre**: Gombbal vagy Drag & Drop húzással közvetlenül az asztalról/Intézőből.
- **Letöltés ZIP-be csomagolva**: Több fájl kijelölése esetén egyetlen tömörített `.zip` fájlba csomagolva tölti le a fájlokat.
- **Sorrend és rendezés**:
  - Alapértelmezett **eredeti fizikai lemezsorrend** (ahogy a katalógusban szerepelnek).
  - Rendezés név (A-Z / Z-A) és méret szerint.
- **Lemez Defragmentálás (Defrag)**:
  - Az aktuális rendezési beállítás szerint újraépíti és hézagmentesen egymás után fűzi a fájlok blokkjait/klasztereit a lemezen, megszüntetve a töredezettséget.
- **Interaktív Blokk / Klaszter térkép**:
  - Grafikus áttekintő a lemez lefoglalt és szabad területeiről.
  - A fájllista sorai fölé húzva az egeret a térkép kiemeli a fájlhoz tartozó blokkokat.

---

### ⚡ TVC-specifikus eszközök
- **AutoRun kezelés (`⚡ RUN` / `⚪ NoRun`)**:
  - A 16 bájtos TVC programfejléc 5. bájtjának (`0xFF` / `0x00`) közvetlen írása és olvasása.
  - Egy kattintással be- és kikapcsolható a `LOAD` parancs utáni azonnali programindítás.
- **CasRepair (System Error 231 javító)**:
  - Automatikus integritás-ellenőrzés a CAS 128 bájtos szektorfejlécén és a 16 bájtos TVC programfejlécén.
  - Ha a rekordszámok vagy a tárolt programhossz eltér a valós fájlmérettől (ami TVC-n `System Error 231 (.INTERR)` hibát váltana ki), a felület sárga `🛠️` ikonnal jelez, és egy kattintással szinkronba hozza az értékeket.
- **TVC Hardveres Szalag CRC-16**:
  - A TVC ROM szalagrutinjának (`0xFAF7`, `0x2927` MUDDLE kezdőérték) megfelelő valós idejű ellenőrzőösszeg számítás.
- **Beépített Fájlnézőke (Inspector)**:
  - Hexa dump címzéssel és ASCII oszloppal.
  - Szöveges / BASIC forrás nézet.
  - Részletes TVC CAS / Fejléc diagnosztikai fül.

---

## Fejlesztés és fordítás

A forráskód moduláris TypeScript-ben készült a `src/` mappában.

```bash
# Függőségek telepítése
npm install

# TypeScript fordítás
npm run build

# Tesztek futtatása
npm test

# Önálló, egyfájlos HTML generálása (TVC_DiskManager.html és index.html)
node build_bundle.js
```

---

## Licenc

MIT Licenc - szabadon felhasználható, módosítható és megosztható.
