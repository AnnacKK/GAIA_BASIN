// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


class LineSidebarController {
        constructor(listElement, options = {}) {
          this.list = listElement;
          this.items = Array.from(this.list.querySelectorAll('.line-sidebar__item'));
          this.options = {
            proximityRadius: 100,
            falloff: 'smooth',
            smoothing: 150,
            ...options
          };
          this.targets = new Array(this.items.length).fill(0);
          this.current = new Array(this.items.length).fill(0);
          this.raf = null;
          this.lastTime = 0;
          this.activeIndex = null;
          
          this.curves = {
            linear: p => p,
            smooth: p => p * p * (3 - 2 * p),
            sharp: p => p * p * p
          };

          this.handlePointerMove = this.handlePointerMove.bind(this);
          this.handlePointerLeave = this.handlePointerLeave.bind(this);
          this.runFrame = this.runFrame.bind(this);
          
          this.list.addEventListener('pointermove', this.handlePointerMove);
          this.list.addEventListener('pointerleave', this.handlePointerLeave);
        }

        startLoop() {
          if (this.raf != null) return;
          this.lastTime = performance.now();
          this.raf = requestAnimationFrame(this.runFrame);
        }

        runFrame(now) {
          const dt = Math.min((now - this.lastTime) / 1000, 0.05);
          this.lastTime = now;
          const tau = Math.max(this.options.smoothing, 1) / 1000;
          const k = 1 - Math.exp(-dt / tau);

          let moving = false;
          for (let i = 0; i < this.items.length; i++) {
            const el = this.items[i];
            const target = Math.max(this.targets[i] || 0, this.activeIndex === i ? 1 : 0);
            const cur = this.current[i] || 0;
            const next = cur + (target - cur) * k;
            const settled = Math.abs(target - next) < 0.0015;
            const value = settled ? target : next;
            
            this.current[i] = value;
            el.style.setProperty('--effect', value.toFixed(4));
            if (!settled) moving = true;
          }

          if (moving) {
            this.raf = requestAnimationFrame(this.runFrame);
          } else {
            this.raf = null;
          }
        }

        handlePointerMove(e) {
          const rect = this.list.getBoundingClientRect();
          const pointerY = e.clientY - rect.top;
          const ease = this.curves[this.options.falloff] || this.curves.linear;
          
          for (let i = 0; i < this.items.length; i++) {
            const el = this.items[i];
            const center = el.offsetTop + el.offsetHeight / 2;
            const distance = Math.abs(pointerY - center);
            this.targets[i] = ease(Math.max(0, 1 - distance / this.options.proximityRadius));
          }
          this.startLoop();
        }

        handlePointerLeave() {
          this.targets.fill(0);
          this.startLoop();
        }
        
        setActive(index) {
          this.activeIndex = index;
          this.startLoop();
        }
        
