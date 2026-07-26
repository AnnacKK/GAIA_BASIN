// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.openEditor = async (existingPath) => {
        if (!window.auth?.user) {
          window.showAuthAlert("Only logged in users can edit notes.");
          return;
        }
        const editor = document.getElementById('editor-modal');
        document.body.style.overflow = 'hidden';
        const pathField = document.getElementById('editor-path');
        const commitField = document.getElementById('editor-commit');
        const prBodyField = document.getElementById('editor-pr-body');
        const contentField = document.getElementById('editor-content');
        const editorTitle = document.getElementById('editor-title');
        const editorSubtitle = document.getElementById('editor-subtitle');

        if (existingPath) {
          pathField.value = existingPath;
          editorTitle.innerText = 'Propose update';
          editorSubtitle.innerText = 'Edit the note content and submit a pull request.';
          commitField.value = `Proposed update to ${existingPath}`;
          prBodyField.value = `This PR proposes changes to ${existingPath}.`;
          const encodedPath = existingPath.split('/').map(encodeURIComponent).join('/');
          try {
            const resp = await fetch(`/api/fileContent?path=${encodedPath}`);
            const text = await resp.text();
            contentField.value = text;
          } catch (err) {
            contentField.value = '';
          }
        } else {
          pathField.value = '';
          editorTitle.innerText = 'Create new note';
          editorSubtitle.innerText = 'Add a new markdown file to the vault.';
          commitField.value = 'Add new markdown contribution';
          prBodyField.value = 'This PR adds a new contribution to the vault.';
          contentField.value = '# New note\n\nStart writing your contribution here.';
        }

        window.setContributionStatus('');
        editor.classList.remove('hidden');
      };

      window.closeEditor = () => {
        document.getElementById('editor-modal').classList.add('hidden');
        document.body.style.overflow = '';
      };

      window.setContributionStatus = (message, error = false) => {
        const status = document.getElementById('editor-status');
        status.innerText = message;
        status.className = `text-sm ${error ? 'text-rose-300' : 'text-slate-400'}`;
      };

      window.submitContribution = async () => {
        const path = document.getElementById('editor-path').value.trim();
        let content = document.getElementById('editor-content').value;
        const commitMessage = document.getElementById('editor-commit').value.trim();
        const prDescription = document.getElementById('editor-pr-body').value.trim();

        const username = window.auth?.user?.login;
        if (username) {
           let hasFrontmatter = content.match(/^---\n([\s\S]*?)\n---/);
           if (hasFrontmatter) {
              let fm = hasFrontmatter[1];
              if (!fm.includes('contributors:')) {
                 fm += `\ncontributors:\n  - ${username}`;
              } else {
                 let lines = fm.split('\n');
                 let inContributors = false;
                 let hasUser = false;
                 for (let line of lines) {
                    if (line.startsWith('contributors:')) inContributors = true;
                    else if (inContributors && !line.startsWith('  -')) inContributors = false;
                    
                    if (inContributors && line.includes(`- ${username}`)) hasUser = true;
                 }
                 if (!hasUser) {
                    fm = fm.replace(/contributors:/, `contributors:\n  - ${username}`);
                 }
              }
              content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`);
           } else {
              content = `---\ncontributors:\n  - ${username}\n---\n${content}`;
           }
        }

        if (!path || !content) {
          window.setContributionStatus('Please provide a file path and content.', true);
          return;
        }

        window.setContributionStatus('Submitting contribution...');
        try {
          const response = await fetch('/api/contribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content, commitMessage, prDescription }),
          });
          const result = await response.json();
          if (!response.ok) {
            window.setContributionStatus(result.error || 'Unable to submit contribution.', true);
            return;
          }
          window.setContributionStatus(`Contribution submitted! PR: ${result.prUrl}`);
          window.showCelebration('Your note edit has been submitted for review!');
          document.getElementById('editor-modal').scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
          window.setContributionStatus('Contribution failed. Please try again.', true);
        }
      };

      window.openResourceAdder = () => {
        if (!window.auth?.user) {
          window.showAuthAlert("Only logged in users can add resources.");
          return;
        }
        if (!window.currentNotePath) {
          alert("Please open a note first.");
          return;
        }
        document.getElementById('resource-title').value = '';
        document.getElementById('resource-url').value = '';
        window.setResourceStatus('');
        document.getElementById('resource-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      };

      window.closeResourceAdder = () => {
        document.getElementById('resource-modal').classList.add('hidden');
        document.body.style.overflow = '';
      };

      window.setResourceStatus = (message, error = false) => {
        const status = document.getElementById('resource-status');
        status.innerText = message;
        status.className = `text-sm ${error ? 'text-rose-300' : 'text-slate-400'}`;
      };

      window.submitResource = async () => {
        const type = document.getElementById('resource-type').value;
        const title = document.getElementById('resource-title').value.trim();
        const url = document.getElementById('resource-url').value.trim();

        if (!title || !url) {
          window.setResourceStatus('Please fill in both Title and URL.', true);
          return;
        }

        window.setResourceStatus('Preparing contribution...');

        const path = window.currentNotePath;
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        let currentContent = '';
        try {
          const resp = await fetch(`/api/fileContent?path=${encodedPath}`);
          currentContent = await resp.text();
        } catch (err) {
          window.setResourceStatus('Failed to load current note content.', true);
          return;
        }

        const isIncognito = localStorage.getItem('gaiabasin_incognito') === 'true';
        const appendedMarkdown = [
          '',
          `- type: ${type}`,
          `\ttitle: "${title}"`,
          `\turl: "${url}"`,
          `\tauthor: "${window.auth.user.login}"`,
          isIncognito ? `\tincognito: "true"` : null,
          ''
        ].filter(l => l !== null).join('\n');
        const finalContent = currentContent.trimEnd() + '\n' + appendedMarkdown;

        const commitMessage = `Add ${type} resource: ${title}`;
        const prDescription = `This PR adds a new ${type} resource to ${path}.`;

        const tempPrNumber = 'temp-' + Date.now();
        const tempPR = {
          isPr: true,
          type: type.toLowerCase(),
          title: title,
          url: '#',
          status: 'WAITING FOR APPROVAL',
          prNumber: tempPrNumber,
          fileId: path,
          author: window.auth.user.login,
          incognito: isIncognito
        };

        try {
          const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
          localPRs.push(tempPR);
          sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
          if (!window.userContributions) window.userContributions = [];
          window.userContributions.push(tempPR);
        } catch (e) {}

        window.setResourceStatus('Submitting pull request...');

        try {
          const resp = await fetch('/api/contribute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: path,
              content: finalContent,
              commitMessage: commitMessage,
              prDescription: prDescription
            })
          });
          const result = await resp.json();
          if (!resp.ok) throw new Error(result.error || 'Failed to submit');

          try {
            const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
            const idx = localPRs.findIndex(p => p.prNumber === tempPrNumber);
            if (idx !== -1) {
              localPRs[idx].url = result.prUrl;
              localPRs[idx].prNumber = result.prNumber;
            }
            sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
            if (window.userContributions) {
              const mIdx = window.userContributions.findIndex(p => p.prNumber === tempPrNumber);
              if (mIdx !== -1) {
                window.userContributions[mIdx].url = result.prUrl;
                window.userContributions[mIdx].prNumber = result.prNumber;
              }
            }
          } catch (e) {}
          
          window.setResourceStatus(`PR created! <a href="${result.prUrl}" target="_blank" class="text-blue-400 underline hover:text-blue-300">View Pull Request</a>.`);
          window.showCelebration('Thank you for sharing this resource!');
          
          setTimeout(() => {
            window.closeResourceAdder();
          }, 2500);
          
          const localAppendedMarkdown = [
            '',
            `- type: ${type}`,
            `\ttitle: "${title}"`,
            `\turl: "${url}"`,
            `\tauthor: "${window.auth.user.login}"`,
            `\tstatus: "WAITING FOR APPROVAL"`,
            isIncognito ? `\tincognito: "true"` : null,
            ''
          ].filter(l => l !== null).join('\n');
          
          window.currentRawNote = window.currentRawNote + '\n' + localAppendedMarkdown;
          if (window.currentNotePath === path && window.currentTab) {
             window.handleTab(window.currentTab);
          }
          
          const pollInterval = setInterval(async () => {
             try {
                const check = await fetch(`/api/prStatus?number=${result.prNumber}`);
                if (!check.ok) return;
                const checkData = await check.json();
                if (checkData.merged) {
                   clearInterval(pollInterval);
                   if (window.currentNotePath === path) {
                      window.loadVaultFile(path);
                   }
                }
             } catch (e) {}
          }, 5000);
          
        } catch (err) {
          try {
            const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
            const filtered = localPRs.filter(p => p.prNumber !== tempPrNumber);
            sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(filtered));
            if (window.userContributions) {
              window.userContributions = window.userContributions.filter(p => p.prNumber !== tempPrNumber);
            }
          } catch (e) {}
          console.error('Resource submission error:', err);
          window.setResourceStatus('Contribution failed. Please try again.', true);
        }
      };

      window.updateContributionControls = () => {
        const container = document.getElementById('contrib-controls');
        if (!container) return;
        container.innerHTML = `
          <button onclick="window.openEditor(window.currentNotePath)" class="rounded-2xl bg-[#1a4f7f] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#d5e9ff] hover:bg-[#2b74b0]">Edit note</button>
          <button onclick="window.openResourceAdder()" class="rounded-2xl bg-[#17548c] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#d5e9ff] hover:bg-[#2d74b4]">Add resources</button>
        `;
      };

window.closeDeleteModal = () => {
        document.getElementById('delete-modal').classList.add('hidden');
      };

      window.closeRevertModal = () => {
        document.getElementById('revert-modal').classList.add('hidden');
      };

      window.closeCelebration = () => {
        const overlay = document.getElementById('celebrate-overlay');
        if (overlay) overlay.classList.add('hidden');
        // Remove all confetti pieces
        document.querySelectorAll('.confetti-piece').forEach(el => el.remove());
      };

      window.showCelebration = (subtext) => {
        const overlay = document.getElementById('celebrate-overlay');
        const card = document.getElementById('celebrate-card');
        const sub = document.getElementById('celebrate-subtext');
        if (!overlay || !card) return;
        if (sub && subtext) sub.textContent = subtext;

        // Reset card animation
        card.style.animation = 'none';
        card.offsetHeight; // reflow
        card.style.animation = 'celebrate-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards';

        overlay.classList.remove('hidden');

        // Auto-close after 5 seconds
        clearTimeout(window._celebrationTimer);
        window._celebrationTimer = setTimeout(() => window.closeCelebration(), 5500);

        // Launch full-size fireworks confetti
        var duration = 4000;
        var end = Date.now() + duration;
        var colors = ['#8ecae6','#219ebc','#ffb703','#fb8500','#a8e6cf','#c3a1e0','#ff6b9d'];

        (function frame() {
          if (typeof confetti !== 'undefined') {
            confetti({
              particleCount: 8,
              angle: 270,
              spread: 130,
              startVelocity: 35,
              origin: { x: 0.5, y: -0.1 },
              colors: colors,
              zIndex: 99999,
              ticks: 300,
              gravity: 1.2
            });
          }
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());
      };

      window.deleteResource = async (fileId, title, url, btnElement, type = 'resource', status = 'CONTRIBUTED', isPr = false) => {
        const modal = document.getElementById('delete-modal');
        document.getElementById('delete-modal-title').innerText = title;
        modal.classList.remove('hidden');

        const confirmBtn = document.getElementById('confirm-delete-btn');
        // Clear previous event listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', async () => {
          window.closeDeleteModal();
          const originalText = btnElement.innerText;
          btnElement.innerText = "Deleting...";
          btnElement.disabled = true;

          try {
            const isResourcePR = isPr && type === 'resource';
            if (status !== 'NOT APPROVED' && !isResourcePR) {
              const resp = await fetch('/api/directDelete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: fileId, title: title, type: type })
              });
              const result = await resp.json();
              if (!resp.ok) throw new Error(result.error || 'Deletion failed');
            }
            
            btnElement.innerText = "Deleted Successfully";
            btnElement.classList.replace("bg-rose-900/40", "bg-emerald-900/40");
            btnElement.classList.replace("border-rose-800", "border-emerald-800");
            btnElement.classList.replace("text-rose-200", "text-emerald-200");
            
            // Store in localStorage to hide it from CDN cache for 10 minutes
            try {
               const deletedList = JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]');
               deletedList.push({ title, fileId, type, time: Date.now() });
               localStorage.setItem('gaiabasin_deleted_res', JSON.stringify(deletedList));
            } catch (e) {}

            // Dynamically remove from the local state
            window.allResources = window.allResources.filter(r => r.title !== title || r.fileId !== fileId);

            if (type === 'note' || type === 'branch') {
              // Filter window.processedNodes and window.processedLinks
              window.processedNodes = window.processedNodes.filter(n => {
                 return n.id !== fileId && !n.id.startsWith(fileId + '/');
              });
              window.processedLinks = window.processedLinks.filter(l => {
                 const fromExists = window.processedNodes.some(n => n.id === l.from);
                 const toExists = window.processedNodes.some(n => n.id === l.to);
                 return fromExists && toExists;
              });

              // Filter window.folderTree
              const filterTree = (node) => {
                 node.children = node.children.filter(child => child.id !== fileId && !child.id.startsWith(fileId + '/'));
                 node.files = node.files.filter(file => file.id !== fileId);
                 node.children.forEach(filterTree);
              };
              filterTree(window.folderTree);
            }

            // Re-render sidebar tree and interactive graph immediately
            window.populateVaultTree();
            if (window.graphNetwork) {
               window.createMainGraph(null, null, null);
            }
            
            // Refresh Account Dashboard tab
            if (window.currentAccountTab && !document.getElementById('account-modal').classList.contains('hidden')) {
               window.setAccountTab(window.currentAccountTab);
            }
            
            // Refresh Note view
            if (window.currentNotePath === fileId && !document.getElementById('node-viewer').classList.contains('hidden')) {
               window.loadVaultFile(window.currentNotePath);
            }
            
            setTimeout(() => window.closeDeleteModal(), 1000);
            
          } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
            btnElement.innerText = "Error";
            btnElement.disabled = false;
          }
        });
      };

      window.revertEdit = async (nodeId, title, fileId, btnElement) => {
        const modal = document.getElementById('revert-modal');
        document.getElementById('revert-modal-title').innerText = title;
        modal.classList.remove('hidden');

        const confirmBtn = document.getElementById('confirm-revert-btn');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.addEventListener('click', async () => {
          window.closeRevertModal();
          const originalText = btnElement.innerText;
          btnElement.innerText = "Reverting...";
          btnElement.disabled = true;

          try {
            const resp = await fetch('/api/revertEdit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nodeId: nodeId, title: `Revert Edit: ${title}` })
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Revert failed');

            btnElement.innerText = "Reverted!";
            btnElement.classList.replace("bg-amber-900/40", "bg-emerald-900/40");
            btnElement.classList.replace("border-amber-800", "border-emerald-800");
            btnElement.classList.replace("text-amber-200", "text-emerald-200");
            
            try {
               const deletedList = JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]');
               deletedList.push({ title, fileId, type: 'edited_note', time: Date.now(), nodeId });
               localStorage.setItem('gaiabasin_deleted_res', JSON.stringify(deletedList));
            } catch (e) {}

            setTimeout(() => {
               btnElement.innerText = originalText;
               btnElement.disabled = false;
               if (result.mergeError) {
                  alert("PR was created but auto-merge failed: " + result.mergeError);
               } else {
                  window.showCelebration('Revert Pull Request successfully auto-merged!');
               }
            }, 1000);
            
          } catch (e) {
            console.error(e);
            if (e.message && (e.message.toLowerCase().includes("already exists") || e.message.toLowerCase().includes("already been reverted"))) {
               try {
                  const deletedList = JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]');
                  deletedList.push({ title, fileId, type: 'edited_note', time: Date.now(), nodeId });
                  localStorage.setItem('gaiabasin_deleted_res', JSON.stringify(deletedList));
               } catch (err) {}
               
               btnElement.innerText = "Already Reverted";
               btnElement.classList.replace("bg-amber-900/40", "bg-emerald-900/40");
               btnElement.classList.replace("border-amber-800", "border-emerald-800");
               btnElement.classList.replace("text-amber-200", "text-emerald-200");
               setTimeout(() => {
                  btnElement.innerText = originalText;
                  btnElement.disabled = false;
                  window.showCelebration('You already reverted this! It is now hidden.');
               }, 1500);
            } else {
               alert("Error: " + e.message);
               btnElement.innerText = "Error";
               btnElement.disabled = false;
            }
          }
        });
      };

      window.addEventListener('DOMContentLoaded', async () => {
        window.createMainGraph = (savedPositions, savedViewPos, savedScale) => {
          const container = document.getElementById('graph-canvas');

          const nodeDataset = new vis.DataSet(window.processedNodes.map(n => ({
            id: n.id,
            label: n.label,
            shape: n.shape,
            color: {
              background: n.color,
              border: '#f8fafc',
              highlight: { background: '#ffffff', border: '#81b7ff' },
              hover: { background: '#cfe4ff', border: '#ffffff' }
            },
            borderWidth: 1,
            size: Math.max(n.size || 14, 16),
            font: { color: '#edf2f7', size: 11, face: 'Inter, Arial', strokeWidth: 0 },
            shadow: false,
            isFolder: n.isFolder,
            path: n.path,
            // Restore saved positions when recreating after note close
            x: savedPositions ? savedPositions[n.id]?.x : undefined,
            y: savedPositions ? savedPositions[n.id]?.y : undefined
          })));

          const edgeDataset = new vis.DataSet(window.processedLinks.map(l => ({
            from: l.from, to: l.to,
            color: { color: 'rgba(255,255,255,0.18)', highlight: 'rgba(255,255,255,0.32)' },
            width: 1
          })));

          const network = new vis.Network(container, { nodes: nodeDataset, edges: edgeDataset }, {
            interaction: { dragView: true, zoomView: true, dragNodes: true, hover: true },
            physics: {
              enabled: true,
              solver: 'barnesHut',
              barnesHut: {
                gravitationalConstant: -2000,
                centralGravity: 0.3,
                springLength: 95,
                springConstant: 0.04,
                damping: 0.09,
                avoidOverlap: 0.1
              },
              stabilization: {
                enabled: !savedPositions,
                iterations: 200,
                updateInterval: 25,
                onlyDynamicEdges: false,
                fit: false
              }
            }
          });

          window.graphNetwork = network;

          if (savedPositions) {
            // Restore view position from before note was opened
            network.moveTo({ position: savedViewPos, scale: savedScale, animation: false });
          } else {
            // First load: wait for physics to stabilize, then fit
            network.on('stabilizationIterationsDone', () => {
              network.fit({ animation: false });
            });
          }

          network.on('click', (params) => {
            if (params.nodes.length > 0) {
              const nodeId = params.nodes[0];
              window.setGraphFocus(nodeId);
              window.openNote(nodeId);
            }
          });
        };

        // ─── Live Graph Sync ──────────────────────────────────────────────────
        window.showGraphToast = (message) => {
          const toast = document.getElementById('graph-sync-toast');
          const label = document.getElementById('graph-sync-toast-text');
          if (!toast) return;
          if (label) label.textContent = message;
          toast.classList.remove('hidden', 'opacity-0');
          toast.classList.add('opacity-100');
          clearTimeout(window._toastTimer);
          window._toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
          }, 3500);
        };

        window.startLiveGraphSync = () => {
          const REPO_USER_SYNC = 'AnnacKK';
          const REPO_NAME_SYNC = 'GAIA_BASIN_NOTES';
          const REPO_BRANCH_SYNC = 'main';
          const POLL_INTERVAL = 30000; // 30 seconds

          let lastKnownSha = null;

          const updateSyncStatus = (state, timeStr) => {
            const dot = document.getElementById('sync-status-dot');
            const label = document.getElementById('sync-status-time');
            if (!label) return;
            label.textContent = timeStr;
            if (!dot) return;
            const ping = dot.querySelector('span:first-child');
            const solid = dot.querySelector('span:last-child');
            if (state === 'syncing') {
              if (ping) { ping.classList.remove('bg-emerald-400','bg-yellow-400','bg-rose-400'); ping.classList.add('bg-yellow-400'); }
              if (solid) { solid.classList.remove('bg-emerald-500','bg-yellow-500','bg-rose-500'); solid.classList.add('bg-yellow-500'); }
            } else if (state === 'updated') {
              if (ping) { ping.classList.remove('bg-emerald-400','bg-yellow-400','bg-rose-400'); ping.classList.add('bg-emerald-400'); }
              if (solid) { solid.classList.remove('bg-emerald-500','bg-yellow-500','bg-rose-500'); solid.classList.add('bg-emerald-500'); }
            } else if (state === 'error') {
              if (ping) { ping.classList.remove('bg-emerald-400','bg-yellow-400','bg-rose-400'); ping.classList.add('bg-rose-400'); }
              if (solid) { solid.classList.remove('bg-emerald-500','bg-yellow-500','bg-rose-500'); solid.classList.add('bg-rose-500'); }
            }
          };

          const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const fetchTree = async () => {
            try {
              const r = await fetch(`/api/tree`);
              if (!r.ok) return null;
              const data = await r.json();
              return data;
            } catch { return null; }
          };

          const syncGraph = async () => {
            if (document.visibilityState === 'hidden') return;
            if (!window.graphNetwork) return;

            updateSyncStatus('syncing', 'Checking…');

            const treeData = await fetchTree();
            if (!treeData || !treeData.sha) {
              updateSyncStatus('error', `Error · ${fmtTime()}`);
              return;
            }

            const newSha = treeData.sha;

            if (!lastKnownSha) {
              lastKnownSha = newSha;
              updateSyncStatus('updated', `Ready · ${fmtTime()}`);
              return;
            }

            if (newSha === lastKnownSha) {
              updateSyncStatus('updated', `Up to date · ${fmtTime()}`);
              return;
            }

            lastKnownSha = newSha;
            if (!Array.isArray(treeData.tree)) return;

            const currentNodeIds = new Set(window.processedNodes.map(n => n.id));
            const deletedList = (() => { try { return JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]'); } catch { return []; } })();

            const currentTreePaths = new Set(treeData.tree.map(i => i.path));
            const nodesToRemove = [];
            for (const nodeId of currentNodeIds) {
               if (nodeId !== 'root' && !currentTreePaths.has(nodeId)) {
                  nodesToRemove.push(nodeId);
               }
            }

            const newFileItems = treeData.tree.filter(item =>
              item.type === 'blob' &&
              item.path.toLowerCase().endsWith('.md') &&
              !currentNodeIds.has(item.path) &&
              !deletedList.some(d => (d.type === 'note' || d.type === 'branch') && d.fileId === item.path)
            );

            const newFolderPaths = new Set();
            for (const item of newFileItems) {
              const segments = item.path.split('/');
              segments.pop();
              let path = '';
              for (const seg of segments) {
                path = path ? `${path}/${seg}` : seg;
                if (!currentNodeIds.has(path)) newFolderPaths.add(path);
              }
            }

            if (newFileItems.length === 0 && newFolderPaths.size === 0 && nodesToRemove.length === 0) return;

            // Build new nodes and edges
            const newNodes = [];
            const newEdges = [];

            // Add new folder nodes
            for (const folderPath of newFolderPaths) {
              const segments = folderPath.split('/');
              const label = segments[segments.length - 1];
              const parentId = segments.length > 1 ? segments.slice(0, -1).join('/') : 'root';
              const folderNode = { id: folderPath, label, isFolder: true, color: '#f8fafc', shape: 'dot', size: 18, path: folderPath };
              window.processedNodes.push(folderNode);
              currentNodeIds.add(folderPath);
              newNodes.push({
                id: folderPath, label,
                shape: 'dot',
                color: { background: '#f8fafc', border: '#f8fafc', highlight: { background: '#ffffff', border: '#81b7ff' }, hover: { background: '#cfe4ff', border: '#ffffff' } },
                borderWidth: 1, size: 18,
                font: { color: '#edf2f7', size: 11, face: 'Inter, Arial', strokeWidth: 0 }
              });
              window.processedLinks.push({ from: parentId, to: folderPath });
              newEdges.push({ from: parentId, to: folderPath, color: { color: 'rgba(255,255,255,0.18)', highlight: 'rgba(255,255,255,0.32)' }, width: 1 });
            }

            // Add new file nodes
            for (const item of newFileItems) {
              const segments = item.path.split('/');
              const fileName = segments[segments.length - 1].replace(/\.md$/i, '');
              const parentId = segments.length > 1 ? segments.slice(0, -1).join('/') : 'root';
              const fileNode = { id: item.path, label: fileName, isFolder: false, color: '#cbd5e1', shape: 'dot', size: 14, path: item.path };
              window.processedNodes.push(fileNode);
              currentNodeIds.add(item.path);
              newNodes.push({
                id: item.path, label: fileName,
                shape: 'dot',
                color: { background: '#cbd5e1', border: '#f8fafc', highlight: { background: '#ffffff', border: '#81b7ff' }, hover: { background: '#cfe4ff', border: '#ffffff' } },
                borderWidth: 1, size: 16,
                font: { color: '#edf2f7', size: 11, face: 'Inter, Arial', strokeWidth: 0 }
              });
              window.processedLinks.push({ from: parentId, to: item.path });
              newEdges.push({ from: parentId, to: item.path, color: { color: 'rgba(255,255,255,0.18)', highlight: 'rgba(255,255,255,0.32)' }, width: 1 });
            }

            if (nodesToRemove.length > 0) {
              window.processedNodes = window.processedNodes.filter(n => !nodesToRemove.includes(n.id));
              window.processedLinks = window.processedLinks.filter(l => !nodesToRemove.includes(l.from) && !nodesToRemove.includes(l.to));
            }

            // Live-patch vis.js datasets
            try {
              const net = window.graphNetwork;
              if (nodesToRemove.length > 0) net.body.data.nodes.remove(nodesToRemove);
              if (newNodes.length > 0) net.body.data.nodes.add(newNodes);
              if (newEdges.length > 0) net.body.data.edges.add(newEdges);
            } catch (e) { console.warn('Graph patch error:', e); }

            let toastMsg = [];
            if (newNodes.length > 0) toastMsg.push(`${newFileItems.length + newFolderPaths.size} added`);
            if (nodesToRemove.length > 0) toastMsg.push(`${nodesToRemove.length} removed`);
            window.showGraphToast(`Graph updated: ${toastMsg.join(', ')}`);
            updateSyncStatus('updated', `Updated · ${fmtTime()}`);
          };

          // Initial baseline capture
          fetchTree().then(data => {
            if (data && data.sha) lastKnownSha = data.sha;
            updateSyncStatus('updated', `Ready · ${fmtTime()}`);
          });

          // Start polling
          window._liveGraphSyncInterval = setInterval(syncGraph, POLL_INTERVAL);

          // Pause when tab is hidden, resume when visible
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') syncGraph();
          });
        };

        // Add Node Modal handlers

        window.uploadedNodeFile = null;

window.openAddNodeModal = () => {
          if (!window.auth?.user) {
            window.showAuthAlert("Only logged in users can add notes.");
            return;
          }

          // Clear uploaded file state
          if (window.uploadedNodeFile) {
            window.removeUploadedNodeFile();
          } else {
            // Re-enable and reset fields just in case
            const titleInput = document.getElementById('new-node-title');
            const contentTextarea = document.getElementById('new-node-content');
            titleInput.value = '';
            titleInput.disabled = false;
            titleInput.classList.remove('opacity-50', 'cursor-not-allowed');
            contentTextarea.value = '';
            contentTextarea.disabled = false;
            contentTextarea.classList.remove('opacity-50', 'cursor-not-allowed');
          }

          document.getElementById('new-node-commit').value = 'Add new note';
          document.getElementById('new-node-pr-desc').value = '';
          document.getElementById('new-node-status').innerText = '';

          const folderSelect = document.getElementById('new-node-folder');
          if (folderSelect) {
            const folders = window.processedNodes.filter(n => n.isFolder);
            folderSelect.innerHTML = folders.map(f => `<option value="${f.id}">${f.label} (${f.id})</option>`).join('');
          }

          document.getElementById('add-node-modal').classList.remove('hidden');
          document.body.style.overflow = 'hidden';
          window.updateUploadButtonState();
        };

        window.closeAddNodeModal = () => {
          document.getElementById('add-node-modal').classList.add('hidden');
          document.body.style.overflow = '';
        };

        window.handleNodeUploadClick = () => {
          if (window.uploadedNodeFile) {
            alert("For adding multiple notes please click Add Branch");
            return;
          }
          document.getElementById('new-node-file-upload').click();
        };

        window.handleNodeFileUpload = (input) => {
          const file = input.files[0];
          if (!file) return;
          if (!file.name.toLowerCase().endsWith('.md')) {
            alert("Please select a markdown (.md) file.");
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => {
            window.uploadedNodeFile = file;

            const titleInput = document.getElementById('new-node-title');
            const contentTextarea = document.getElementById('new-node-content');

            // Fill inputs
            contentTextarea.value = e.target.result;
            const titleWithoutExt = file.name.slice(0, -3);
            titleInput.value = titleWithoutExt;

            // Lock inputs
            titleInput.disabled = true;
            contentTextarea.disabled = true;
            titleInput.classList.add('opacity-50', 'cursor-not-allowed');
            contentTextarea.classList.add('opacity-50', 'cursor-not-allowed');

            // Display filename & delete button
            const statusContainer = document.getElementById('new-node-upload-status');
            statusContainer.innerHTML = `
              <span class="text-xs text-slate-300 bg-[#0a2336] border border-[#1b3e63] px-3 py-1.5 rounded-full flex items-center gap-2">
                <span class="font-semibold text-emerald-400">📄 ${file.name}</span>
                <button onclick="event.stopPropagation(); event.preventDefault(); window.removeUploadedNodeFile()" type="button" class="text-rose-400 hover:text-rose-300 font-bold ml-2 p-1 cursor-pointer transition-colors" title="Remove uploaded file">✕</button>
              </span>
            `;
          };
          reader.readAsText(file);
        };

        window.removeUploadedNodeFile = () => {
          window.uploadedNodeFile = null;

          const titleInput = document.getElementById('new-node-title');
          const contentTextarea = document.getElementById('new-node-content');

          // Reset inputs
          titleInput.value = '';
          titleInput.disabled = false;
          titleInput.classList.remove('opacity-50', 'cursor-not-allowed');

          contentTextarea.value = '';
          contentTextarea.disabled = false;
          contentTextarea.classList.remove('opacity-50', 'cursor-not-allowed');

          const fileInput = document.getElementById('new-node-file-upload');
          if (fileInput) fileInput.value = '';

          // Re-render upload button
          const statusContainer = document.getElementById('new-node-upload-status');
          statusContainer.innerHTML = `
            <span id="new-node-upload-or-text" class="text-xs text-slate-500 font-semibold uppercase tracking-wider transition-opacity duration-200">or</span>
            <button id="new-node-upload-btn" onclick="window.handleNodeUploadClick()" type="button" class="text-xs font-semibold text-[#8ecae6] hover:text-white transition-colors bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 cursor-pointer flex items-center gap-1.5 transition-all duration-200">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Upload File (.md)
            </button>
            <input type="file" id="new-node-file-upload" accept=".md" class="hidden" onchange="window.handleNodeFileUpload(this)" />
          `;
          window.updateUploadButtonState();
        };

        window.updateUploadButtonState = () => {
          const titleVal = document.getElementById('new-node-title').value.trim();
          const contentVal = document.getElementById('new-node-content').value;
          const isTyping = titleVal.length > 0 || contentVal.trim().length > 0;

          const btn = document.getElementById('new-node-upload-btn');
          const orText = document.getElementById('new-node-upload-or-text');
          if (btn) {
            if (isTyping && !window.uploadedNodeFile) {
              btn.disabled = true;
              btn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
              if (orText) orText.classList.add('opacity-30');
            } else {
              btn.disabled = false;
              btn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
              if (orText) orText.classList.remove('opacity-30');
            }
          }
        };

        window.submitNewNode = async () => {
          const folder = document.getElementById('new-node-folder').value;
          const commitMessage = document.getElementById('new-node-commit').value.trim();
          const prDescription = document.getElementById('new-node-pr-desc').value.trim();
          const statusEl = document.getElementById('new-node-status');

          let title = '';
          let content = '';

          if (window.uploadedNodeFile) {
            title = window.uploadedNodeFile.name;
            if (title.toLowerCase().endsWith('.md')) {
              title = title.slice(0, -3);
            }
            content = document.getElementById('new-node-content').value;
          } else {
            title = document.getElementById('new-node-title').value.trim();
            content = document.getElementById('new-node-content').value;

            if (!title || !content) {
              statusEl.innerText = 'Title and content are required.';
              statusEl.className = 'text-sm text-rose-300';
              return;
            }
          }

          // Build clean path
          let path = '';
          if (folder === 'root') {
            path = `${title}.md`;
          } else {
            path = `${folder}/${title}.md`;
          }

          // Inject author: username in YAML frontmatter
          const nickname = window.auth?.user?.login || 'anonymous';
          const authorLine = `author: ${nickname}`;
          let processedContent = content;
          const fmMatch = content.match(/^---([\s\S]*?)---/);
          if (fmMatch) {
            const innerFm = fmMatch[1];
            if (!innerFm.includes('author:')) {
              processedContent = content.replace(/^---/, `---\n${authorLine}`);
            }
          } else {
            processedContent = `---\n${authorLine}\n---\n${content}`;
          }

          const tempPrNumber = 'temp-' + Date.now();
          const tempPR = {
            isPr: true,
            type: 'note',
            title: title,
            url: '#',
            status: 'WAITING FOR APPROVAL',
            prNumber: tempPrNumber,
            fileId: path,
            author: nickname,
            incognito: false
          };

          try {
            const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
            localPRs.push(tempPR);
            sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
            if (!window.userContributions) window.userContributions = [];
            window.userContributions.push(tempPR);
          } catch (e) {}

          statusEl.innerText = 'Submitting pull request...';
          statusEl.className = 'text-sm text-slate-400';

          try {
            const response = await fetch('/api/contribute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path, content: processedContent, commitMessage: `Add Note: ${title} - ${commitMessage}`, prDescription })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Submission failed');

            try {
              const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
              const idx = localPRs.findIndex(p => p.prNumber === tempPrNumber);
              if (idx !== -1) {
                localPRs[idx].url = result.prUrl;
                localPRs[idx].prNumber = result.prNumber;
              }
              sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
              if (window.userContributions) {
                const mIdx = window.userContributions.findIndex(p => p.prNumber === tempPrNumber);
                if (mIdx !== -1) {
                  window.userContributions[mIdx].url = result.prUrl;
                  window.userContributions[mIdx].prNumber = result.prNumber;
                }
              }
            } catch (e) {}

            statusEl.innerHTML = `PR Created! <a href="${result.prUrl}" target="_blank" class="text-blue-400 underline">View PR</a>`;
            statusEl.className = 'text-sm text-[#8ecae6]';
            window.showCelebration('Thank you for creating a new Note!');

            setTimeout(() => {
              window.closeAddNodeModal();
            }, 3000);
          } catch (err) {
            try {
              const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
              const filtered = localPRs.filter(p => p.prNumber !== tempPrNumber);
              sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(filtered));
              if (window.userContributions) {
                window.userContributions = window.userContributions.filter(p => p.prNumber !== tempPrNumber);
              }
            } catch (e) {}
            statusEl.innerText = err.message || 'Error proposing note.';
            statusEl.className = 'text-sm text-rose-300';
          }
        };

        // Export Modal Handlers

window.openAddBranchModal = () => {
          if (!window.auth?.user) {
            window.showAuthAlert("Only logged in users can add folders.");
            return;
          }

          window.selectedBranchFiles = [];
          document.getElementById('new-branch-upload').value = '';
          document.getElementById('upload-box-text').innerText = "Click to select a folder from your computer";
          document.getElementById('new-branch-commit').value = 'Propose new folder branch structure';
          document.getElementById('new-branch-pr-desc').value = '';
          document.getElementById('new-branch-status').innerText = '';

          const parentSelect = document.getElementById('new-branch-parent');
          if (parentSelect) {
            const folders = window.processedNodes.filter(n => n.isFolder);
            parentSelect.innerHTML = `<option value="root">Base Vault (Root)</option>` + 
              folders.filter(f => f.id !== 'root').map(f => `<option value="${f.id}">${f.label} (${f.id})</option>`).join('');
          }

          document.getElementById('add-branch-modal').classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        };

        window.closeAddBranchModal = () => {
          document.getElementById('add-branch-modal').classList.add('hidden');
          document.body.style.overflow = '';
        };

        window.isValidFolderName = (name) => {
          if (!name || name.trim() === '') return false;
          // Reject names that look like random hashes (8+ hex/alphanumeric characters)
          const hashRegex = /^[a-f0-9]{8,}$/i;
          if (hashRegex.test(name)) return false;

          // Reject purely numeric names unless it's a year/date like 1900-2100
          if (/^\d+$/.test(name)) {
            const val = parseInt(name, 10);
            if (val < 1900 || val > 2100) return false;
          }

          // Ensure it contains at least one letter (unless it's a year)
          if (!/[a-zA-Z]/.test(name) && !(/^\d{4}$/.test(name))) return false;

          // Reject sequences without vowels that are longer than 4 letters (gibberish strings)
          const words = name.split(/[\s\-_]+/);
          for (const word of words) {
            if (word.length > 4 && !/[aeiouyAEIOUY]/i.test(word) && !/^\d+$/.test(word)) {
              return false;
            }
          }
          return true;
        };

        window.selectedBranchFiles = [];
        window.handleBranchFolderUpload = (input) => {
          const files = Array.from(input.files);
          const mdFiles = files.filter(f => f.name.toLowerCase().endsWith('.md'));
          if (mdFiles.length === 0) {
            alert("No markdown (.md) files found in the selected folder.");
            document.getElementById('upload-box-text').innerText = "Click to select a folder from your computer";
            window.selectedBranchFiles = [];
            return;
          }

          // Extract and validate all folder and subfolder names in relative paths
          const folderNames = new Set();
          for (const file of mdFiles) {
            const segments = file.webkitRelativePath.split('/');
            segments.pop(); // remove filename
            segments.forEach(seg => {
              if (seg) folderNames.add(seg);
            });
          }

          for (const folderName of folderNames) {
            if (!window.isValidFolderName(folderName)) {
              alert(`Invalid folder or subfolder name detected: "${folderName}".\nFolder names must be readable names, not random letters or numbers.`);
              document.getElementById('upload-box-text').innerText = "Click to select a folder from your computer";
              window.selectedBranchFiles = [];
              input.value = '';
              return;
            }
          }

          window.selectedBranchFiles = mdFiles;
          const rootFolderName = mdFiles[0].webkitRelativePath.split('/')[0];
          document.getElementById('upload-box-text').innerHTML = `Selected <strong class="text-white">${mdFiles.length}</strong> markdown files from folder: <strong class="text-[#8ecae6]">${rootFolderName}</strong>`;
        };

        window.submitNewBranch = async () => {
          const parent = document.getElementById('new-branch-parent').value;
          const commitMessage = document.getElementById('new-branch-commit').value.trim();
          const prDescription = document.getElementById('new-branch-pr-desc').value.trim();
          const statusEl = document.getElementById('new-branch-status');

          if (!window.selectedBranchFiles || window.selectedBranchFiles.length === 0) {
            statusEl.innerText = 'Please select a local folder to upload.';
            statusEl.className = 'text-sm text-rose-300';
            return;
          }

          statusEl.innerText = 'Reading folder files...';
          statusEl.className = 'text-sm text-slate-400';

          try {
            const nickname = window.auth?.user?.login || 'anonymous';
            const authorLine = `author: ${nickname}`;
            const fileReadPromises = window.selectedBranchFiles.map(file => {
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  let repoPath = file.webkitRelativePath;
                  if (parent !== 'root') {
                    repoPath = `${parent}/${file.webkitRelativePath}`;
                  }

                  let processedContent = e.target.result;
                  const fmMatch = processedContent.match(/^---([\s\S]*?)---/);
                  if (fmMatch) {
                    const innerFm = fmMatch[1];
                    if (!innerFm.includes('author:')) {
                      processedContent = processedContent.replace(/^---/, `---\n${authorLine}`);
                    }
                  } else {
                    processedContent = `---\n${authorLine}\n---\n${processedContent}`;
                  }

                  resolve({ path: repoPath, content: processedContent });
                };
                reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsText(file);
              });
            });

            const filesPayload = await Promise.all(fileReadPromises);

            const rootFolderName = window.selectedBranchFiles[0].webkitRelativePath.split('/')[0];

            const tempPrNumber = 'temp-' + Date.now();
            const tempPR = {
              isPr: true,
              type: 'branch',
              title: rootFolderName,
              url: '#',
              status: 'WAITING FOR APPROVAL',
              prNumber: tempPrNumber,
              fileId: parent === 'root' ? rootFolderName : `${parent}/${rootFolderName}`,
              author: nickname,
              incognito: false
            };

            try {
              const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
              localPRs.push(tempPR);
              sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
              if (!window.userContributions) window.userContributions = [];
              window.userContributions.push(tempPR);
            } catch (e) {}

            statusEl.innerText = 'Submitting pull request to GitHub...';

            const response = await fetch('/api/contribute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: filesPayload, commitMessage: `Add Branch: ${rootFolderName} - ${commitMessage}`, prDescription })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Submission failed');

            try {
              const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
              const idx = localPRs.findIndex(p => p.prNumber === tempPrNumber);
              if (idx !== -1) {
                localPRs[idx].url = result.prUrl;
                localPRs[idx].prNumber = result.prNumber;
              }
              sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(localPRs));
              if (window.userContributions) {
                const mIdx = window.userContributions.findIndex(p => p.prNumber === tempPrNumber);
                if (mIdx !== -1) {
                  window.userContributions[mIdx].url = result.prUrl;
                  window.userContributions[mIdx].prNumber = result.prNumber;
                }
              }
            } catch (e) {}

            statusEl.innerHTML = `PR Created! <a href="${result.prUrl}" target="_blank" class="text-blue-400 underline font-semibold">View PR</a>`;
            statusEl.className = 'text-sm text-[#8ecae6]';
            window.showCelebration('Thank you for proposing a new Branch!');

            setTimeout(() => {
              window.closeAddBranchModal();
            }, 5000);

          } catch (err) {
            try {
              const localPRs = JSON.parse(sessionStorage.getItem('gaiabasin_local_prs') || '[]');
              const filtered = localPRs.filter(p => p.prNumber !== tempPrNumber);
              sessionStorage.setItem('gaiabasin_local_prs', JSON.stringify(filtered));
              if (window.userContributions) {
                window.userContributions = window.userContributions.filter(p => p.prNumber !== tempPrNumber);
              }
            } catch (e) {}
            statusEl.innerText = err.message || 'Error proposing branch.';
            statusEl.className = 'text-sm text-rose-300';
          }
        };

        window.downloadFolder = async (folderId, folderLabel) => {
          const targetFolder = window.findFolderNode(folderId);
          if (!targetFolder) {
            alert("Folder not found.");
            return;
          }

          const filesToDownload = [];
          const collectFiles = (folder) => {
            // Strictly check and ensure only .md files are processed
            folder.files.forEach(f => {
              if (f.id.toLowerCase().endsWith('.md')) {
                filesToDownload.push(f);
              }
            });
            folder.children.forEach(c => collectFiles(c));
          };
          collectFiles(targetFolder);

          if (filesToDownload.length === 0) {
            alert("No markdown (.md) files found in this folder.");
            return;
          }

          // Check if browser supports File System Access API
          const supportsFileSystemAccess = 'showDirectoryPicker' in window;

          if (supportsFileSystemAccess) {
            try {
              // Prompt user to select directory
              const parentDirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
              });

              // Create dynamic status toast
              const toast = document.createElement('div');
              toast.className = 'fixed bottom-6 right-6 z-[200] bg-[#051a33] border border-[#1b3e63] rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 text-sm text-slate-200 transition-opacity duration-300';
              toast.innerHTML = `
                <svg class="animate-spin h-5 w-5 text-[#8ecae6]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Writing folder <strong class="text-white">${folderLabel}</strong> to disk...</span>
              `;
              document.body.appendChild(toast);

              const getOrCreateDirHandle = async (parentHandle, pathSegments) => {
                let currentHandle = parentHandle;
                for (const segment of pathSegments) {
                  currentHandle = await currentHandle.getDirectoryHandle(segment, { create: true });
                }
                return currentHandle;
              };

              // Fetch and write each file natively
              for (const file of filesToDownload) {
                const encodedPath = file.id.split('/').map(encodeURIComponent).join('/');
                const resp = await fetch(`/api/fileContent?path=${encodedPath}`);
                if (!resp.ok) throw new Error(`HTTP error ${resp.status} on ${file.id}`);
                const text = await resp.text();

                // Get relative path inside the target folder structure
                let relativePath = file.id;
                if (folderId !== 'root' && file.id.startsWith(folderId + '/')) {
                  relativePath = file.id.slice(folderId.length + 1);
                }

                const segments = relativePath.split('/');
                const fileName = segments.pop();

                // Create intermediate folders if they don't exist
                const targetDirHandle = await getOrCreateDirHandle(parentDirHandle, segments);

                // Write file to native filesystem
                const fileHandle = await targetDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(text);
                await writable.close();
              }

              toast.innerHTML = `
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Folder saved successfully!</span>
              `;
              setTimeout(() => {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 300);
              }, 2500);

            } catch (err) {
              console.error('Folder download failed:', err);
              if (err.name !== 'AbortError') {
                alert("Failed to write folder: " + err.message);
              }
            }
          } else {
            // Fallback to ZIP download
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-6 right-6 z-[200] bg-[#051a33] border border-[#1b3e63] rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3 text-sm text-slate-200 transition-opacity duration-300';
            toast.innerHTML = `
              <svg class="animate-spin h-5 w-5 text-[#8ecae6]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Preparing ZIP fallback download for <strong class="text-white">${folderLabel}</strong>...</span>
            `;
            document.body.appendChild(toast);

            try {
              const zip = new JSZip();

              const promises = filesToDownload.map(async (file) => {
                const encodedPath = file.id.split('/').map(encodeURIComponent).join('/');
                const resp = await fetch(`/api/fileContent?path=${encodedPath}`);
                if (!resp.ok) throw new Error(`HTTP error ${resp.status} on ${file.id}`);
                const text = await resp.text();

                let zipPath = file.id;
                if (folderId !== 'root' && file.id.startsWith(folderId + '/')) {
                  zipPath = file.id.slice(folderId.length + 1);
                }
                zip.file(zipPath, text);
              });

              await Promise.all(promises);

              toast.querySelector('span').innerText = 'Generating ZIP archive...';
              const zipBlob = await zip.generateAsync({ type: 'blob' });

              const link = document.createElement('a');
              link.href = URL.createObjectURL(zipBlob);
              link.download = `${folderLabel}.zip`;
              link.click();

              toast.innerHTML = `
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>Download complete!</span>
              `;
              setTimeout(() => {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 300);
              }, 2500);

            } catch (err) {
              console.error('Folder ZIP download failed:', err);
              toast.innerHTML = `
                <svg class="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>Failed to download folder ZIP: ${err.message}</span>
              `;
              setTimeout(() => {
                toast.classList.add('opacity-0');
                setTimeout(() => toast.remove(), 300);
              }, 4000);
            }
          }
        };

        window.downloadActiveFolder = () => {
          let selectedFolderId = 'root';
          let selectedFolderLabel = 'Vault';
          if (window.graphNetwork) {
            const selected = window.graphNetwork.getSelectedNodes();
            if (selected.length > 0) {
              const nodeId = selected[0];
              const node = window.processedNodes.find(n => n.id === nodeId);
              if (node && node.isFolder) {
                selectedFolderId = node.id;
                selectedFolderLabel = node.label;
              } else {
                alert("Please select a folder node in the graph, or click directly on the sidebar folder download icons.");
                return;
              }
            }
          }
          window.downloadFolder(selectedFolderId, selectedFolderLabel);
        };

        window.downloadSelectedBranchFolder = () => {
          const select = document.getElementById('new-branch-parent');
          if (!select) return;
          const folderId = select.value;
          const folderLabel = select.options[select.selectedIndex].text.split(' (')[0];
          window.downloadFolder(folderId, folderLabel);
        };

        window.createMainGraph(null, null, null); // initial load
        window.startLiveGraphSync(); // begin live polling for new merged content
        window.populateVaultTree();
        window.fetchSession();

        // Initialize Fuzzy Search Engine
        const searchInput = document.getElementById('vault-search');
        const searchResultsContainer = document.getElementById('search-results-container');
        const searchResultsList = document.getElementById('search-results-list');
        const vaultStructureContainer = document.getElementById('vault-structure-container');

        const fileNodesList = window.processedNodes.filter(n => !n.isFolder && n.id !== 'root');
        
        const fuseOptions = {
          keys: ['label'],
          threshold: 0.25,
          distance: 50,
          minMatchCharLength: 2,
          ignoreLocation: true
        };
        const fuse = new Fuse(fileNodesList, fuseOptions);

        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.trim();
          const clearBtn = document.getElementById('clear-search-btn');
          
          if (query === '') {
            clearBtn.classList.add('hidden');
            searchResultsContainer.classList.add('hidden');
            vaultStructureContainer.classList.remove('hidden');
            searchResultsList.innerHTML = '';
            return;
          }

          clearBtn.classList.remove('hidden');
          vaultStructureContainer.classList.add('hidden');
          searchResultsContainer.classList.remove('hidden');

          const results = fuse.search(query);
          if (results.length === 0) {
            searchResultsList.innerHTML = '<li class="text-slate-400 italic px-2">No similar topics found</li>';
            return;
          }

          searchResultsList.innerHTML = results.slice(0, 10).map(result => {
            const file = result.item;
            const safeFileId = file.id.replace(/'/g, "\\'");
            const pathParts = file.id.split('/');
            pathParts.pop(); // Remove filename
            const folderPath = pathParts.join(' / ');
            return `
              <li class="file-item hover:bg-slate-800/50 p-2 rounded-xl cursor-pointer transition-colors" onclick="window.openNote('${safeFileId}')">
                <div class="font-medium text-[#c0d4f5]">${file.label}</div>
                ${folderPath ? `<div class="text-[10px] text-slate-500 mt-0.5">${folderPath}</div>` : ''}
              </li>
            `;
          }).join('');
        });

        // Attach mutual exclusion input listeners
        const titleInputNode = document.getElementById('new-node-title');
        const contentTextareaNode = document.getElementById('new-node-content');
        if (titleInputNode) titleInputNode.addEventListener('input', window.updateUploadButtonState);
        if (contentTextareaNode) contentTextareaNode.addEventListener('input', window.updateUploadButtonState);
      });
        // Researches Window & Modal Handlers
        window.openResearchesWindow = () => {
           document.getElementById('researches-window').classList.remove('hidden');
           window.switchResearchTab('all');
           window.fetchResearches();
        };

        window.switchResearchTab = (tab) => {
           const tabs = ['all', 'roadmaps', 'leetcode', 'blogs'];
           tabs.forEach(t => {
              const btn = document.getElementById('tab-' + t);
              if (btn) {
                 if (t === tab) {
                    btn.className = 'px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 bg-[#1a4f7f] text-white';
                 } else {
                    btn.className = 'px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 text-slate-400 hover:text-slate-200 hover:bg-[#0a1e3f]';
                 }
              }
           });

           const containers = {
              roadmaps: document.getElementById('section-roadmaps-container'),
              leetcode: document.getElementById('section-leetcode-container'),
              blogs: document.getElementById('section-blogs-container'),
              others: document.getElementById('section-others-container')
           };

           const headers = {
              roadmaps: document.getElementById('header-roadmaps'),
              leetcode: document.getElementById('header-leetcode'),
              blogs: document.getElementById('header-blogs'),
              others: document.getElementById('header-others')
           };

           // Hide headers if user is in a specific tab
           Object.keys(headers).forEach(key => {
              if (headers[key]) {
                 if (tab === 'all') {
                    headers[key].classList.remove('hidden');
                 } else {
                    headers[key].classList.add('hidden');
                 }
              }
           });

           if (tab === 'all') {
              if (containers.roadmaps) containers.roadmaps.classList.remove('hidden');
              if (containers.leetcode) containers.leetcode.classList.remove('hidden');
              if (containers.blogs) containers.blogs.classList.remove('hidden');
              if (window.hasOthersContent && containers.others) {
                 containers.others.classList.remove('hidden');
              }
           } else {
              Object.keys(containers).forEach(key => {
                 if (containers[key]) {
                    if (key === tab) {
                       containers[key].classList.remove('hidden');
                    } else {
                       containers[key].classList.add('hidden');
                    }
                 }
              });
           }
        };;

        window.closeResearchesWindow = () => {
           document.getElementById('researches-window').classList.add('hidden');
        };

        window.fetchResearches = async () => {
           const roadmapsGrid = document.getElementById('section-roadmaps');
           const leetcodeGrid = document.getElementById('section-leetcode');
           const blogsGrid = document.getElementById('section-blogs');
           const othersGrid = document.getElementById('section-others');
           const othersContainer = document.getElementById('section-others-container');

           const loadingHTML = '<div class="col-span-full flex justify-center items-center py-10 text-slate-500 text-base">Loading...</div>';
           roadmapsGrid.innerHTML = loadingHTML;
           leetcodeGrid.innerHTML = loadingHTML;
           blogsGrid.innerHTML = loadingHTML;
           if (othersGrid) othersGrid.innerHTML = '';
           if (othersContainer) othersContainer.classList.add('hidden');

           try {
             const res = await fetch('/api/researches');
             if (!res.ok) {
                 if (res.status === 404) {
                     roadmapsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No roadmaps added yet.</div>';
                     leetcodeGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No resources added yet.</div>';
                     blogsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No blog posts added yet.</div>';
                     return;
                 }
                 throw new Error('Failed to fetch');
             }
             const data = await res.json();
             if (!data || data.length === 0) {
                 roadmapsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No roadmaps added yet.</div>';
                 leetcodeGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No resources added yet.</div>';
                 blogsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No blog posts added yet.</div>';
                 return;
             }
             
             const roadmaps = [];
             const leetcode = [];
             const blogs = [];
             const others = [];

             data.reverse().forEach(item => {
                const cat = (item.category || '').toLowerCase().trim();
                if (cat === 'roadmaps') {
                   roadmaps.push(item);
                } else if (cat === 'leetcode style') {
                   leetcode.push(item);
                } else if (cat === 'best blog selections') {
                   blogs.push(item);
                } else {
                   others.push(item);
                }
             });

             const renderCard = (item) => `
               <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="group flex flex-col bg-[#05162a] border border-[#14325a] rounded-2xl overflow-hidden hover:border-[#2b74b0] hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-2xl">
                 ${item.image ? `<div class="h-44 w-full bg-cover bg-center border-b border-[#14325a] group-hover:scale-105 transition-transform duration-500" style="background-image: url('${item.image}')"></div>` : `<div class="h-44 w-full bg-[#0a1e3f] border-b border-[#14325a] flex items-center justify-center text-[#2b74b0]"><svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg></div>`}
                 <div class="p-5 flex-1 flex flex-col">
                   <h3 class="font-bold text-[#d5e9ff] line-clamp-2 leading-tight group-hover:text-white transition-colors">${item.title || item.url}</h3>
                   <p class="text-[11px] text-[#8ecae6] opacity-70 mt-1 uppercase tracking-widest font-bold">By ${item.author || 'Anonymous Contributor'}</p>
                   ${item.description ? `<p class="text-[13px] text-slate-400 mt-2 line-clamp-3 leading-relaxed">${item.description}</p>` : ''}
                   
                   ${item.tags && item.tags.length > 0 ? `
                     <div class="flex flex-wrap gap-1.5 mt-3">
                       ${item.tags.map(tag => `<span class="bg-[#122c4d] text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-sky-900/30 capitalize">${tag}</span>`).join('')}
                     </div>
                   ` : ''}

                   <div class="mt-auto pt-5 flex items-center gap-2 text-xs text-[#348bd2] group-hover:text-[#5c7aff] font-semibold uppercase tracking-wider">
                     <span>Visit Link</span>
                     <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                   </div>
                 </div>
               </a>
             `;

             if (roadmaps.length > 0) {
                roadmapsGrid.innerHTML = roadmaps.map(renderCard).join('');
             } else {
                roadmapsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No roadmaps added yet.</div>';
             }

             if (leetcode.length > 0) {
                leetcodeGrid.innerHTML = leetcode.map(renderCard).join('');
             } else {
                leetcodeGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No resources added yet.</div>';
             }

             if (blogs.length > 0) {
                blogsGrid.innerHTML = blogs.map(renderCard).join('');
             } else {
                blogsGrid.innerHTML = '<div class="col-span-full text-slate-500 text-sm py-4 italic">No blog posts added yet.</div>';
             }

             window.hasOthersContent = others.length > 0;
             if (others.length > 0 && othersContainer && othersGrid) {
                othersContainer.classList.remove('hidden');
                othersGrid.innerHTML = others.map(renderCard).join('');
             }
           } catch (e) {
             const errorHTML = '<div class="col-span-full text-rose-500 text-sm py-4">Error loading researches. Try again later.</div>';
             roadmapsGrid.innerHTML = errorHTML;
             leetcodeGrid.innerHTML = errorHTML;
             blogsGrid.innerHTML = errorHTML;
           }
        };

         window.showToast = (message, type = 'error') => {
           let container = document.getElementById('toast-container');
           if (!container) {
              container = document.createElement('div');
              container.id = 'toast-container';
              container.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full';
              document.body.appendChild(container);
           }

           const toast = document.createElement('div');
           const bgClass = type === 'error' ? 'bg-[#2a0810] border-rose-500/30 text-rose-200' : 'bg-[#081f2a] border-[#1a4f7f]/30 text-sky-200';
           const iconColor = type === 'error' ? 'text-rose-400' : 'text-sky-400';
           
           toast.className = `${bgClass} border p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all duration-500 translate-y-5 opacity-0 border-l-4`;
           if (type === 'error') {
              toast.style.borderLeftColor = '#f43f5e';
           } else {
              toast.style.borderLeftColor = '#38bdf8';
           }

           toast.innerHTML = `
             <div class="${iconColor} shrink-0 mt-0.5">
               ${type === 'error' ? `
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
               ` : `
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
               `}
             </div>
             <div class="flex-1 text-sm font-semibold leading-relaxed">${message}</div>
             <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition-colors shrink-0">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
           `;

           container.appendChild(toast);

           setTimeout(() => {
              toast.classList.remove('translate-y-5', 'opacity-0');
           }, 10);

           setTimeout(() => {
              toast.classList.add('opacity-0', '-translate-y-2');
              setTimeout(() => {
                 toast.remove();
              }, 500);
           }, 4500);
        };

window.openAddResearchModal = () => {
            if (!window.auth?.user) {
               document.getElementById('auth-warning-modal').classList.remove('hidden');
               return;
            }
            document.getElementById('add-research-modal').classList.remove('hidden');
            document.getElementById('research-url-input').value = '';
            document.getElementById('research-tags-input').value = '';
            document.getElementById('research-preview-card').classList.add('hidden');
            document.getElementById('research-submit-status').innerText = '';
            document.getElementById('btn-submit-research').disabled = true;
            window.currentResearchPreview = null;
         };

        window.closeAddResearchModal = () => {
           document.getElementById('add-research-modal').classList.add('hidden');
        };

        window.previewResearchLink = async () => {
           const url = document.getElementById('research-url-input').value.trim();
           if (!url) return;
           
           const btn = document.getElementById('btn-preview-research');
           btn.innerText = '...';
           btn.disabled = true;
           document.getElementById('research-submit-status').innerText = '';
           
           try {
             const res = await fetch('/api/linkPreview?url=' + encodeURIComponent(url));
             const data = await res.json();
             
             if (!res.ok) throw new Error(data.error || 'Failed to fetch preview');
             
             window.currentResearchPreview = data;
             
             const card = document.getElementById('research-preview-card');
             document.getElementById('research-preview-title').innerText = data.title || url;
             document.getElementById('research-preview-desc').innerText = data.description || '';
             
             const imgDiv = document.getElementById('research-preview-image');
             if (data.image) {
                imgDiv.style.backgroundImage = `url('${data.image}')`;
                imgDiv.style.display = 'block';
             } else {
                imgDiv.style.display = 'none';
             }
             
             card.classList.remove('hidden');
             document.getElementById('btn-submit-research').disabled = false;
             
           } catch (e) {
             document.getElementById('research-submit-status').innerText = 'Could not fetch preview. You can still submit.';
             document.getElementById('research-submit-status').classList.replace('text-amber-400', 'text-rose-400');
             
             window.currentResearchPreview = { url, title: url };
             document.getElementById('btn-submit-research').disabled = false;
           } finally {
             btn.innerText = 'Preview';
             btn.disabled = false;
           }
        };

        let allBooksData = [];
         let activeLibraryTag = null;

         document.addEventListener('DOMContentLoaded', () => {
            const fileInput = document.getElementById('book-file-input');
            if (fileInput) {
               fileInput.addEventListener('change', (e) => {
                  const file = e.target.files[0];
                  if (file) {
                     let cleanedName = file.name
                        .replace(/\.pdf$/i, '')
                        .replace(/[_-]/g, ' ')
                        .trim();
                     document.getElementById('book-title-input').value = cleanedName;
                  }
               });
            }
         });

window.submitResearchLink = async () => {
           const btn = document.getElementById('btn-submit-research');
           const status = document.getElementById('research-submit-status');
           
           btn.disabled = true;
           btn.innerText = 'Submitting...';
           status.innerText = '';
           status.classList.remove('text-rose-400', 'text-emerald-400');
           status.classList.add('text-amber-400');
           
           try {
              const res = await fetch('/api/submitResearch', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     contributor: window.auth.user.login,
                     research: {
                        ...window.currentResearchPreview,
                        category: document.getElementById('research-category-select').value,
                        tags: document.getElementById('research-tags-input').value
                     }
                  })
              });
              
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Submission failed');
              
              status.innerText = 'Research successfully submitted!';
              status.classList.replace('text-amber-400', 'text-emerald-400');
              btn.innerText = 'Success!';
              
              setTimeout(() => {
                 window.closeAddResearchModal();
                 window.showCelebration('Research Submitted!');
                 window.fetchResearches(); // Optimistic refresh
              }, 1500);
              
           } catch (e) {
              status.innerText = 'Error: ' + e.message;
              status.classList.replace('text-amber-400', 'text-rose-400');
              btn.innerText = 'Submit PR';
              btn.disabled = false;
           }
        };
