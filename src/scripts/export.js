// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.openExportModal = () => {
           document.getElementById('export-modal').classList.remove('hidden');
           window.updateExportCommand();
        };
        
        window.closeExportModal = () => {
           document.getElementById('export-modal').classList.add('hidden');
        };
        
        window.updateExportCommand = () => {
           const path = document.getElementById('export-path').value.trim();
           const cmdBox = document.getElementById('export-command');
           if (path) {
              cmdBox.value = `git clone https://github.com/AnnacKK/GAIA_BASIN_NOTES.git "${path}"`;
           } else {
              cmdBox.value = `git clone https://github.com/AnnacKK/GAIA_BASIN_NOTES.git`;
           }
        };
        
        window.copyExportCommand = () => {
           const cmdBox = document.getElementById('export-command');
           const btn = document.getElementById('copy-export-btn');
           const originalHTML = btn.innerHTML;
           
           navigator.clipboard.writeText(cmdBox.value).then(() => {
               btn.innerHTML = '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
               btn.classList.add('border-emerald-500/50', 'bg-emerald-900/30');
               
               setTimeout(() => {
                   btn.innerHTML = originalHTML;
                   btn.classList.remove('border-emerald-500/50', 'bg-emerald-900/30');
               }, 2000);
           }).catch(() => alert('Failed to copy.'));
        };
         // Add Branch Modal handlers
