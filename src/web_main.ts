import { UpmApp } from './app.js';

window.addEventListener('DOMContentLoaded', () => {
  const app = new UpmApp();
  app.init();
  (window as any).upmApp = app;
});
