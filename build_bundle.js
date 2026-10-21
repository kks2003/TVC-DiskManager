import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function buildSingleHtml() {
  const css = `
    :root {
      --bg-dark: #101217;
      --bg-sidebar: #161a24;
      --bg-card: #1b202c;
      --bg-card-hover: #242a3a;
      --bg-input: #0e1117;
      --border-color: #2a3244;
      --text-main: #f0f3f8;
      --text-muted: #8c97ab;
      --accent-tvc-blue: #0088ff;
      --accent-tvc-cyan: #00d2ff;
      --accent-tvc-green: #00e676;
      --accent-tvc-red: #ff3d71;
      --accent-tvc-yellow: #ffaa00;
      --accent-tvc-purple: #9c27b0;
      --font-mono: 'Consolas', 'Courier New', monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: var(--font-sans);
      font-size: 13.5px;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: row;
      overflow-x: hidden;
    }

    body.drag-active {
      outline: 4px dashed var(--accent-tvc-cyan);
      outline-offset: -10px;
    }

    /* Oldalsáv (Sidebar) bal oldalon */
    .app-sidebar {
      width: 320px;
      min-width: 300px;
      background-color: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      overflow-y: auto;
      padding: 20px;
      gap: 20px;
      box-shadow: 2px 0 15px rgba(0, 0, 0, 0.3);
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .tvc-logo {
      background: #202634;
      border: 1px solid #333d52;
      color: #f1f5f9;
      font-weight: 800;
      padding: 7px 12px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 14px;
      letter-spacing: 1px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }

    .brand-text h1 {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }

    .brand-text p {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 3px;
    }

    .sidebar-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    /* Menü gombok a bal oldalon egymás alatt - Letisztult, elegáns stílus */
    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 9px;
      padding: 9px 13px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      border: 1px solid var(--border-color);
      background: #1b202c;
      color: #e2e8f0;
      outline: none;
      user-select: none;
      width: 100%;
      text-align: left;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .btn:hover {
      background: #252b3a;
      border-color: #3e485e;
      color: #ffffff;
    }
    .btn:active {
      background: #161a24;
      transform: translateY(1px);
    }

    /* Kiemelt főgombok - visszafogott grafit/acél */
    .btn-primary {
      background: #263043;
      border-color: #3d4d6b;
      color: #ffffff;
      font-weight: 600;
    }
    .btn-primary:hover {
      background: #303d55;
      border-color: #4f648b;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    /* Mentés gomb - szolid sötét grafit-menta */
    .btn-success {
      background: #1b2523;
      border-color: #2c4038;
      color: #d1fae5;
      font-weight: 600;
    }
    .btn-success:hover {
      background: #23332f;
      border-color: #3b564a;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    /* Másodlagos gombok */
    .btn-secondary {
      background: #171b25;
      border-color: #2a3243;
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #202634;
      border-color: #3b465c;
      color: #ffffff;
    }

    /* Törlés gomb - szolid sötét grafit-bordó */
    .btn-danger {
      background: #251a1d;
      border-color: #45262c;
      color: #fecdd3;
    }
    .btn-danger:hover {
      background: #332024;
      border-color: #61313a;
      color: #ffffff;
    }

    /* Vissza a teljes listához gomb - visszafogott borostyán/grafit */
    .btn-warning-back {
      background: #272118;
      border-color: #4d3d24;
      color: #fde68a;
      font-weight: 600;
    }
    .btn-warning-back:hover {
      background: #362c1e;
      border-color: #6a532f;
      color: #ffffff;
    }

    @keyframes pulseBtn {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .select-field, .input-field {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 9px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .select-field:focus, .input-field:focus {
      border-color: var(--accent-tvc-cyan);
    }

    /* Lemez állapot és statisztikák bal oldalon */
    .sidebar-disk-info {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .disk-header-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .disk-icon { font-size: 26px; }
    .disk-title-group h2 {
      font-size: 15px;
      color: #fff;
      word-break: break-all;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-tvc { background: rgba(0, 210, 255, 0.15); color: var(--accent-tvc-cyan); border: 1px solid rgba(0, 210, 255, 0.3); }
    .badge-cas { background: rgba(0, 230, 118, 0.15); color: var(--accent-tvc-green); border: 1px solid rgba(0, 230, 118, 0.3); }
    .badge-com { background: rgba(255, 170, 0, 0.15); color: var(--accent-tvc-yellow); border: 1px solid rgba(255, 170, 0, 0.3); }
    .badge-text { background: rgba(156, 39, 176, 0.15); color: #d187f5; border: 1px solid rgba(156, 39, 176, 0.3); }
    .badge-raw { background: rgba(139, 149, 168, 0.15); color: var(--text-muted); border: 1px solid rgba(139, 149, 168, 0.3); }
    .badge-ro { background: rgba(255, 61, 113, 0.2); color: var(--accent-tvc-red); }
    .badge-rw { background: rgba(0, 230, 118, 0.15); color: var(--accent-tvc-green); }
    .badge-sys { background: rgba(255, 170, 0, 0.2); color: var(--accent-tvc-yellow); }

    .sidebar-stats-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-top: 1px solid var(--border-color);
      padding-top: 10px;
    }

    .sidebar-stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .sidebar-stat-label { color: var(--text-muted); }
    .sidebar-stat-value {
      font-family: var(--font-mono);
      font-weight: 700;
      color: #fff;
    }

    .drag-hint-box {
      font-size: 11.5px;
      color: var(--text-muted);
      background: rgba(0, 210, 255, 0.05);
      border: 1px dashed rgba(0, 210, 255, 0.25);
      padding: 10px 12px;
      border-radius: 6px;
      line-height: 1.4;
    }

    /* Jobb oldali Fő Tartalom (Main Area) */
    .app-main {
      flex: 1;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
      overflow-y: auto;
    }

    /* Szűrősáv és akciók */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 12px;
    }

    .filter-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 280px;
    }

    .search-input {
      max-width: 260px;
      padding: 6px 10px;
      font-size: 12.5px;
    }

    .select-user {
      max-width: 160px;
      padding: 6px 10px;
      font-size: 12.5px;
    }

    /* Aktív szűrés banner */
    .filter-active-banner {
      display: none;
      align-items: center;
      justify-content: space-between;
      background: #1c222e;
      border: 1px solid #364157;
      border-left: 3px solid #eab308;
      padding: 7px 12px;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 12.5px;
    }

    .filter-banner-text {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }

    /* Táblázat - Kompakt nézet és rögzített fejléc (Sticky Header) */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow-y: auto;
      max-height: 520px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      position: relative;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      text-align: left;
    }

    thead {
      position: sticky;
      top: 0;
      z-index: 10;
    }

    th {
      background: #141822;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      border-bottom: 2px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    td {
      padding: 4px 10px;
      border-bottom: 1px solid rgba(46, 54, 73, 0.35);
      color: var(--text-main);
      vertical-align: middle;
      font-size: 12.5px;
      line-height: 1.3;
    }

    tr:hover td {
      background-color: var(--bg-card-hover);
    }

    tr.selected td {
      background-color: rgba(0, 136, 255, 0.08);
    }

    .col-check { width: 32px; text-align: center; }
    .col-user { width: 44px; text-align: center; }
    .user-pill {
      background: #10131b;
      border: 1px solid #2a3346;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--accent-tvc-cyan);
    }

    .col-name { font-family: var(--font-mono); font-size: 13px; font-weight: 600; }
    .col-ext { font-family: var(--font-mono); font-size: 12px; color: var(--accent-tvc-yellow); }
    .col-size, .col-alloc { font-family: var(--font-mono); font-size: 11.5px; }
    .col-actions { text-align: right; white-space: nowrap; width: 120px; }

    /* Drag & Drop és rendezési stílusok */
    .folder-drag-over {
      background-color: rgba(0, 210, 255, 0.22) !important;
      outline: 2px dashed var(--accent-tvc-cyan) !important;
      outline-offset: -2px;
    }
    .dragging-file {
      opacity: 0.45;
    }
    .draggable-row {
      cursor: grab;
    }
    .draggable-row:active {
      cursor: grabbing;
    }
    .sortable-th {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s, color 0.15s;
    }
    .sortable-th:hover {
      background-color: #1e2434;
      color: #ffffff;
    }

    .btn-action {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 2px 5px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.12s ease;
      line-height: 1;
    }
    .btn-action:hover {
      background: #232a3b;
      color: #fff;
      border-color: #3b4661;
    }

    .badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1.2;
    }

    .empty-state {
      text-align: center;
      padding: 24px !important;
      color: var(--text-muted);
      font-style: italic;
    }

    /* Lemez foglaltsági térkép */
    .disk-map-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 18px 24px;
    }

    .disk-map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .disk-map-header h3 {
      font-size: 14.5px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .map-legend {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 11.5px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .block-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11px, 1fr));
      gap: 3px;
      background: #0d1017;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #232a3b;
    }

    .block-cell {
      height: 11px;
      border-radius: 2px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
    }

    .block-cell:hover {
      transform: scale(1.6);
      z-index: 10;
      box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
    }

    .block-directory { background-color: var(--accent-tvc-purple); }
    .block-used { background-color: var(--accent-tvc-cyan); }
    .block-free { background-color: #1a202c; border: 1px solid #283144; }

    .block-cell.highlighted {
      background-color: var(--accent-tvc-yellow) !important;
      transform: scale(1.4);
      box-shadow: 0 0 8px var(--accent-tvc-yellow);
      z-index: 5;
    }

    /* Modális ablakok */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(3px);
    }

    .modal-content {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      width: 90%;
      max-width: 650px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    .modal-content-lg {
      max-width: 850px;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      font-size: 16px;
      color: #fff;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 20px;
      cursor: pointer;
    }
    .modal-close:hover { color: #fff; }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    /* Viewer modal stílusok */
    .viewer-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 10px;
    }

    .viewer-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }

    .viewer-tab-btn.active {
      background: rgba(0, 136, 255, 0.15);
      border-color: rgba(0, 136, 255, 0.4);
      color: var(--accent-tvc-cyan);
    }

    .hex-dump {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.6;
      background: #0d1017;
      padding: 14px;
      border-radius: 6px;
      border: 1px solid #232938;
      overflow-x: auto;
      max-height: 480px;
    }

    .hex-row {
      display: flex;
      gap: 14px;
    }

    .hex-offset { color: var(--accent-tvc-cyan); }
    .hex-bytes { color: #c4d1eb; }
    .hex-ascii { color: var(--accent-tvc-green); border-left: 1px solid #232a3b; padding-left: 10px; }
    .hex-more { color: var(--text-muted); font-style: italic; margin-top: 10px; text-align: center; }

    .text-view {
      font-family: var(--font-mono);
      font-size: 13px;
      background: #0d1017;
      padding: 14px;
      border-radius: 6px;
      border: 1px solid #232938;
      overflow-x: auto;
      white-space: pre-wrap;
      max-height: 480px;
      color: #e2e8f0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #0d1017;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #232938;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .info-label { font-size: 12px; color: var(--text-muted); }
    .info-val { font-size: 14px; color: #fff; font-family: var(--font-mono); }

    /* Toast értesítések */
    .notification-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1b202e;
      border: 1px solid var(--border-color);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      z-index: 2000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      font-weight: 500;
    }

    .notification-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    .toast-success { border-left: 4px solid var(--accent-tvc-green); }
    .toast-error { border-left: 4px solid var(--accent-tvc-red); }
    .toast-warning { border-left: 4px solid var(--accent-tvc-yellow); }

    .hidden { display: none !important; }

    @media (max-width: 900px) {
      body { flex-direction: column; }
      .app-sidebar { width: 100%; height: auto; position: static; }
    }
  `;

  const htmlBody = `
    <!-- Rejtett fájl beviteli mezők -->
    <input type="file" id="disk-file-input" class="hidden" accept=".img,.dsk">
    <input type="file" id="file-upload-input" class="hidden" multiple>

    <!-- BAL OLDALI SÁV (Sidebar) - Egymás alatti menükkel és műveletekkel -->
    <aside class="app-sidebar">
      <div class="brand">
        <div class="tvc-logo">TVC</div>
        <div class="brand-text">
          <h1>TVC Lemezkezelő</h1>
          <p>Videoton TVC &bull; UPM / VT-DOS</p>
        </div>
      </div>

      <!-- Menük egymás alatt -->
      <div>
        <div class="sidebar-section-title">Lemezkezelés</div>
        <div class="sidebar-menu">
          <button class="btn btn-primary" onclick="document.getElementById('disk-file-input').click()">
            📁 Lemez megnyitása...
          </button>

          <button class="btn btn-secondary" id="btn-new-disk">
            ➕ Új üres lemez
          </button>

          <button class="btn btn-secondary" id="btn-new-folder" style="display: none;">
            📁 Új könyvtár...
          </button>

          <button class="btn btn-secondary" id="btn-defrag-disk" title="Lemez töredezettségmentesítése és fájlok rendezése az aktuális sorrend szerint">
            🧹 Lemez defragmentálása
          </button>

          <button class="btn btn-success" id="btn-save-disk">
            💾 Lemez mentése (.IMG / .DSK)
          </button>

          <button class="btn btn-primary" onclick="document.getElementById('file-upload-input').click()">
            📤 Fájl másolása a lemezre
          </button>
        </div>
      </div>

      <!-- Aktuális lemez információk és statisztikák -->
      <div>
        <div class="sidebar-section-title">Lemez adatai</div>
        <div class="sidebar-disk-info">
          <div class="disk-header-box">
            <div class="disk-icon">💾</div>
            <div class="disk-title-group">
              <h2 id="disk-title" title="Kattints a lemezképfájl (.IMG / .DSK) átnevezéséhez">LEMEZ.IMG</h2>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">
                <span class="badge badge-tvc" id="system-mode-badge">UPM</span>
                <span class="badge badge-raw" id="disk-format-badge">720 KB</span>
              </div>
            </div>
          </div>

          <!-- DOS Kötetnév (Volume label) és átnevezés -->
          <div id="dos-volume-box" style="display: none; align-items: center; justify-content: space-between; background: #11141c; padding: 6px 10px; border-radius: 5px; border: 1px solid var(--border-color); font-size: 12px; margin-top: 4px;">
            <span style="color: var(--text-muted); display: flex; align-items: center; gap: 5px;">
              🏷️ Kötet: <strong id="dos-volume-text" style="color: #fff; font-family: var(--font-mono);">-</strong>
            </span>
            <button id="btn-edit-label" class="btn-action" title="Kötetnév átnevezése" style="padding: 2px 6px; font-size: 11px;">✏️</button>
          </div>

          <div class="sidebar-stats-list">
            <div class="sidebar-stat-row">
              <span class="sidebar-stat-label">Fájlok száma:</span>
              <span class="sidebar-stat-value" id="stat-files-count">0</span>
            </div>
            <div class="sidebar-stat-row">
              <span class="sidebar-stat-label">Szabad hely:</span>
              <span class="sidebar-stat-value" id="stat-free-space">698 KB</span>
            </div>
            <div class="sidebar-stat-row">
              <span class="sidebar-stat-label">Foglalt blokk:</span>
              <span class="sidebar-stat-value" id="stat-used-blocks">0 / 349</span>
            </div>
            <div class="sidebar-stat-row">
              <span class="sidebar-stat-label">Katalógus:</span>
              <span class="sidebar-stat-value" id="stat-catalog-entries">0 / 128</span>
            </div>
          </div>
        </div>
      </div>

      <div class="drag-hint-box">
        💡 <strong>Tipp:</strong> Bármilyen <code>.IMG</code> vagy <code>.DSK</code> lemezképet vagy felmásolandó fájlt közvetlenül behúzhatsz ide!
      </div>
    </aside>

    <!-- JOBB OLDALI FŐ TARTALOM (Main Content) -->
    <main class="app-main">
      <!-- DOS Mappa Útvonal Sáv (csak DOS módban aktív) -->
      <div id="dos-folder-bar" style="display: none; align-items: center; justify-content: space-between; gap: 10px; background: #131722; padding: 7px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 13px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-muted);">Aktuális mappa:</span>
          <strong id="current-path-display" style="font-family: var(--font-mono); color: var(--accent-tvc-cyan);">\\</strong>
        </div>
        <button class="btn btn-secondary" id="btn-new-folder-top" onclick="window.upmApp && window.upmApp.promptNewFolder()" style="width: auto; padding: 4px 10px; font-size: 12px;">
          ➕ Új mappa
        </button>
      </div>

      <!-- Szűrő és akció sáv -->
      <div class="filter-bar">
        <div class="filter-inputs">
          <input type="text" id="search-filter" class="input-field search-input" placeholder="Keresés fájlnév szerint...">
          <select id="user-filter" class="select-field select-user">
            <option value="all">Minden User (0-15)</option>
            <option value="0" selected>User 0 (Alapértelmezett)</option>
            <option value="1">User 1</option>
            <option value="2">User 2</option>
            <option value="3">User 3</option>
            <option value="4">User 4</option>
            <option value="5">User 5</option>
            <option value="10">User 10</option>
          </select>
          <button class="btn btn-secondary" id="btn-sort-selector" style="width: auto; font-size: 12px; padding: 6px 10px; white-space: nowrap;">
            ↕️ Rendezés: Eredeti lemezsorrend
          </button>
          <!-- Vissza a teljes listához gomb (ha szűrés van érvényben) -->
          <button class="btn btn-warning-back" id="btn-reset-filter" style="display: none; width: auto;">
            ✕ Vissza a teljes listához
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-download-selected" style="width: auto;">⬇️ Kijelöltek letöltése (ZIP)</button>
          <button class="btn btn-danger" id="btn-delete-selected" style="width: auto;">🗑️ Törlés</button>
        </div>
      </div>

      <!-- Aktív szűrés banner felugró sáv -->
      <div id="filter-active-banner" class="filter-active-banner">
        <div class="filter-banner-text">
          <span>🔎</span>
          <span id="filter-banner-text">Aktív egyedi fájl szűrés</span>
        </div>
        <button class="btn btn-warning-back" id="filter-banner-reset" style="padding: 6px 12px; font-size: 12px; width: auto;">
          ✕ Vissza a teljes listához
        </button>
      </div>

      <!-- Fájllista táblázat -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th class="col-check">
                <input type="checkbox" id="select-all-checkbox">
              </th>
              <th class="col-user">User</th>
              <th class="col-name sortable-th" id="th-col-name" title="Kattints a név szerinti rendezéshez">Fájlnév ↕</th>
              <th class="col-ext">Kiterj.</th>
              <th class="col-type">Típus / CAS</th>
              <th class="col-size sortable-th" id="th-col-size" title="Kattints a méret szerinti rendezéshez">Pontos méret ↕</th>
              <th class="col-alloc">Foglalás</th>
              <th class="col-attr">Attrib.</th>
              <th class="col-actions">Műveletek</th>
            </tr>
          </thead>
          <tbody id="file-table-body">
            <tr>
              <td colspan="9" class="empty-state">Betöltés folyamatban...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Interaktív lemez foglaltsági térkép -->
      <div class="disk-map-card">
        <div class="disk-map-header">
          <h3>🗺️ Lemez foglaltsági térkép (Block Allocation Map)</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn btn-warning-back" id="map-reset-filter" style="display: none; padding: 4px 10px; font-size: 11.5px; width: auto;">
              ✕ Vissza a teljes listához
            </button>
            <div class="map-legend">
              <div class="legend-item"><span class="legend-dot" style="background: var(--accent-tvc-purple);"></span> Katalógus (Blokk 0-1)</div>
              <div class="legend-item"><span class="legend-dot" style="background: var(--accent-tvc-cyan);"></span> Foglalt blokk</div>
              <div class="legend-item"><span class="legend-dot" style="background: #1a202c; border: 1px solid #283144;"></span> Szabad blokk</div>
              <div class="legend-item"><span class="legend-dot" style="background: var(--accent-tvc-yellow);"></span> Kijelölt fájl</div>
            </div>
          </div>
        </div>
        <div id="block-map-grid" class="block-grid">
          <!-- Dinamikusan renderelt blokk cellák -->
        </div>
      </div>
    </main>

    <!-- Új lemez modális ablak -->
    <div id="modal-new-disk" class="modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>➕ Új üres lemezkép létrehozása és formázása</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-disk-name">Lemezfájl neve (.img vagy .dsk):</label>
            <input type="text" id="new-disk-name" class="input-field" value="UJ_LEMEZ.IMG" placeholder="pl. UJ_LEMEZ.IMG vagy UJ_LEMEZ.DSK">
          </div>
          <div class="form-group">
            <label for="new-disk-format">Lemezformátum:</label>
            <select id="new-disk-format" class="select-field">
              <optgroup label="UPM (CP/M 2.2) Formátumok">
                <option value="96tpi_ds" selected>UPM 96 TPI Kétoldalas (80 track, 2 fej, 720 KB) - TVC Standard</option>
                <option value="48tpi_ds">UPM 48 TPI Kétoldalas (40 track, 2 fej, 360 KB)</option>
                <option value="96tpi_ss">UPM 96 TPI Egyoldalas (80 track, 1 fej, 360 KB)</option>
                <option value="48tpi_ss">UPM 48 TPI Egyoldalas (40 track, 1 fej, 180 KB)</option>
              </optgroup>
              <optgroup label="VT-DOS / FAT12 Formátumok (Hierarchikus könyvtárak)">
                <option value="vtdos_720k">VT-DOS 720 KB (80 track, 2 fej, 9 sec, 2 FAT, 112 root)</option>
                <option value="vtdos_360k">VT-DOS 360 KB (40 track, 2 fej, 9 sec, 2 FAT, 112 root)</option>
              </optgroup>
            </select>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
            Az új lemez minden szektora 0xE5 (CP/M üres jelölő) értékkel lesz inicializálva, a TVC UPM specifikáció szerinti 4 pályás offsettel és 128 katalógusrekorddal.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-close" style="width: auto;">Mégse</button>
          <button class="btn btn-primary" id="btn-confirm-new-disk" style="width: auto;">Lemez létrehozása</button>
        </div>
      </div>
    </div>

    <!-- Fájl nézegető (Viewer / Hex Inspector) modal -->
    <div id="modal-viewer" class="modal">
      <div class="modal-backdrop"></div>
      <div class="modal-content modal-content-lg">
        <div class="modal-header">
          <h3 id="viewer-file-title">Fájl megtekintése</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="viewer-tabs">
            <button class="viewer-tab-btn active" data-tab="hex">Hex dump</button>
            <button class="viewer-tab-btn" data-tab="text">Szöveges nézet</button>
            <button class="viewer-tab-btn" data-tab="cas">TVC CAS / Fejléc Elemzés</button>
          </div>
          <div id="viewer-body">
            <!-- Tartalom dinamikusan -->
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-close" style="width: auto;">Bezárás</button>
        </div>
      </div>
    </div>

    <!-- Értesítő toast -->
    <div id="notification-toast" class="notification-toast"></div>
  `;

  const distDir = fs.existsSync(path.join(rootDir, 'dist', 'types.js'))
    ? path.join(rootDir, 'dist')
    : path.join(__dirname, 'dist');

  // Olvassuk be a TypeScript-ből fordított JS fájlokat:
  const typesJs = fs.readFileSync(path.join(distDir, 'types.js'), 'utf8')
    .replace(/export /g, '');

  const zipWriterJs = fs.readFileSync(path.join(distDir, 'zip_writer.js'), 'utf8')
    .replace(/export /g, '');

  const casParserJs = fs.readFileSync(path.join(distDir, 'cas_parser.js'), 'utf8')
    .replace(/import .*;?\n/g, '')
    .replace(/export /g, '');

  const upmDiskJs = fs.readFileSync(path.join(distDir, 'upm_disk.js'), 'utf8')
    .replace(/import .*;?\n/g, '')
    .replace(/export /g, '');

  const fatDiskJs = fs.readFileSync(path.join(distDir, 'fat_disk.js'), 'utf8')
    .replace(/import .*;?\n/g, '')
    .replace(/export /g, '');

  const appJs = fs.readFileSync(path.join(distDir, 'app.js'), 'utf8')
    .replace(/import .*;?\n/g, '')
    .replace(/export /g, '');

  const webMainJs = fs.readFileSync(path.join(distDir, 'web_main.js'), 'utf8')
    .replace(/import .*;?\n/g, '');

  const combinedJs = `
    (function() {
      ${typesJs}
      ${zipWriterJs}
      ${casParserJs}
      ${upmDiskJs}
      ${fatDiskJs}
      ${appJs}
      ${webMainJs}
    })();
  `;

  const fullHtml = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Videoton TVC Lemezkezelő (UPM &amp; VT-DOS)</title>
  <style>
${css}
  </style>
</head>
<body>
${htmlBody}
<script>
${combinedJs}
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, 'index.html'), fullHtml, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'UPM_DiskManager.html'), fullHtml, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'TVC_DiskManager.html'), fullHtml, 'utf8');
  console.log("Sikeresen elkészült a TVC Lemezkezelő (UPM & VT-DOS) HTML alkalmazás!");
}

buildSingleHtml();
