import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { createClient } from "@libsql/client";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
     const currentUser = userData.login;
     const isAdmin = currentUser === 'AnnacKK';

     // 2. Parse payload
     const { id } = await request.json();
     if (!id) {
        return new Response(JSON.stringify({ error: 'Missing book ID' }), { status: 400 });
     }

     // 3. Query the book to check ownership and retrieve download URL
     const bookRes = await client.execute({
        sql: "SELECT contributor, download_url FROM books WHERE id = ?",
        args: [id]
     });

     if (bookRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Book not found' }), { status: 444 });
     }

     const book = bookRes.rows[0];
     if (book.contributor !== currentUser && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: You do not own this book entry' }), { status: 403 });
     }

     // 4. Extract filename and delete from Hugging Face S3 Bucket
     if (book.download_url) {
        try {
           const filename = decodeURIComponent(book.download_url.split('/').pop());
           console.log(`Deleting ${filename} from Hugging Face bucket...`);
           await s3.send(new DeleteObjectCommand({
              Bucket: "GAIA_BASIN",
              Key: filename,
           }));
        } catch (s3Err) {
           console.error("Failed to delete book file from Hugging Face bucket:", s3Err);
        }
     }

     // 5. Delete metadata from Turso database (book_tags cascade delete automatically)
     await client.execute({
        sql: "DELETE FROM books WHERE id = ?",
        args: [id]
     });

     return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Failed to delete book:", error);
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
     });
  }
};
