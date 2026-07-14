export const prerender = false;

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
       headers: {
         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
       }
    });
    
    if (!fetchResponse.ok) {
       throw new Error(`Failed to fetch URL: ${fetchResponse.statusText}`);
    }
    
    const html = await fetchResponse.text();
    
    // Naive Regex Parsing for OG Tags
    const getMetaTag = (property) => {
       const regex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
       const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["'][^>]*>`, 'i');
       const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
       
       let match = html.match(regex) || html.match(altRegex) || html.match(nameRegex);
       if (match && match[1]) {
           // Decode basic HTML entities
           return match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
       }
       return null;
    };
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = getMetaTag('og:title') || getMetaTag('twitter:title') || (titleMatch ? titleMatch[1] : null);
    
    const description = getMetaTag('og:description') || getMetaTag('twitter:description') || getMetaTag('description');
    const image = getMetaTag('og:image') || getMetaTag('twitter:image');
    
    // Resolve relative image URLs
    let resolvedImage = image;
    if (resolvedImage && !resolvedImage.startsWith('http')) {
        if (resolvedImage.startsWith('//')) {
            resolvedImage = 'https:' + resolvedImage;
        } else {
            const baseTarget = new URL(targetUrl);
            resolvedImage = new URL(resolvedImage, baseTarget.origin).toString();
        }
    }

    return new Response(JSON.stringify({
      title: title || targetUrl,
      description: description || '',
      image: resolvedImage || '',
      url: targetUrl
    }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error fetching link preview:', error);
    return new Response(JSON.stringify({ 
       error: 'Failed to generate preview', 
       details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
