// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.showAuthAlert = (message) => {
        document.getElementById('auth-alert-message').innerText = message || "You must be logged in to perform this action.";
        document.getElementById('auth-alert-modal').classList.remove('hidden');
      };

window.fetchSession = async () => {
        try {
          const resp = await fetch('/api/auth/session');
          if (!resp.ok) throw new Error('Session fetch failed');
          const result = await resp.json();
          window.auth.user = result.user;
        } catch (error) {
          window.auth.user = null;
        }
        window.updateAuthUI();
        window.updateContributionControls();
      };

      window.updateAuthUI = () => {
        const controls = document.getElementById('auth-controls');
        if (!controls) return;
        if (window.auth.user) {
          controls.innerHTML = `
            <div class=\"flex items-center gap-2 justify-end\">
              <img src=\"${window.auth.user.avatar_url}\" alt=\"${window.auth.user.login}\" class=\"h-9 w-9 rounded-full border border-slate-500 cursor-pointer\" onclick=\"window.openAccountModal()\" />
              <button onclick=\"window.openAccountModal()\" class=\"text-sm font-medium text-slate-100 hover:text-white\">${window.auth.user.login}</button>
              <a href=\"/api/auth/logout\" class=\"rounded-full bg-[#1a3a6f] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[#d5e9ff] hover:bg-[#2f5c9d]\">Logout</a>
            </div>`;
        } else {
          controls.innerHTML = `<a href=\"/api/auth/login\" class=\"rounded-full bg-[#1a3a6f] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[#d5e9ff] hover:bg-[#2f5c9d]\">Login with GitHub</a>`;
        }
      };

      window.setAccountTab = (tab) => {
         window.currentAccountTab = tab;
         const tabs = ['all', 'book', 'article', 'course', 'note', 'edited_note', 'branch', 'research', 'statistics', 'settings', 'moderate'];
         tabs.forEach(t => {
            const el = document.getElementById('acc-tab-' + t);
            if (!el) return;
            if (t === tab) {
               el.className = "text-left px-4 py-2 rounded-xl bg-[#1a4f7f] text-white font-medium text-base";
            } else {
               el.className = "text-left px-4 py-2 rounded-xl text-slate-400 hover:bg-[#0a2336] hover:text-slate-200 text-base transition-colors";
            }
         });
         
         const list = document.getElementById('account-resources-list');
         const stats = document.getElementById('account-statistics');
         const settings = document.getElementById('account-settings');
         
         list.classList.add('hidden');
         stats.classList.add('hidden');
         settings.classList.add('hidden');
         
         if (tab === 'statistics') {
            stats.classList.remove('hidden');
            window.renderAccountStatistics();
         } else if (tab === 'settings') {
            settings.classList.remove('hidden');
            window.renderAccountSettings();
         } else {
            list.classList.remove('hidden');
            window.renderAccountResources(tab);
         }
      };

      window.getCombinedResources = () => {
         let myResources = window.allResources.filter(r => r.author === window.auth.user.login);
         
         let liveContributions = window.userContributions || [];
         let deletedList = [];
         try {
            deletedList = JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]');
         } catch(e) {}
         
         let combined = [...myResources];
         
         liveContributions.forEach(pr => {
            const isDeleted = deletedList.some(d => {
               if (d.nodeId && pr.nodeId) return d.nodeId === pr.nodeId;
               return d.title === pr.title && d.fileId === pr.fileId;
            });
            if (isDeleted) return;
            
            const exists = combined.find(r => r.title === pr.title && r.fileId === pr.fileId && !r.isPr);
            if (!exists) {
               combined.push(pr);
            } else if (pr.status === 'CONTRIBUTED' && exists) {
               exists.status = 'CONTRIBUTED';
            }
         });

         // Strictly exclude deleted resources
         combined = combined.filter(r => {
            return !deletedList.some(d => {
               if (d.nodeId && r.nodeId) return d.nodeId === d.nodeId;
               return d.title === r.title && d.fileId === r.fileId;
            });
         });

         return combined;
      };

      window.renderAccountStatistics = () => {
         const combined = window.getCombinedResources();
         const stats = document.getElementById('account-statistics');
         const counts = combined.reduce((acc, r) => {
             const type = (r.type || 'unknown').toLowerCase();
             acc[type] = (acc[type] || 0) + 1;
             return acc;
         }, {});
         
         stats.innerHTML = `
           <h3 class="text-3xl font-bold text-white mb-8">Your Contribution Statistics</h3>
           <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
             <div class="bg-[#0a2336] rounded-2xl border border-[#1b3e63] p-8 shadow-lg">
                <p class="text-xs text-[#8ecae6] font-bold uppercase tracking-[0.2em]">Total Contributions</p>
                <p class="text-6xl font-black text-white mt-4">${combined.length}</p>
             </div>
             ${Object.entries(counts).map(([type, count]) => `
               <div class="bg-[#0a2336] rounded-2xl border border-[#1b3e63] p-8 shadow-lg">
                  <p class="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] capitalize">${type}s</p>
                  <p class="text-5xl font-bold text-[#8ecae6] mt-4">${count}</p>
               </div>
             `).join('')}
           </div>
         `;
      };

      window.renderAccountSettings = () => {
         const settings = document.getElementById('account-settings');
         const isIncognito = localStorage.getItem('gaiabasin_incognito') === 'true';
         settings.innerHTML = `
           <h3 class="text-3xl font-bold text-white mb-8">Settings</h3>
           <div class="bg-[#0a2336] rounded-2xl border border-[#1b3e63] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
             <div class="max-w-2xl">
               <p class="text-xl font-bold text-white">Incognito Mode</p>
               <p class="text-sm text-slate-400 mt-2 leading-relaxed">When enabled, your username will be hidden from the public "Credits" tab and resource lists, appearing as "Anonymous Contributor".<br/><br/><strong class="text-slate-300">Note:</strong> Since your changes are merged into the repository, your username is still recorded in the code so you can manage your resources from this dashboard later.</p>
             </div>
             <label class="relative inline-flex items-center cursor-pointer shrink-0">
               <input type="checkbox" id="incognito-toggle" class="sr-only peer" ${isIncognito ? 'checked' : ''} onchange="window.toggleIncognito(this.checked)">
               <div class="w-16 h-8 bg-[#0d2a53] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-300 after:border-gray-300 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#2069b3] peer-checked:after:bg-white border border-[#1e314e]"></div>
             </label>
           </div>
         `;
      };
      
      window.toggleIncognito = async (value) => {
         localStorage.setItem('gaiabasin_incognito', value ? 'true' : 'false');
         
         // Optimistic UI update
         const username = window.auth?.user?.login;
         if (username) {
            window.allResources.forEach(r => {
               if (r.author === username || r.author === 'Anonymous Contributor') {
                   r.incognito = value;
               }
            });
            
            // Re-render Note Viewer if open
            if (window.currentNotePath && !document.getElementById('node-viewer').classList.contains('hidden')) {
               window.handleTab(window.currentTab || 'overview');
            }
         }

         // Backend sync
         try {
             fetch('/api/toggleIncognito', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ incognito: value })
             }).catch(e => console.error("Incognito sync error", e));
         } catch (e) {
             console.error("Failed to sync incognito status to backend", e);
         }
      };

