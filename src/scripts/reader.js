// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.renderFolderDetails = (folder) => {
        const items = [];
        if (folder.children.length) {
          items.push(`<p class="text-sm text-slate-200 font-semibold mb-2">Sub-themes</p><ul class="list-disc list-inside space-y-2 text-sm text-slate-300">${folder.children.map(child => `<li>${child.label}</li>`).join('')}</ul>`);
        }
        if (folder.files.length) {
          items.push(`<p class="text-sm text-slate-200 font-semibold mt-4 mb-2">Notes</p><ul class="list-disc list-inside space-y-2 text-sm text-slate-300">${folder.files.map(file => `<li><button onclick="window.openNote('${file.id}')" class="text-[#8ecae6] hover:text-white underline">${file.label}</button></li>`).join('')}</ul>`);
        }
        return items.join('');
      };

      window.openNote = async (noteId) => {
        const node = window.processedNodes.find(n => n.id === noteId);
        window.setGraphFocus(noteId);
        if (node && node.isFolder) {
          const folder = window.findFolderNode(noteId);
          if (folder) {
            const reader = document.getElementById('node-viewer');
            reader.classList.remove('hidden');
            window.updateCloseButtonText(noteId);
            document.getElementById('node-viewer').classList.remove('hidden');
            document.body.style.overflow = 'hidden';

    // 2. Clear previous content
            document.getElementById('reader-body').innerHTML = 'Loading...';
            document.getElementById('reader-sections').innerHTML = '';



            document.getElementById('reader-title').innerText = folder.label;
            document.getElementById('reader-path').innerText = noteId;
            document.getElementById('reader-sections').innerHTML = window.buildSectionsHtml([
              { title: 'Group overview', items: [{ type: 'text', label: `Theme: ${folder.label}` }] },
              { title: 'Chapters', items: [] }
            ]);
            if (window.initSidebars) window.initSidebars();
            document.getElementById('reader-body').innerHTML = `
              <div class="space-y-4 text-sm text-slate-200">
                <p class="text-lg font-semibold text-white">Theme overview</p>
                <p>This node represents the <strong>${folder.label}</strong> group. You can open one of its child notes below.</p>
                ${window.renderFolderDetails(folder)}
              </div>`;
            
            setTimeout(() => {
              window.renderMiniGraph(noteId);
            }, 100);
          }
          return;
        }
        await window.loadVaultFile(noteId);
        const modal = document.getElementById('node-viewer');
        modal.classList.remove('hidden'); 
    
        // Wait for the CSS transition/rendering to complete
        setTimeout(() => {
            window.renderMiniGraph(noteId);
        }, 100);
      };

      window.toggleFolder = (folderId) => {
        const group = document.querySelector(`[data-folder-id='${folderId}']`);
        if (!group) return;
        const parent = group.closest('.tree-folder');
        group.classList.toggle('hidden');
        if (parent) parent.classList.toggle('folder-open');
        window.setGraphFocus(folderId);
      };

      window.closeNodeViewer = () => {
        const viewer = document.getElementById('node-viewer');
        viewer.classList.add('hidden');
        document.body.style.overflow = '';
      
        if (window.miniGraphNetwork) {
          window.miniGraphNetwork.destroy();
          window.miniGraphNetwork = null;
        }

        if (window.graphNetwork) {
          // Save state before destroy
          const savedPositions = window.graphNetwork.getPositions();
          const savedViewPos = { ...window.graphNetwork.getViewPosition() };
          const savedScale = window.graphNetwork.getScale();
          window.graphNetwork.destroy();
          window.graphNetwork = null;
          // Recreate with fresh event listeners (destroying mini graph corrupts shared vis state)
          window.createMainGraph(savedPositions, savedViewPos, savedScale);
        }
      };

