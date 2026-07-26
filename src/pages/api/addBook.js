import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { createClient } from "@libsql/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
         'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop',
         'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=300&auto=format&fit=crop',
         'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop'
      ];
      coverImage = covers[Math.floor(Math.random() * covers.length)];
   }
   
   return { coverImage, author };
}

const s3 = new S3Client({
  endpoint: "https://s3.hf.co/AnackSII",
  region: "us-east-1",
  credentials: {
     accessKeyId: import.meta.env.HF_S3_ACCESS_KEY_ID || process.env.HF_S3_ACCESS_KEY_ID,
     secretAccessKey: import.meta.env.HF_S3_SECRET_ACCESS_KEY || process.env.HF_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export const POST = async ({ request }) => {
  // 1. Verify Authentication
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
     // Fetch username from GitHub profile
     const userRes = await fetch('https://api.github.com/user', {
        headers: {
           Authorization: `token ${session.access_token}`,
           Accept: 'application/vnd.github.v3+json',
        },
     });
     if (!userRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to verify identity' }), { status: 500 });
     }
     const userData = await userRes.json();
     const contributor = userData.login || 'Anonymous';

     // 2. Parse Multipart Form Data
     const formData = await request.formData();
     const title = formData.get('title');
     const description = formData.get('description') || '';
     const theme = formData.get('theme') || 'General';
     const level = formData.get('level') || 'Medium';
     const tagsRaw = formData.get('tags') || '';
     const file = formData.get('file');

     if (!title || !file) {
        return new Response(JSON.stringify({ error: 'Missing title or book file' }), { status: 400 });
     }

     const filename = file.name || `${title.replace(/\s+/g, '_')}.pdf`;
     
     // 3. Convert uploaded file to Buffer
     const arrayBuffer = await file.arrayBuffer();
     const fileBuffer = Buffer.from(arrayBuffer);

     console.log(`Uploading ${filename} to Hugging Face bucket...`);
     
     // 4. Upload file to S3 Hugging Face Bucket
     await s3.send(new PutObjectCommand({
        Bucket: "GAIA_BASIN",
        Key: filename,
        Body: fileBuffer,
        ContentType: file.type || "application/pdf"
     }));

     console.log("Hugging Face upload success. Inserting metadata to Turso...");

     // 5. Construct URLs
     const downloadUrl = `https://huggingface.co/buckets/AnackSII/GAIA_BASIN/resolve/${encodeURIComponent(filename)}`;
     
     const bookDetails = await fetchBookDetails(title);

     const isApproved = contributor === 'AnnacKK' ? 1 : 0;

     // 6. Insert metadata into Turso Books database
     const insertRes = await client.execute({
        sql: "INSERT INTO books (title, description, cover_image, download_url, read_url, level, theme, contributor, author, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [title, description, bookDetails.coverImage, downloadUrl, downloadUrl, level, theme, contributor, bookDetails.author, isApproved]
     });
     const bookId = Number(insertRes.lastInsertRowid);

     // 7. Parse and insert tags
     const tags = tagsRaw.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean);
     // Add default tags based on theme
     tags.push(theme.toLowerCase().replace(/\s+/g, '-'));
     tags.push('pdf');
     tags.push('huggingface');

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

     return new Response(JSON.stringify({ success: true, bookId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Failed to add book:", error);
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
     });
  }
};