window.renderAccountResources = (tab) => {
         if (tab === 'moderate') {
            const list = document.getElementById('account-resources-list');
            list.innerHTML = `<div class="text-center p-12 text-slate-500">Loading pending books...</div>`;
            fetch('/api/pendingBooks')
              .then(res => res.json())
              .then(data => {
                 if (data.length === 0) {
                    list.innerHTML = `<div class="text-center p-12 border-2 border-dashed border-[#1e314e] rounded-2xl">
                      <p class="text-slate-400 text-lg">No books pending moderation.</p>
                    </div>`;
                    return;
                 }
                 
                 list.innerHTML = data.map(b => `
                   <li class="p-3.5 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-[#2b4d7b] transition-colors">
                     <div class="flex-1 min-w-0">
                       <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#7c98d9]">Pending Book Entry</span>
                       <p class="text-base font-bold text-white mt-1.5 truncate">${b.title}</p>
                       <p class="text-xs text-slate-400 mt-1">Theme: ${b.theme} | Level: ${b.level} | Author: ${b.author} | Uploaded by: ${b.contributor}</p>
                       <a href="${b.download_url}" target="_blank" class="text-sm text-[#8ecae6] hover:text-white underline truncate block mt-1">${b.download_url}</a>
                       ${b.tags && b.tags.length > 0 ? `
                         <div class="flex flex-wrap gap-1.5 mt-2.5">
                           ${b.tags.map(tag => `<span class="bg-[#122c4d] text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-900/30 capitalize">${tag}</span>`).join('')}
                         </div>
                       ` : ''}
                     </div>
                     <div class="flex items-center gap-3 shrink-0">
                        <button onclick="window.approveBookEntry(${b.id}, '${b.title.replace(/'/g, "\\'")}', this)" class="rounded-full bg-emerald-900/40 border border-emerald-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-emerald-200 hover:bg-emerald-800 transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none">Approve</button>
                        <button onclick="window.deleteBookEntry(${b.id}, '${b.title.replace(/'/g, "\\'")}', this)" class="rounded-full bg-rose-900/40 border border-rose-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-200 hover:bg-rose-800 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none">Reject</button>
                     </div>
                   </li>
                 `).join('');
              })
              .catch(err => {
                 list.innerHTML = `<div class="text-center p-12 text-rose-500">Error loading pending books.</div>`;
              });
            return;
         }

         if (tab === 'book') {
            const list = document.getElementById('account-resources-list');
            list.innerHTML = `<div class="text-center p-12 text-slate-500">Loading books...</div>`;
            fetch('/api/books')
              .then(res => res.json())
              .then(data => {
                 const myBooks = data.filter(b => b.contributor === window.auth.user.login);
                 
                 if (myBooks.length === 0) {
                    list.innerHTML = `<div class="text-center p-12 border-2 border-dashed border-[#1e314e] rounded-2xl">
                      <p class="text-slate-400 text-lg">No books added yet.</p>
                    </div>`;
                    return;
                 }
                 
                 list.innerHTML = myBooks.map(b => `
                   <li class="p-3.5 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-[#2b4d7b] transition-colors">
                     <div class="flex-1 min-w-0">
                       <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#7c98d9]">Book Entry</span>
                       <p class="text-base font-bold text-white mt-1.5 truncate">${b.title}</p>
                       <p class="text-xs text-slate-400 mt-1">Theme: ${b.theme} | Level: ${b.level} | Author: ${b.author}</p>
                       <a href="${b.download_url}" target="_blank" class="text-sm text-[#8ecae6] hover:text-white underline truncate block mt-1">${b.download_url}</a>
                       ${b.tags && b.tags.length > 0 ? `
                         <div class="flex flex-wrap gap-1.5 mt-2.5">
                           ${b.tags.map(tag => `<span class="bg-[#122c4d] text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-900/30 capitalize">${tag}</span>`).join('')}
                         </div>
                       ` : ''}
                     </div>
                     <button onclick="window.deleteBookEntry(${b.id}, '${b.title.replace(/'/g, "\\'")}', this)" class="shrink-0 rounded-full bg-rose-900/40 border border-rose-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-200 hover:bg-rose-800 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none">Delete</button>
                   </li>
                 `).join('');
              })
              .catch(err => {
                 list.innerHTML = `<div class="text-center p-12 text-rose-500">Error loading books.</div>`;
              });
            return;
         }

        if (tab === 'research') {
           const list = document.getElementById('account-resources-list');
           list.innerHTML = `<div class="text-center p-12 text-slate-500">Loading researches...</div>`;
           fetch('/api/researches')
             .then(res => res.json())
             .then(data => {
                const myResearches = data.filter(r => r.author === window.auth.user.login);
                
                if (myResearches.length === 0) {
                   list.innerHTML = `<div class="text-center p-12 border-2 border-dashed border-[#1e314e] rounded-2xl">
                     <p class="text-slate-400 text-lg">No researches added yet.</p>
                   </div>`;
                   return;
                }
                
                list.innerHTML = myResearches.map(r => `
                  <li class="p-3.5 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-[#2b4d7b] transition-colors">
                    <div class="flex-1 min-w-0">
                      <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#7c98d9]">Research Link</span>
                      <p class="text-base font-bold text-white mt-1.5 truncate">${r.title || r.url}</p>
                      <a href="${r.url}" target="_blank" class="text-sm text-[#8ecae6] hover:text-white underline truncate block mt-1">${r.url}</a>
                      ${r.tags && r.tags.length > 0 ? `
                        <div class="flex flex-wrap gap-1.5 mt-2.5">
                          ${r.tags.map(tag => `<span class="bg-[#122c4d] text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-900/30 capitalize">${tag}</span>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                    <button onclick="window.deleteResearchLink(${r.id}, this)" class="shrink-0 rounded-full bg-rose-900/40 border border-rose-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-200 hover:bg-rose-800 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none">Delete</button>
                  </li>
                `).join('');
             })
             .catch(err => {
                list.innerHTML = `<div class="text-center p-12 text-rose-500">Error loading researches.</div>`;
             });
           return;
        }

        let combined = window.getCombinedResources();
        
        // Sort newest first (PRs first, then reverse myResources)
        combined.sort((a, b) => {
           if (a.isPr && !b.isPr) return -1;
           if (!a.isPr && b.isPr) return 1;
           return 0;
        });

        if (tab !== 'all') {
           combined = combined.filter(r => (r.type || '').toLowerCase() === tab);
        }
        
        const list = document.getElementById('account-resources-list');
        if (combined.length === 0) {
          list.innerHTML = `<div class="text-center p-12 border-2 border-dashed border-[#1e314e] rounded-2xl">
            <p class="text-slate-400 text-lg">No resources found.</p>
          </div>`;
        } else {
          list.innerHTML = combined.map(r => {
            let statusBadge = '';
            const displayStatus = r.status || 'CONTRIBUTED';
            if (displayStatus === 'WAITING FOR APPROVAL') {
               statusBadge = '<span class="ml-3 text-amber-300 border border-amber-300/30 bg-amber-900/30 px-2 py-0.5 rounded-full tracking-widest text-[10px]">WAITING FOR APPROVAL</span>';
            } else if (displayStatus === 'NOT APPROVED') {
               statusBadge = '<span class="ml-3 text-rose-300 border border-rose-300/30 bg-rose-900/30 px-2 py-0.5 rounded-full tracking-widest text-[10px]">NOT APPROVED</span>';
            } else {
               statusBadge = '<span class="ml-3 text-emerald-300 border border-emerald-300/30 bg-emerald-900/30 px-2 py-0.5 rounded-full tracking-widest text-[10px]">CONTRIBUTED</span>';
            }
            
            let rejectionBlock = '';
            if (displayStatus === 'NOT APPROVED' && r.rejectionReason) {
               const escapedReason = r.rejectionReason.replace(/</g, '&lt;').replace(/>/g, '&gt;');
               rejectionBlock = `<div class="mt-2.5 p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-200 leading-relaxed shadow-inner">
                 <span class="font-bold text-rose-400 uppercase tracking-wider text-[10px] mb-1 block">Reason for Rejection:</span>
                 <span class="whitespace-pre-wrap font-mono">${escapedReason}</span>
               </div>`;
            }

            return `
            <li class="p-3.5 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-[#2b4d7b] transition-colors">
              <div class="flex-1 min-w-0">
                <span class="text-xs font-bold uppercase tracking-[0.2em] text-[#7c98d9]">${(r.type || 'resource').replace('_', ' ')} ${statusBadge} ${r.incognito ? '<span class="ml-3 text-rose-300 border border-rose-300/30 bg-rose-900/30 px-2 py-0.5 rounded-full tracking-widest text-[10px]">INCOGNITO</span>' : ''}</span>
                <p class="text-base font-bold text-white mt-1.5 truncate">${r.title}</p>
                <a href="${r.url}" target="_blank" class="text-sm text-[#8ecae6] hover:text-white underline truncate block mt-1">${r.isPr ? 'View Pull Request' : r.url}</a>
                <p class="text-xs text-slate-500 mt-2.5 flex items-center gap-2">
                   <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>
                   ${r.fileId}
                </p>
                ${rejectionBlock}
              </div>
              ${(displayStatus === 'NOT APPROVED' || (displayStatus === 'CONTRIBUTED' && r.type !== 'edited_note')) ? `<button onclick="window.deleteResource('${r.fileId}', '${r.title.replace(/'/g, "\\'")}', '${r.url.replace(/'/g, "\\'")}', this, '${r.type}', '${displayStatus}', ${!!r.isPr})" class="shrink-0 rounded-full bg-rose-900/40 border border-rose-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-200 hover:bg-rose-800 transition-colors focus:ring-2 focus:ring-rose-500 focus:outline-none">Delete</button>` : ''}
              ${(displayStatus === 'CONTRIBUTED' && r.type === 'edited_note') ? `<button onclick="window.revertEdit('${r.nodeId}', '${r.title.replace(/'/g, "\\'")}', '${r.fileId}', this)" class="shrink-0 rounded-full bg-amber-900/40 border border-amber-800 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-amber-200 hover:bg-amber-800 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none">Revert Edit</button>` : ''}
            </li>
            `}).join('');
        }
      };

      window.deleteResearchLink = async (id, btn) => {
         if (!confirm('Are you sure you want to delete this research link?')) return;
         
         btn.disabled = true;
         btn.innerText = 'Deleting...';
         
         try {
            const res = await fetch('/api/deleteResearch', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            
            window.showToast('Research link deleted successfully.', 'success');
            window.renderAccountResources('research');
            if (!document.getElementById('researches-window').classList.contains('hidden')) {
               window.fetchResearches();
            }
         } catch (e) {
            alert('Error deleting research: ' + e.message);
            btn.disabled = false;
            btn.innerText = 'Delete';
         }
      };

      window.deleteBookEntry = async (id, title, btn) => {
         const modal = document.getElementById('delete-modal');
         document.getElementById('delete-modal-title').innerText = title;
         modal.classList.remove('hidden');
         
         const confirmBtn = document.getElementById('confirm-delete-btn');
         const newBtn = confirmBtn.cloneNode(true);
         confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
         
         newBtn.addEventListener('click', async () => {
            window.closeDeleteModal();
            btn.disabled = true;
            btn.innerText = 'Deleting...';
            
            try {
               const res = await fetch('/api/deleteBook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id })
               });
               
               const data = await res.json();
               if (!res.ok) throw new Error(data.error || 'Delete failed');
               
               window.showToast('Book entry deleted successfully.', 'success');
               window.renderAccountResources(window.currentAccountTab);
               if (!document.getElementById('library-window').classList.contains('hidden')) {
                  window.openLibrary();
               }
            } catch (e) {
               alert('Error deleting book entry: ' + e.message);
               btn.disabled = false;
               btn.innerText = 'Delete';
            }
         });
      };

      window.approveBookEntry = async (id, title, btn) => {
         btn.disabled = true;
         btn.innerText = 'Approving...';
         
         try {
            const res = await fetch('/api/approveBook', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Approval failed');
            
            window.showToast('Book approved and published successfully.', 'success');
            window.renderAccountResources('moderate');
            if (!document.getElementById('library-window').classList.contains('hidden')) {
               window.openLibrary();
            }
         } catch (e) {
            alert('Error approving book: ' + e.message);
            btn.disabled = false;
            btn.innerText = 'Approve';
         }
      };

      window.openAccountModal = async () => {
        if (!window.auth.user) return;
        
        if (window.auth.user.login === 'AnnacKK') {
            document.getElementById('acc-tab-moderate').classList.remove('hidden');
        } else {
            document.getElementById('acc-tab-moderate').classList.add('hidden');
        }
        
        document.getElementById('account-header-info').innerHTML = `
          <img src="${window.auth.user.avatar_url}" class="w-12 h-12 rounded-full border border-slate-500 shadow-md" />
          <div>
            <p class="text-2xl font-bold text-white">${window.auth.user.login}</p>
            <p class="text-lg font-medium text-[#8ecae6] tracking-widest uppercase mt-0.5">Contributor Dashboard</p>
          </div>
        `;
        
        try {
           const resp = await fetch(`/api/userContributions?username=${window.auth.user.login}&t=${Date.now()}`);
           let apiPRs = [];
           if (resp.ok) {
              apiPRs = await resp.json();
           }
           const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
           const filteredLocal = localPRs.filter(l => !apiPRs.some(a => a.url === l.url));
           sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(filteredLocal));
           window.userContributions = [...apiPRs, ...filteredLocal];
        } catch(e) {
           window.userContributions = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
        }
        
        window.setAccountTab('all');
        document.getElementById('account-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      };

      window.closeAccountModal = () => {
        document.getElementById('account-modal').classList.add('hidden');
        document.body.style.overflow = '';
      };
