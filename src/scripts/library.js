// Auto-generated module
const { processedNodes, processedLinks, folderTree, RAW_CDN_URL, allResources, globalContributors } = window.GAIA_DATA || {};


window.openAddBookModal = () => {
            if (!window.auth?.user) {
               document.getElementById('auth-warning-modal').classList.remove('hidden');
               return;
            }
            document.getElementById('add-book-modal').classList.remove('hidden');
            document.getElementById('add-book-form').reset();
            document.getElementById('book-submit-status').innerText = '';
            document.getElementById('book-submit-status').className = 'text-sm text-slate-400';
            document.getElementById('btn-submit-book').disabled = false;
            document.getElementById('btn-submit-book').innerText = 'Add Book';
         };

         window.closeAddBookModal = () => {
            document.getElementById('add-book-modal').classList.add('hidden');
         };

         window.submitBookForm = async (event) => {
            event.preventDefault();
            const btn = document.getElementById('btn-submit-book');
            const status = document.getElementById('book-submit-status');
            
            btn.disabled = true;
            btn.innerText = 'Uploading...';
            status.innerText = 'Preparing file and uploading to Hugging Face...';
            status.className = 'text-sm text-amber-400';
            
            const fileInput = document.getElementById('book-file-input');
            const titleInput = document.getElementById('book-title-input');
            const descInput = document.getElementById('book-desc-input');
            const themeInput = document.getElementById('book-theme-input');
            const levelSelect = document.getElementById('book-level-select');
            const tagsInput = document.getElementById('book-tags-input');
            
            const file = fileInput.files[0];
            if (!file) {
               status.innerText = 'Error: Please select a PDF file.';
               status.className = 'text-sm text-rose-400';
               btn.disabled = false;
               btn.innerText = 'Add Book';
               return;
            }
            
            const formData = new FormData();
            formData.append('title', titleInput.value);
            formData.append('description', descInput.value);
            formData.append('theme', themeInput.value);
            formData.append('level', levelSelect.value);
            formData.append('tags', tagsInput.value);
            formData.append('file', file);
            
            try {
               const res = await fetch('/api/addBook', {
                  method: 'POST',
                  body: formData
               });
               
               const data = await res.json();
               if (!res.ok) throw new Error(data.error || 'Failed to add book');
               
               status.innerText = 'Book successfully added to library!';
               status.className = 'text-sm text-emerald-400';
               btn.innerText = 'Success!';
               
               setTimeout(() => {
                  window.closeAddBookModal();
                  window.showCelebration('Book Added successfully!');
                  window.openLibrary(); // Refresh library listing
               }, 1500);
            } catch (e) {
               status.innerText = 'Error: ' + e.message;
               status.className = 'text-sm text-rose-400';
               btn.disabled = false;
               btn.innerText = 'Add Book';
            }
         };

