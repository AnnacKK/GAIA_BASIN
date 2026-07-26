import { createClient } from "@libsql/client";

const databaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_BOOKS_DATABASE_URL 
  : process.env.TURSO_BOOKS_DATABASE_URL;

const authToken = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_BOOKS_AUTH_TOKEN 
  : process.env.TURSO_BOOKS_AUTH_TOKEN;

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

async function fetchBookDetails(title) {
   let author = 'Unknown';
   let coverImage = null;
   
   try {
      // 1. Search by title first
      let url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
      let res = await fetch(url);
      if (res.ok) {
         let data = await res.json();
         if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            if (doc.cover_i) {
               coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }
            if (doc.author_name && doc.author_name.length > 0) {
               author = doc.author_name.join(', ');
            }
         }
      }
      
      // 2. Search general q
      if (!coverImage) {
         url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1`;
         res = await fetch(url);
         if (res.ok) {
            let data = await res.json();
            if (data.docs && data.docs.length > 0) {
               const doc = data.docs[0];
               if (doc.cover_i) {
                  coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
               }
               if (doc.author_name && doc.author_name.length > 0 && author === 'Unknown') {
                  author = doc.author_name.join(', ');
               }
            }
         }
      }
   } catch (e) {
      console.error("Failed to fetch book details from OpenLibrary:", e);
   }
   
   if (!coverImage) {
      const covers = [
         'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop',
         'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop',
         'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop'
      ];
      coverImage = covers[Math.floor(Math.random() * covers.length)];
   }
   
   return { coverImage, author };
}

export const GET = async () => {
  try {
     // 1. Fetch file list from the Hugging Face Bucket tree API
     const hfRes = await fetch('https://huggingface.co/api/buckets/AnackSII/GAIA_BASIN/tree?t=' + Date.now());
     
     if (hfRes.ok) {
        const files = await hfRes.json();
        
        if (Array.isArray(files)) {
           // Fetch all existing book download URLs to check duplicates and remove stale ones
           const dbBooksRes = await client.execute("SELECT download_url FROM books");
           const dbUrls = new Set(dbBooksRes.rows.map(r => r.download_url));
           
           // Build set of current valid bucket URLs
           const hfUrls = new Set(files
              .filter(f => f.type === 'file' && f.path.toLowerCase().endsWith('.pdf'))
              .map(f => `https://huggingface.co/buckets/AnackSII/GAIA_BASIN/resolve/${encodeURIComponent(f.path)}`)
           );

           // Remove books from DB that no longer exist in the Hugging Face bucket
           for (const dbUrl of dbUrls) {
              if (!hfUrls.has(dbUrl)) {
                 await client.execute({
                    sql: "DELETE FROM books WHERE download_url = ?",
                    args: [dbUrl]
                 });
              }
           }
           
           for (const file of files) {
              if (file.type !== 'file' || !file.path.toLowerCase().endsWith('.pdf')) continue;
              
              const downloadUrl = `https://huggingface.co/buckets/AnackSII/GAIA_BASIN/resolve/${encodeURIComponent(file.path)}`;
              
              if (!dbUrls.has(downloadUrl)) {
                 // Format a human-readable title from the filename
                 let title = file.path
                    .replace(/\.pdf$/i, '')
                    .replace(/[_-]/g, ' ')
                    .trim();
                 
                 // Smart theme guessing
                 let theme = 'General';
                 let level = 'Medium';
                 let tags = ['huggingface', 'pdf'];
                 
                 if (title.toLowerCase().includes('design') || title.toLowerCase().includes('oop')) {
                    theme = 'Software Design';
                    level = 'Hard';
                    tags.push('programming', 'oop');
                 } else if (title.toLowerCase().includes('stat') || title.toLowerCase().includes('data')) {
                    theme = 'Data Science';
                    level = 'Hard';
                    tags.push('statistics', 'data-science');
                 } else if (title.toLowerCase().includes('course') || title.toLowerCase().includes('notes')) {
                    theme = 'Course Notes';
                    tags.push('education', 'notes');
                 }
                 
                 const bookDetails = await fetchBookDetails(title);
                 
                 // Insert book
                 const insertRes = await client.execute({
                    sql: "INSERT INTO books (title, description, cover_image, download_url, read_url, level, theme, contributor, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [title, `Resource file uploaded to AnackSII/GAIA_BASIN bucket: ${file.path}`, bookDetails.coverImage, downloadUrl, downloadUrl, level, theme, 'AnackSII', bookDetails.author]
                 });
                 const bookId = Number(insertRes.lastInsertRowid);
                 
                 // Insert tags
                 for (const t of tags) {
                    await client.execute({
                       sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)",
                       args: [t]
                    });
                    const tagRes = await client.execute({
                       sql: "SELECT id FROM tags WHERE name = ?",
                       args: [t]
                    });
                    if (tagRes.rows.length > 0) {
                       const tagId = tagRes.rows[0].id;
                       await client.execute({
                          sql: "INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)",
                          args: [bookId, tagId]
                       });
                    }
                 }
              }
           }
        }
     }
  } catch (error) {
     console.error("Hugging Face Bucket sync failed, falling back to database:", error);
  }

  try {
     const dbResult = await client.execute(`
        SELECT b.*, GROUP_CONCAT(t.name) as tags
        FROM books b
        LEFT JOIN book_tags bt ON b.id = bt.book_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE b.approved = 1
        GROUP BY b.id
        ORDER BY b.id DESC
     `);
     
     const books = dbResult.rows.map(row => {
        return {
           id: row.id,
           title: row.title,
           description: row.description,
           cover_image: row.cover_image,
           download_url: row.download_url,
           read_url: row.read_url,
           level: row.level,
           theme: row.theme,
           contributor: row.contributor,
           author: row.author || 'Unknown',
           tags: row.tags ? row.tags.split(',') : [],
           created_at: row.created_at
        };
     });

     return new Response(JSON.stringify(books), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Database query failed:", error);
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
     });
  }
};
