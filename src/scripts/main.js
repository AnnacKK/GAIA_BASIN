// GAIA BASIN Main Client Application Entrypoint
import './sidebar.js';
import './auth.js';
import './modals.js';
import './graph.js';
import './reader.js';
import './export.js';
import './library.js';

// Initialize the Application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
   // 1. Render vault structure list in sidebar
   if (window.populateVaultTree) {
      window.populateVaultTree();
   }
   
   // 2. Fetch authenticated session
   if (window.fetchSession) {
      window.fetchSession();
   }
   
   // 3. Render Vis.js interactive network graph
   if (window.createMainGraph) {
      window.createMainGraph(null, null, null);
   }
});
