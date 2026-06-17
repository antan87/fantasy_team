import fs from 'fs';
import path from 'path';

const REQUEST_FILE = path.join(process.cwd(), 'temp/advisor_request.json');

if (!fs.existsSync(REQUEST_FILE)) {
  console.error('Error: No active advisor request found in temp/advisor_request.json');
  console.log('Please click "Get CLI AI Advice" in the web application first.');
  process.exit(1);
}

try {
  const requestData = JSON.parse(fs.readFileSync(REQUEST_FILE, 'utf-8'));
  console.log('--- Active Advisor Request Found ---');
  console.log(requestData.prompt);
  console.log('-----------------------------------');
  console.log('\n>>> CLI AGENT (ANTIGRAVITY) ACTION REQUIRED:');
  console.log('    1. Review the request details above.');
  console.log('    2. Perform web searches for team lineups, injuries, and news if needed.');
  console.log('    3. Write the response as JSON to temp/advisor_response.json containing a "text" field.');
} catch (err) {
  console.error('Error reading request file:', err.message);
  process.exit(1);
}
