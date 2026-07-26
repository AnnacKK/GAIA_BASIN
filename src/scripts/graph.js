// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.fitGlobalGraph = () => {
        if (window.graphNetwork) window.graphNetwork.fit({ animation: { duration: 400 } });
      };
 
      window.findFolderNode = (folderId, folder = window.folderTree) => {
        if (folder.id === folderId) return folder;
        for (const child of folder.children) {
          const result = window.findFolderNode(folderId, child);
          if (result) return result;
        }
        return null;
      };

window.renderMiniGraph = (nodeId) => {
        const miniGraphDiv = document.getElementById('mini-graph');
        if (!miniGraphDiv || !window.graphNetwork) return;
        if (window.miniGraphNetwork) {
          window.miniGraphNetwork.destroy();
        }

        const mainNodes = window.graphNetwork.body.data.nodes.get();
        const mainEdges = window.graphNetwork.body.data.edges.get();
        const neighbors = [];
        const miniEdges = [];
        mainEdges.forEach(edge => {
          if (edge.from === nodeId || edge.to === nodeId) {
            const neighborId = edge.from === nodeId ? edge.to : edge.from;
            if (!neighbors.includes(neighborId)) neighbors.push(neighborId);
            miniEdges.push({ from: edge.from, to: edge.to, color: { color: 'rgba(255,255,255,0.18)', highlight: 'rgba(255,255,255,0.32)' }, width: 1, neighborId });
          }
        });
 
        const selectedNeighbors = neighbors.slice(0, 5);
        const selectedNeighborSet = new Set(selectedNeighbors);
        const miniEdgesFiltered = miniEdges.filter(edge => selectedNeighborSet.has(edge.neighborId));
        const miniNodes = mainNodes
  .filter(node => node.id === nodeId || selectedNeighborSet.has(node.id))
  .map((node, index, array) => {
    // 1. Calculate a fixed angle for each node
    const angle = (2 * Math.PI * index) / array.length;
    const radius = 100; // Adjust this to change how spread out nodes are

    return {
      id: node.id,
      label: node.label,
      // 2. Assign static coordinates based on index
      x: node.id === nodeId ? 0 : Math.cos(angle) * radius,
      y: node.id === nodeId ? 0 : Math.sin(angle) * radius,
      shape: node.shape || 'dot',
      color: node.id === nodeId ? { background: '#f8fafc', border: '#d1d5db' } : { background: '#cbd5e1', border: '#94a3b8' },
      size: node.id === nodeId ? 20 : 14,
      font: { color: '#f8fafc', size: 10, face: 'Inter, Arial', strokeWidth: 0 },
      borderWidth: 1
    };
  });

        window.miniGraphNetwork = new vis.Network(miniGraphDiv, {
          nodes: new vis.DataSet(miniNodes),
          edges: new vis.DataSet(miniEdgesFiltered)
        }, {
          layout: { improvedLayout: true },
          interaction: { dragNodes: true, dragView: true, zoomView: true, hover: true, selectable: true },
          nodes: { fixed: false },
          edges: { smooth: { enabled: true, type: 'dynamic' }, color: '#8eb4f1' },
          physics: { enabled: false }
        });

        window.miniGraphNetwork.on('click', (params) => {
          if (params.nodes.length > 0) {
            window.openNote(params.nodes[0]);
          }
        });
      };

      window.setGraphFocus = (nodeId) => {
        if (!window.graphNetwork) return;
        const nodes = window.graphNetwork.body.data.nodes;
        const edges = window.graphNetwork.body.data.edges;
        const allNodes = nodes.get();
        const neighbors = [];

        edges.forEach((edge) => {
          if (edge.from === nodeId && !neighbors.includes(edge.to)) neighbors.push(edge.to);
          if (edge.to === nodeId && !neighbors.includes(edge.from)) neighbors.push(edge.from);
        });

        const topNeighbors = neighbors.slice(0, 5);
        const neighborSet = new Set(topNeighbors);

        const updated = allNodes.map(node => ({
          id: node.id,
          color: node.id === nodeId ? { background: '#f8fafc', border: '#d1d5db' } : neighborSet.has(node.id) ? { background: 'rgba(226,232,240,0.85)', border: '#94a3b8' } : node.options?.color ?? node.color,
          font: { color: node.id === nodeId ? '#111827' : '#e2e8f0' }
        }));
        nodes.update(updated);
        window.graphNetwork.selectNodes([nodeId]);
        const nodePos = window.graphNetwork.getPosition(nodeId);
        window.graphNetwork.moveTo({ position: nodePos, scale: 0.92, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        window._panAcc = null; // view moved externally, reset accumulator

        const node = window.processedNodes.find(n => n.id === nodeId);
        const focusInfo = document.getElementById('focus-info');
        const closestList = document.getElementById('closest-list');
        if (node) {
          focusInfo.innerHTML = `<div class=\"space-y-1\"><p class=\"text-sm font-medium text-white\">${node.label}</p><p class=\"text-xs uppercase tracking-[0.24em] text-[#7c98d9]\">${node.isFolder ? 'Folder' : 'Note'}</p><p class=\"text-sm text-slate-400\">${node.path || node.id}</p></div>`;
        }
        const neighborItems = topNeighbors.map(id => {
          const neighbor = window.processedNodes.find(n => n.id === id);
          if (!neighbor) return '';
          return `<li><button onclick=\"window.openNote('${neighbor.id}')\" class=\"text-left text-sm text-[#8ecae6] hover:text-white underline\">${neighbor.label}</button></li>`;
        }).join('');
        closestList.innerHTML = neighborItems || '<li class=\"text-slate-500\">No direct neighbors found.</li>';
      };

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
