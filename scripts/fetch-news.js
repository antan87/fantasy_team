import fs from 'fs';
import path from 'path';

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Football (EN)' },
  { url: 'https://www.svt.se/sport/rss.xml', source: 'SVT Sport (SE)' },
  { url: 'https://www.expressen.se/rss/sport', source: 'Expressen Sport (SE)' }
];

const OUTPUT_FILE = path.join(process.cwd(), 'src/data/worldcup_news.json');

async function fetchFeed(feed) {
  try {
    const res = await fetch(feed.url);
    if (!res.ok) {
      console.warn(`Failed to fetch ${feed.source}, status: ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const items = [];
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = (itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemXml.match(/<title>([\s\S]*?)<\/title>/))?.[1] || '';
      const description = (itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemXml.match(/<description>([\s\S]*?)<\/description>/))?.[1] || '';
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      
      items.push({
        title: decodeHtml(title),
        description: decodeHtml(description),
        link: link.trim(),
        pubDate: pubDate.trim(),
        source: feed.source
      });
    }
    return items;
  } catch (error) {
    console.error(`Error parsing ${feed.source}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('Fetching latest soccer/World Cup news from Swedish and international media...');
  const allResults = await Promise.all(FEEDS.map(fetchFeed));
  const mergedItems = allResults.flat();
  
  // Filter for World Cup/VM/Football keyword items
  const keywords = ['world cup', 'worldcup', 'fifa', 'vm', 'fotboll', 'elvan', 'manager', 'kane', 'messi', 'squad', 'cup', 'gyökeres', 'güler', 'yamal'];
  const filtered = mergedItems.filter(item => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });

  // Sort by date or fallback to interleaved sources
  const sorted = filtered.length > 0 ? filtered : mergedItems;
  const finalItems = sorted.slice(0, 15);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalItems, null, 2), 'utf-8');
  console.log(`Saved ${finalItems.length} news items to ${OUTPUT_FILE}`);
}

function decodeHtml(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aring;/g, 'å')
    .replace(/&Aring;/g, 'Å')
    .replace(/&auml;/g, 'ä')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .trim();
}

main();