        destroy() {
          this.list.removeEventListener('pointermove', this.handlePointerMove);
          this.list.removeEventListener('pointerleave', this.handlePointerLeave);
          if (this.raf) cancelAnimationFrame(this.raf);
        }
      }
      
      window.activeSidebars = [];
      window.initSidebars = () => {
        window.activeSidebars.forEach(s => s.destroy());
        window.activeSidebars = [];
        document.querySelectorAll('.line-sidebar__list').forEach(list => {
           window.activeSidebars.push(new LineSidebarController(list));
        });
      };
      window.processedNodes = processedNodes;
      window.processedLinks = processedLinks;
      window.folderTree = folderTree;
      window.allResources = allResources;
      // Clean up old cached deletions (>10 mins) and filter window.allResources, window.processedNodes, window.processedLinks, folderTree
      try {
         const now = Date.now();
         let deletedList = JSON.parse(localStorage.getItem('gaiabasin_deleted_res') || '[]');
         deletedList = deletedList.filter(d => now - d.time < 10 * 60 * 1000);
         localStorage.setItem('gaiabasin_deleted_res', JSON.stringify(deletedList));
         
         if (deletedList.length > 0) {
            window.allResources = window.allResources.filter(r => 
               !deletedList.some(d => d.title === r.title && d.fileId === r.fileId)
            );

            // Filter window.processedNodes
            window.processedNodes = window.processedNodes.filter(n => {
               const isDeleted = deletedList.some(d => {
                  if (d.type !== 'note' && d.type !== 'branch') return false;
                  const delPath = d.fileId;
                  return n.id === delPath || n.id.startsWith(delPath + '/');
               });
               return !isDeleted;
            });

            // Filter window.processedLinks
            window.processedLinks = window.processedLinks.filter(l => {
               const fromExists = window.processedNodes.some(n => n.id === l.from);
               const toExists = window.processedNodes.some(n => n.id === l.to);
               return fromExists && toExists;
            });

            // Filter folderTree
            const filterTree = (node) => {
               node.children = node.children.filter(child => {
                  const isDeleted = deletedList.some(d => (d.type === 'note' || d.type === 'branch') && (child.id === d.fileId || child.id.startsWith(d.fileId + '/')));
                  return !isDeleted;
               });
               node.files = node.files.filter(file => {
                  const isDeleted = deletedList.some(d => (d.type === 'note' || d.type === 'branch') && (file.id === d.fileId));
                  return !isDeleted;
               });
               node.children.forEach(filterTree);
            };
            filterTree(window.folderTree);
         }
      } catch (e) {}
      
      window.rawCdn = RAW_CDN_URL;
      window.auth = { user: null };
      window.currentNotePath = null;
      window.currentNoteCategory = 'Vault';
 
      window.renderFolderHtml = (folder) => {
        const safeId = folder.id.replace(/'/g, "\\'");
        const isRoot = folder.id === 'root';
        const children = folder.children
          .sort((a, b) => a.label.localeCompare(b.label))
          .map(child => window.renderFolderHtml(child))
          .join('');
        const files = folder.files
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((file, index) => {
            const safeFileId = file.id.replace(/'/g, "\\'");
            return `<li class="line-sidebar__item" onclick="window.openNote('${safeFileId}')">
              <span class="line-sidebar__marker" aria-hidden="true"></span>
              <span class="line-sidebar__label">
                <span class="line-sidebar__text">${file.label}</span>
              </span>
            </li>`;
          }).join('');
        
        if (isRoot) {
          return `${children}${files}`;
        }
        
        return `
          <li class="tree-folder line-sidebar__item">
            <span class="line-sidebar__marker" aria-hidden="true"></span>
            <div class="line-sidebar__label w-full" onclick="window.toggleFolder('${safeId}')">
              <span class="font-semibold text-white/90 w-full flex justify-between pr-4 items-center">${folder.label} <span class="folder-arrow ml-auto">›</span></span>
            </div>
            <div class="hidden mt-2" data-folder-id="${safeId}">
              <nav class="line-sidebar line-sidebar--nested">
                <ul class="line-sidebar__list" style="padding:0;">${children}${files}</ul>
              </nav>
            </div>
          </li>`;
      };
      window.populateVaultTree = () => {
        const container = document.getElementById('vault-structure');
        if (!container) return;
        container.innerHTML = `
          <nav class="line-sidebar line-sidebar--markers">
            <ul class="line-sidebar__list" style="padding:0;">
              ${window.renderFolderHtml(window.folderTree)}
            </ul>
          </nav>
        `;
        if (window.initSidebars) window.initSidebars();
      };

      window.refreshTree = () => window.location.reload();

window.toggleSidebar = () => {
         const layout = document.getElementById('app-layout');
         const sidebar = document.getElementById('left-sidebar');
         const openBtn = document.getElementById('open-sidebar-btn');
         
         const isClosed = layout.classList.contains('grid-cols-[0px_1fr]');
         if (isClosed) {
             layout.classList.remove('grid-cols-[0px_1fr]');
             layout.classList.add('grid-cols-[320px_1fr]');
             sidebar.classList.remove('invisible', 'opacity-0', 'w-0', 'px-0');
             sidebar.classList.add('w-[320px]', 'px-6');
             openBtn.classList.add('hidden');
         } else {
             layout.classList.remove('grid-cols-[320px_1fr]');
             layout.classList.add('grid-cols-[0px_1fr]');
             sidebar.classList.add('invisible', 'opacity-0', 'w-0', 'px-0');
             sidebar.classList.remove('w-[320px]', 'px-6');
             openBtn.classList.remove('hidden');
         }
      };