window.handleObsidianLink = (label) => {
        const target = window.processedNodes.find(n => !n.isFolder && n.label.toLowerCase() === label.toLowerCase().trim());
        if (target) {
          window.openNote(target.id);
        }
      };

      window.slugify = (text) => {
        return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      };

      window.scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      window.getNoteCategory = (noteId) => {
        const parts = noteId.split('/').filter(Boolean);
        if (parts.length <= 1) return 'Vault';
        return parts.slice(0, -1).join(' / ');
      };

      window.updateCloseButtonText = (noteId) => {
        const closeButton = document.getElementById('reader-close-button');
        if (!closeButton) return;
        closeButton.innerText = `← ${window.getNoteCategory(noteId)}`;
      };

      window.extractSections = (text) => {
        const sections = [{ title: 'Chapters', items: [] }];
        const lines = text.split(/\r?\n/);
        let hasResources = false;
        for (const line of lines) {
          const heading = line.match(/^(#{1,3})\s+(.*)$/);
          if (heading) {
            const depth = heading[1].length;
            const title = heading[2].trim();
            sections[0].items.push({ type: 'section', label: title, target: window.slugify(title), depth });
          }
          if (line.trim().startsWith('- type:') || line.trim().startsWith('* type:')) {
            hasResources = true;
          }
        }
        if (hasResources) {
          sections[0].items.push({ type: 'section', label: 'Resources', target: 'resources', depth: 3 });
        }
        if (!sections[0].items.length) {
          sections[0].items.push({ type: 'text', label: 'No chapters.' });
        }
        return sections;
      };

      window.buildSectionsHtml = (sections) => {
        return sections.map(section => {
          const items = section.items.map((item, index) => {
            const indexSpan = `<span class="line-sidebar__index">${String(index + 1).padStart(2, '0')} </span>`;
            if (item.type === 'section') {
              const indent = item.depth > 1 ? `padding-left: ${0.75 * (item.depth - 1)}rem;` : '';
              return `<li class="line-sidebar__item" onclick="window.scrollToSection('${item.target}')">
                <span class="line-sidebar__marker" aria-hidden="true"></span>
                <span class="line-sidebar__label" style="${indent}">
                  ${indexSpan}<span class="line-sidebar__text">${item.label}</span>
                </span>
              </li>`;
            }
            if (item.type === 'link') {
              return `<li class="line-sidebar__item" onclick="window.handleObsidianLink('${item.target}')">
                <span class="line-sidebar__marker" aria-hidden="true"></span>
                <span class="line-sidebar__label">
                  ${indexSpan}<span class="line-sidebar__text">${item.label}</span>
                </span>
              </li>`;
            }
            return `<li class="line-sidebar__item text-slate-300">
                <span class="line-sidebar__marker" aria-hidden="true"></span>
                <span class="line-sidebar__label">
                  ${indexSpan}<span class="line-sidebar__text">${item.label}</span>
                </span>
            </li>`;
          }).join('');
          return `<div>
            <p class="mb-4 text-xs uppercase tracking-[0.24em] text-[#7c98d9]">${section.title}</p>
            <nav class="line-sidebar line-sidebar--markers line-sidebar--ticks line-sidebar--scale-tick">
              <ul class="line-sidebar__list">${items || '<li class="text-slate-500">No chapters.</li>'}</ul>
            </nav>
          </div>`;
        }).join('');
      };
      
      
      
    
      window.handleTab = (tab) => {
  const readerBody = document.getElementById('reader-body');
  window.currentTab = tab;
  
  if (tab === 'overview') {
    readerBody.innerHTML = window.convertMarkdownToHTML(window.currentRawNote, window.currentNotePath);
    return;
  }

  const lines = window.currentRawNote.split('\n');
  const matches = [];
  let currentEntry = null;

  // Helper to clean lines of Markdown artifacts like "* " or "- "
  const cleanLine = (str) => str.replace(/^[\*\-\s]+/, '').trim();

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect new link entry
    if (trimmed.startsWith('- type:') || trimmed.startsWith('* type:')) {
      if (currentEntry) matches.push(currentEntry);
      currentEntry = { type: cleanLine(trimmed).replace('type:', '').trim() };
    } 
    else if (currentEntry) {
      if (trimmed.startsWith('title:')) currentEntry.title = cleanLine(trimmed).replace('title:', '').replace(/["']/g, '').trim();
      if (trimmed.startsWith('url:')) currentEntry.url = cleanLine(trimmed).replace('url:', '').replace(/["']/g, '').trim();
      if (trimmed.startsWith('author:')) currentEntry.author = cleanLine(trimmed).replace('author:', '').replace(/["']/g, '').trim();
      if (trimmed.startsWith('status:')) currentEntry.status = cleanLine(trimmed).replace('status:', '').replace(/["']/g, '').trim();
      if (trimmed.startsWith('incognito:')) currentEntry.incognito = cleanLine(trimmed).replace('incognito:', '').replace(/["']/g, '').trim() === 'true';
    }
  }
  if (currentEntry) matches.push(currentEntry);

  const username = window.auth?.user?.login;
  const isIncognitoEnabled = localStorage.getItem('gaiabasin_incognito') === 'true';

  // Apply global and optimistic incognito states
  matches.forEach(m => {
     if (m.author) {
        const hasDbRecord = globalContributors && typeof globalContributors[m.author] !== 'undefined';
        const isGlobalIncognito = globalContributors && globalContributors[m.author]?.incognito;
        const isOptimistic = username && m.author === username && isIncognitoEnabled;
        
        if (hasDbRecord || (username && m.author === username)) {
           m.incognito = isGlobalIncognito || isOptimistic;
        } else if (isOptimistic) {
           m.incognito = true;
        }
     }
  });

  if (tab === 'credits') {
    const authors = new Set();
    
    // Parse main note frontmatter author
    let noteAuthor = null;
    let noteIncognito = false;
    const frontmatterMatch = window.currentRawNote.match(/^---([\s\S]*?)---/);
    if (frontmatterMatch) {
      const fmLines = frontmatterMatch[1].split('\n');
      for (const fml of fmLines) {
        const trimmedFml = fml.trim();
        if (trimmedFml.startsWith('author:')) {
          noteAuthor = trimmedFml.replace('author:', '').replace(/["']/g, '').trim();
        }
        if (trimmedFml.startsWith('incognito:')) {
          noteIncognito = trimmedFml.replace('incognito:', '').replace(/["']/g, '').trim() === 'true';
        }
      }
    }
    
    if (noteAuthor) {
      const hasDbRecord = globalContributors && typeof globalContributors[noteAuthor] !== 'undefined';
      const isGlobalIncognito = globalContributors && globalContributors[noteAuthor]?.incognito;
      const isOptimistic = username && noteAuthor === username && isIncognitoEnabled;
      
      let finalIncognito = noteIncognito;
      if (hasDbRecord || (username && noteAuthor === username)) {
         finalIncognito = isGlobalIncognito || isOptimistic;
      } else if (isOptimistic) {
         finalIncognito = true;
      }

      if (finalIncognito) {
        authors.add('Anonymous Contributor');
      } else {
        authors.add(noteAuthor);
      }
    }
    
    // Parse contributors array from frontmatter
    if (frontmatterMatch) {
       const fmLines = frontmatterMatch[1].split('\n');
       let inContributors = false;
       for (const fml of fmLines) {
          if (fml.startsWith('contributors:')) {
             inContributors = true;
          } else if (inContributors && fml.startsWith('  - ')) {
             const authorName = fml.replace('  - ', '').trim();
             const hasDbRecord = globalContributors && typeof globalContributors[authorName] !== 'undefined';
             const isGlobalIncognito = globalContributors && globalContributors[authorName]?.incognito;
             const isOptimistic = username && authorName === username && isIncognitoEnabled;
             let finalIncognito = false;
             if (hasDbRecord || (username && authorName === username)) {
                finalIncognito = isGlobalIncognito || isOptimistic;
             } else if (isOptimistic) {
                finalIncognito = true;
             }
             if (finalIncognito) {
                authors.add('Anonymous Contributor');
             } else {
                authors.add(authorName);
             }
          } else if (inContributors && !fml.startsWith('  -')) {
             inContributors = false;
          }
       }
    }

    matches.forEach(m => {
       if (m.author) {
          if (m.incognito) authors.add('Anonymous Contributor');
          else authors.add(m.author);
       }
    });
    
    if (authors.size > 0) {
      readerBody.innerHTML = `
        <h2 class="text-xl font-bold mb-4 capitalize">Credits</h2>
        <p class="text-slate-400 mb-6">The following users have contributed to this note:</p>
        <ul class="space-y-3">
          ${Array.from(authors).map(author => `
            <li class="p-4 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex items-center gap-4">
              <div class="h-10 w-10 rounded-full bg-[#1e314e] flex items-center justify-center text-white font-bold text-lg border border-slate-600">${author[0]}</div>
              <span class="text-[#8ecae6] font-medium text-lg">${author}</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      readerBody.innerHTML = `<h2 class="text-xl font-bold mb-4 capitalize">Credits</h2><p class="text-slate-400">No external resources have been contributed to this note yet.</p>`;
    }
    return;
  }

  const filtered = matches.filter(m => {
    const itemType = m.type.trim().toLowerCase();
    const tabName = tab.trim().toLowerCase();
    
    // Check for exact match or plural variations
    const isMatch = itemType === tabName || 
                    itemType + 's' === tabName || 
                    itemType === tabName + 's';
                    
    return isMatch;
  });

  if (filtered.length > 0) {
    readerBody.innerHTML = `
      <h2 class="text-xl font-bold mb-4 capitalize">${tab}</h2>
      <ul class="space-y-3">
        ${filtered.map(m => `
          <li class="p-3 bg-[#0a2336] rounded-xl border border-[#1b3e63]">
            <a href="${m.url}" target="_blank" class="text-[#8ecae6] hover:text-white font-medium underline">
              ${m.title}
            </a>
            ${m.status === 'WAITING FOR APPROVAL' ? '<span class="ml-3 text-amber-300 border border-amber-300/30 bg-amber-900/30 px-2 py-0.5 rounded-full tracking-widest text-[10px] align-middle">WAITING FOR APPROVAL</span>' : ''}
          </li>
        `).join('')}
      </ul>
    `;
  } else {
    readerBody.innerHTML = `<p class="text-slate-400">No ${tab} found. (Processed ${matches.length} total items)</p>`;
  }
};
    















      window.convertMarkdownToHTML = (text, notePath) => {
        const resolveImagePath = (fileName) => {
          let clean = fileName.replace(/[\[\]]/g, '').trim();
          const githubBlobMatch = clean.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/i);
          if (githubBlobMatch) {
            return {
              url: `https://raw.githubusercontent.com/${githubBlobMatch[1]}/${githubBlobMatch[2]}/${githubBlobMatch[3]}/${githubBlobMatch[4]}`,
              fallback: null
            };
          }
          if (/^https?:\/\/raw\.githubusercontent\.com\//i.test(clean)) {
            return { url: clean, fallback: null };
          }
          if (/^https?:\/\//i.test(clean)) {
            return { url: clean, fallback: null };
          }
          const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');
          const rootUrl = `${window.rawCdn}${encodePath(clean)}`;
          if (clean.startsWith('/')) {
            return { url: `${window.rawCdn}${encodePath(clean.slice(1))}`, fallback: null };
          }
          const noteDir = notePath ? notePath.split('/').slice(0, -1).join('/') : '';
          const primaryUrl = noteDir ? `${window.rawCdn}${encodePath(`${noteDir}/${clean}`)}` : rootUrl;
          return { url: primaryUrl, fallback: primaryUrl === rootUrl ? null : rootUrl };
        };
        let body = text.replace(/^---[\s\S]*?---\s*/, '');
        
        // Extract resources
        const lines = body.split(/\r?\n/);
        const normalLines = [];
        const resources = [];
        let currentRes = null;
        const cleanLine = (str) => str.replace(/^[\*\-\s]+/, '').trim();

        for (let line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('- type:') || trimmed.startsWith('* type:')) {
            if (currentRes) resources.push(currentRes);
            currentRes = { type: cleanLine(trimmed).replace('type:', '').trim() };
          } else if (currentRes && (trimmed.startsWith('title:') || trimmed.startsWith('url:') || trimmed.startsWith('author:') || trimmed.startsWith('incognito:'))) {
            if (trimmed.startsWith('title:')) currentRes.title = cleanLine(trimmed).replace('title:', '').replace(/["']/g, '').trim();
            if (trimmed.startsWith('url:')) currentRes.url = cleanLine(trimmed).replace('url:', '').replace(/["']/g, '').trim();
            if (trimmed.startsWith('author:')) currentRes.author = cleanLine(trimmed).replace('author:', '').replace(/["']/g, '').trim();
            if (trimmed.startsWith('incognito:')) currentRes.incognito = cleanLine(trimmed).replace('incognito:', '').replace(/["']/g, '').trim() === 'true';
          } else {
            if (currentRes) {
              resources.push(currentRes);
              currentRes = null;
            }
            normalLines.push(line);
          }
        }
        if (currentRes) resources.push(currentRes);
        
        // Apply global and optimistic incognito states
        const username = window.auth?.user?.login;
        const isIncognitoEnabled = localStorage.getItem('gaiabasin_incognito') === 'true';
        resources.forEach(m => {
           if (m.author) {
              const hasDbRecord = globalContributors && typeof globalContributors[m.author] !== 'undefined';
              const isGlobalIncognito = globalContributors && globalContributors[m.author]?.incognito;
              const isOptimistic = username && m.author === username && isIncognitoEnabled;
              
              if (hasDbRecord || (username && m.author === username)) {
                 m.incognito = isGlobalIncognito || isOptimistic;
              } else if (isOptimistic) {
                 m.incognito = true;
              }
           }
        });

        body = normalLines.join('\n');

        const codeBlocks = [];
        let html = body
          .replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (m, lang, code) => {
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const langLabel = lang ? `<span class="text-xs text-slate-500 font-sans uppercase">${lang}</span>` : '';
            const block = `<div class="relative group my-5 code-container shadow-lg">
              <div class="absolute right-3 top-3 flex items-center gap-3 transition-opacity duration-200 opacity-0 group-hover:opacity-100 z-10">
                ${langLabel}
                <button onclick="navigator.clipboard.writeText(this.closest('.code-container').querySelector('code').innerText).then(() => { const orig = this.innerText; this.innerText = 'Copied!'; setTimeout(() => this.innerText = orig, 2000); })" class="bg-[#1b324f] hover:bg-[#284a75] text-slate-300 text-[11px] px-2.5 py-1 rounded border border-[#2d4d73] transition-colors shadow-sm font-sans cursor-pointer">Copy</button>
              </div>
              <pre class="bg-[#0b1728] pt-12 pb-5 px-5 rounded-2xl border border-[#16273d] text-[#e2e8f0] font-mono text-[13px] leading-relaxed overflow-auto custom-scrollbar m-0 whitespace-pre"><code>${escapedCode}</code></pre>
            </div>`;
            codeBlocks.push(block);
            return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
          })
          .replace(/!\[\[([^\]]+)\]\]|!\[(?:.*?)\]\((.*?)\)|!([^\n]+?\.(?:png|jpg|jpeg|gif))/g, (m, obs, path, bare) => {
            const fileName = (obs || path || bare).replace(/[\[\]]/g, '').trim();
            const image = resolveImagePath(fileName);
            const fallbackAttr = image.fallback ? ` data-fallback=\"${image.fallback}\"` : '';
            const onError = image.fallback
              ? ` onerror="if(this.src!==this.dataset.fallback){this.src=this.dataset.fallback;}else{this.style.display='none';}"`
              : ` onerror="this.style.display='none'"`;
            return `<img src="${image.url}"${fallbackAttr} alt="Note image" class="my-4 rounded-3xl border border-[#1d2f4f] max-w-full"${onError} />`;
          })
          .replace(/###\s+(.*)$/gim, (m, p1) => `<h3 id=\"${window.slugify(p1)}\" class=\"text-xl font-semibold text-slate-100 mt-6 mb-3\">${p1}</h3>`)
          .replace(/##\s+(.*)$/gim, (m, p1) => `<h2 id=\"${window.slugify(p1)}\" class=\"text-2xl font-semibold text-slate-100 mt-6 mb-3\">${p1}</h2>`)
          .replace(/#\s+(.*)$/gim, (m, p1) => `<h1 id=\"${window.slugify(p1)}\" class=\"text-3xl font-bold text-white mt-6 mb-4\">${p1}</h1>`)
          .replace(/\*\*(.*?)\*\*/g, '<strong class=\"font-semibold text-white\">$1</strong>')
          .replace(/\[\[(.*?)\]\]/g, (match, p1) => `<button onclick="window.handleObsidianLink('${p1.replace(/'/g, "\\'")}')" class="text-[#5c7aff] hover:underline font-medium">${p1}</button>`) 
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\" class=\"text-[#8ecae6] hover:text-white underline\">$1</a>')
          .split(/\r?\n/)
          .map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<img') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<button') || trimmed.startsWith('<a')) return trimmed;
            return `<p class=\"mb-3 leading-relaxed text-slate-200\">${trimmed}</p>`;
          }).join('');

        codeBlocks.forEach((block, index) => {
          html = html.replace(new RegExp(`<p[^>]*>__CODE_BLOCK_${index}__<\\/p>|__CODE_BLOCK_${index}__`, 'g'), block);
        });

        if (resources.length > 0) {
          html += '<h3 id="resources" class="text-xl font-semibold text-slate-100 mt-8 mb-4 border-t border-[#1e314e] pt-6">Resources</h3><ul class="space-y-4">';
          resources.forEach(r => {
            const authorText = r.author ? (r.incognito ? 'Anonymous Contributor' : r.author) : null;
            const authorPill = authorText ? `<span class="ml-auto text-xs text-slate-400 bg-[#0d2a53] px-2 py-1 rounded-md">Added by: ${authorText}</span>` : '';
            html += `<li class="p-4 bg-[#0a2336] rounded-xl border border-[#1b3e63] flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs uppercase tracking-[0.2em] text-[#7c98d9] font-bold">${r.type || 'resource'}</span>
                ${authorPill}
              </div>
              <a href="${r.url || '#'}" target="_blank" class="text-[#8ecae6] hover:text-white font-medium underline text-lg">
                ${r.title || 'Untitled Resource'}
              </a>
            </li>`;
          });
          html += '</ul>';
        }

        return html;
      };
      window.currentNoteMetadata = {};

      window.loadVaultFile = async (noteId) => {
        const viewer = document.getElementById('node-viewer');
        if (viewer) {
          viewer.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        }
        window.updateCloseButtonText(noteId);
        window.currentNotePath = noteId;
        document.getElementById('reader-title').innerText = noteId.split('/').pop().replace(/\.md$/i, '');
        document.getElementById('reader-path').innerText = noteId;
        document.getElementById('reader-body').innerHTML = '<p class=\"text-slate-400\">Loading content…</p>';
        document.getElementById('reader-sections').innerHTML = '<p class=\"text-slate-400\">Parsing sections…</p>';

        try {
          const encodedPath = noteId.split('/').map(encodeURIComponent).join('/');
          const resp = await fetch(`/api/fileContent?path=${encodedPath}`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const text = await resp.text();

          const match = text.match(/^---[\s\S]*?---/);
          if (match) {
          window.currentNoteMetadata = match[0]; 
          } else {
            window.currentNoteMetadata = null;
          }
          window.currentRawNote = text;
          const html = window.convertMarkdownToHTML(text, noteId);
          const sections = window.extractSections(text);
          document.getElementById('reader-body').innerHTML = html || '<p class="text-slate-400">This note is empty.</p>';
          document.getElementById('reader-sections').innerHTML = window.buildSectionsHtml(sections);
          if (window.initSidebars) window.initSidebars();

        } catch (err) {
          document.getElementById('reader-body').innerHTML = `<p class="text-red-300">Unable to load note. ${err.message || ''}</p>`;
          document.getElementById('reader-sections').innerHTML = '';
        }
        window.updateContributionControls();
      };
