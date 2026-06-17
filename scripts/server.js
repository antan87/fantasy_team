import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { DatabaseSync } from 'node:sqlite';

const PORT = 3001;
const REQUEST_FILE = path.join(process.cwd(), 'temp/advisor_request.json');
const RESPONSE_FILE = path.join(process.cwd(), 'temp/advisor_response.json');

// Initialize SQLite Database
const DB_DIR = path.join(process.cwd(), 'temp');
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_FILE = path.join(DB_DIR, 'persistence.db');
const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

const selectAllStmt = db.prepare('SELECT key, value FROM kv');
const insertStmt = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
const deleteStmt = db.prepare('DELETE FROM kv WHERE key = ?');

// Start Vite dev server in the background
console.log('Starting Vite dev server...');
const viteProcess = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code || 0);
});

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL to handle query parameters correctly
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // SQLite Persistence Endpoint
  if (pathname === '/api/persistence') {
    if (req.method === 'GET') {
      try {
        const rows = selectAllStmt.all();
        const data = {};
        for (const row of rows) {
          data[row.key] = row.value;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const { key, value } = JSON.parse(body);
          if (!key) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing key' }));
            return;
          }
          insertStmt.run(key, value);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Invalid payload: ${err.message}` }));
        }
      });
      return;
    } else if (req.method === 'DELETE') {
      const key = parsedUrl.searchParams.get('key');
      if (!key) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing key query parameter' }));
        return;
      }
      try {
        deleteStmt.run(key);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  if (pathname === '/api/request-advice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        
        // Clean up old files
        if (fs.existsSync(RESPONSE_FILE)) {
          fs.unlinkSync(RESPONSE_FILE);
        }

        // Save new request
        fs.mkdirSync(path.dirname(REQUEST_FILE), { recursive: true });
        fs.writeFileSync(REQUEST_FILE, JSON.stringify(payload, null, 2), 'utf-8');
        
        console.log('\n[Antigravity CLI Advisor] Request received and saved to temp/advisor_request.json!');
        console.log('\x1b[36m%s\x1b[0m', '>>> PLEASE RUN THIS COMMAND IN YOUR ACTIVE ANTIGRAVITY CLI CHAT TERMINAL:');
        console.log('\x1b[33m%s\x1b[0m', '    process advisor request');
        console.log('');

        // Wait for response file to be created (poll every 1 second, max 180 seconds)
        let seconds = 0;
        const maxWait = 180;
        
        const checkResponse = setInterval(() => {
          seconds++;
          if (fs.existsSync(RESPONSE_FILE)) {
            clearInterval(checkResponse);
            try {
              const responseData = JSON.parse(fs.readFileSync(RESPONSE_FILE, 'utf-8'));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(responseData));
              
              // Clean up request file
              if (fs.existsSync(REQUEST_FILE)) {
                fs.unlinkSync(REQUEST_FILE);
              }
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Failed to read response file: ${err.message}` }));
            }
          } else if (seconds >= maxWait) {
            clearInterval(checkResponse);
            res.writeHead(504, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Timeout waiting for Antigravity Agent to process request. Make sure you typed "process advisor request" in the CLI chat.' }));
          }
        }, 1000);

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
      }
    });
  } else if (req.url === '/api/fetch-news' && req.method === 'POST') {
    console.log('[Proxy Server] Spawning news crawler (fetch-news)...');
    const crawler = spawn('node', ['scripts/fetch-news.js'], { shell: true });
    let stdout = '';
    let stderr = '';
    crawler.stdout.on('data', data => stdout += data.toString());
    crawler.stderr.on('data', data => stderr += data.toString());
    crawler.on('close', (code) => {
      console.log(`[Proxy Server] News crawler exited with code ${code}`);
      if (code === 0) {
        const newsFile = path.join(process.cwd(), 'src/data/worldcup_news.json');
        let news = [];
        if (fs.existsSync(newsFile)) {
          news = JSON.parse(fs.readFileSync(newsFile, 'utf-8'));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, news }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `News crawler failed: ${stderr || stdout}` }));
      }
    });
  } else if (req.url === '/api/scrape' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const round = payload.round || 1;
        console.log(`[Proxy Server] Spawning player scraper for round ${round}...`);
        
        const scraper = spawn('node', ['scripts/scrape.js', round.toString()], { shell: true });
        let stdout = '';
        let stderr = '';
        scraper.stdout.on('data', data => stdout += data.toString());
        scraper.stderr.on('data', data => stderr += data.toString());
        
        scraper.on('close', (code) => {
          console.log(`[Proxy Server] Player scraper exited with code ${code}`);
          if (code === 0) {
            const playersFile = path.join(process.cwd(), `src/data/players_round_${round}.json`);
            let playersCount = 0;
            if (fs.existsSync(playersFile)) {
              const players = JSON.parse(fs.readFileSync(playersFile, 'utf-8'));
              playersCount = players.length;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, round, count: playersCount }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Player scraper failed: ${stderr || stdout}` }));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Antigravity Advisor local API proxy server listening on http://localhost:${PORT}`);
});