window.openLibrary = async () => {
            document.getElementById('library-window').classList.remove('hidden');
            window.showLibraryListView();
            
            const grid = document.getElementById('library-books-grid');
            grid.innerHTML = '<div class="col-span-full text-center p-12 text-slate-500">Loading library...</div>';
            
            try {
               const res = await fetch('/api/books');
               if (!res.ok) throw new Error('Failed to fetch books');
               allBooksData = await res.json();
               
               // Render tags panel dynamically
               const tagsContainer = document.getElementById('library-tags-container');
               const uniqueTags = new Set();
               allBooksData.forEach(b => b.tags.forEach(t => uniqueTags.add(t)));
               
               tagsContainer.innerHTML = Array.from(uniqueTags).map(tag => `
                  <button onclick="window.selectLibraryTag('${tag.replace(/'/g, "\\'")}', this)" class="bg-[#0a2336] border border-[#1b3e63] px-3.5 py-1.5 rounded-full text-xs text-[#8ecae6] hover:bg-[#12315e] transition-colors capitalize">${tag}</button>
               `).join('');
               
               window.filterBooks();
            } catch (err) {
               grid.innerHTML = '<div class="col-span-full text-center p-12 text-rose-500">Failed to load library.</div>';
            }
         };

         window.closeLibrary = () => {
            document.getElementById('library-window').classList.add('hidden');
         };

         window.showLibraryListView = () => {
            document.getElementById('library-list-view').classList.remove('hidden');
            document.getElementById('library-detail-view').classList.add('hidden');
         };

         window.toggleLibraryTags = () => {
            const panel = document.getElementById('library-tags-panel');
            panel.classList.toggle('hidden');
         };

         window.selectLibraryTag = (tag, btn) => {
            const container = document.getElementById('library-tags-container');
            const buttons = container.querySelectorAll('button');
            
            if (activeLibraryTag === tag) {
               activeLibraryTag = null;
               btn.classList.replace('bg-[#1a4f7f]', 'bg-[#0a2336]');
               btn.classList.replace('text-white', 'text-[#8ecae6]');
            } else {
               activeLibraryTag = tag;
               buttons.forEach(b => {
                  b.classList.replace('bg-[#1a4f7f]', 'bg-[#0a2336]');
                  b.classList.replace('text-white', 'text-[#8ecae6]');
               });
               btn.classList.replace('bg-[#0a2336]', 'bg-[#1a4f7f]');
               btn.classList.replace('text-[#8ecae6]', 'text-white');
            }
            window.filterBooks();
         };

         window.filterBooks = () => {
            const query = document.getElementById('library-search-input').value.toLowerCase().trim();
            const grid = document.getElementById('library-books-grid');
            
            const filtered = allBooksData.filter(b => {
               const matchesSearch = b.title.toLowerCase().includes(query) || (b.description && b.description.toLowerCase().includes(query));
               const matchesTag = !activeLibraryTag || b.tags.includes(activeLibraryTag);
               return matchesSearch && matchesTag;
            });
            
            if (filtered.length === 0) {
               grid.innerHTML = '<div class="col-span-full text-center p-12 text-slate-500 italic">No books match your criteria.</div>';
               return;
            }
            
            grid.innerHTML = filtered.map(b => `
               <div onclick="window.openBookDetail(${b.id})" class="group cursor-pointer flex flex-col items-center">
                  <div class="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border border-[#14325a] hover:border-[#2b74b0] transition-all duration-300 relative group-hover:-translate-y-1">
                     <div class="absolute top-3 left-3 bg-[#061525]/90 backdrop-blur-md border border-[#1e314e] px-2.5 py-1 rounded-md text-[9px] font-extrabold text-[#8ecae6] uppercase tracking-widest z-10">${b.theme || 'General'}</div>
                     <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src="${b.cover_image || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=2787&auto=format&fit=crop'}" alt="${b.title}" />
                  </div>
                  <p class="mt-3 text-sm font-bold text-[#d5e9ff] text-center group-hover:text-white transition-colors leading-snug px-2">${b.title}</p>
               </div>
            `).join('');
         };

         window.downloadBookFile = async (url, filename) => {
            const btn = document.getElementById('btn-book-download');
            const originalText = btn.innerText;
            btn.innerText = 'Downloading...';
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.7';
            try {
               const response = await fetch(url);
               const blob = await response.blob();
               const blobUrl = URL.createObjectURL(blob);
               const link = document.createElement('a');
               link.href = blobUrl;
               link.download = filename;
               document.body.appendChild(link);
               link.click();
               document.body.removeChild(link);
               URL.revokeObjectURL(blobUrl);
            } catch (e) {
               console.error('Download failed, falling back to open in tab:', e);
               window.open(url, '_blank');
            } finally {
               btn.innerText = originalText;
               btn.style.pointerEvents = 'auto';
               btn.style.opacity = '1';
            }
         };

         window.openBookDetail = (id) => {
            const book = allBooksData.find(b => b.id === id);
            if (!book) return;
            
            document.getElementById('library-list-view').classList.add('hidden');
            document.getElementById('library-detail-view').classList.remove('hidden');
            
            document.getElementById('book-detail-title').innerText = book.title;
            
            // Set colored level badge
            const lvlBadge = document.getElementById('book-detail-level');
            lvlBadge.innerText = `level: ${book.level || 'Medium'}`;
            lvlBadge.className = 'text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border';
            const lvl = (book.level || 'Medium').toLowerCase();
            if (lvl === 'easy') {
               lvlBadge.classList.add('text-emerald-400', 'bg-emerald-950/40', 'border-emerald-500/30');
            } else if (lvl === 'hard') {
               lvlBadge.classList.add('text-rose-400', 'bg-rose-950/40', 'border-rose-500/30');
            } else {
               lvlBadge.classList.add('text-amber-400', 'bg-amber-950/40', 'border-amber-500/30');
            }
            
            document.getElementById('book-detail-theme').innerText = `theme: ${book.theme || 'General'}`;
            document.getElementById('book-detail-author').innerText = `author: ${book.author || 'Unknown'}`;
            
            // Render tags list
            const tagsBadgeContainer = document.getElementById('book-detail-tags');
            if (book.tags && book.tags.length > 0) {
               tagsBadgeContainer.innerHTML = book.tags.map(t => `
                  <span class="text-[9px] font-bold bg-[#14325a]/40 border border-[#1b3e63] px-2 py-0.5 rounded text-slate-300 capitalize">${t}</span>
               `).join('');
            } else {
               tagsBadgeContainer.innerHTML = '';
            }

            document.getElementById('book-detail-cover').src = book.cover_image || '';
            document.getElementById('book-detail-desc').innerText = book.description || 'No description available.';
            document.getElementById('btn-book-download').onclick = (e) => {
               e.preventDefault();
               window.downloadBookFile(book.download_url, book.title + '.pdf');
            };
            document.getElementById('btn-book-read').href = book.read_url || '#';
            document.getElementById('book-detail-credits').innerText = `Contributed by ${book.contributor || 'Anonymous'}`;
            
            // Render similar books by Theme
            const similarContainer = document.getElementById('book-similar-list');
            const similar = allBooksData.filter(b => b.id !== book.id && b.theme === book.theme);
            if (similar.length === 0) {
               similarContainer.innerHTML = '<p class="text-xs text-slate-500 italic">No similar books found</p>';
            } else {
               similarContainer.innerHTML = similar.slice(0, 3).map(s => `
                  <a onclick="window.openBookDetail(${s.id})" class="text-xs text-[#8ecae6] hover:text-white underline cursor-pointer block truncate">${s.title}</a>
               `).join('');
            }
            
            // Render playlist
            document.getElementById('book-theme-header').innerText = `Books <${book.theme || 'THEME'}>`;
            const playlistContainer = document.getElementById('book-playlist-list');
            const sameTheme = allBooksData.filter(b => b.theme === book.theme);
            playlistContainer.innerHTML = sameTheme.map(p => `
               <button onclick="window.openBookDetail(${p.id})" class="text-left px-3 py-2 rounded-lg text-xs font-semibold ${p.id === book.id ? 'bg-[#0d2a53] text-[#8ecae6]' : 'text-slate-400 hover:bg-[#0a2336] hover:text-slate-200'} transition-all truncate block w-full">${p.title}</button>
            `).join('');
         };
