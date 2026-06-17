import fs from 'fs';
import path from 'path';

const REQUEST_FILE = path.join(process.cwd(), 'temp/advisor_request.json');

const mockRequest = {
  prompt: `You are an elite, mathematical Sportbladet Manager (Aftonbladet World Cup Fantasy) strategic analyst.
My current squad for Round 1:
- Hernán Galíndez (Ecuador, GK): Price 3.5M kr, Expected Points: 4.5
- Antonee Robinson (USA, DEF): Price 3.5M kr, Expected Points: 5.0
- Marquinhos (Brazil, DEF): Price 4.5M kr, Expected Points: 6.0
- Virgil van Dijk (Netherlands, DEF): Price 5.0M kr, Expected Points: 5.5
- John Stones (England, DEF): Price 5.0M kr, Expected Points: 5.2
- Kevin De Bruyne (Belgium, MID): Price 7.5M kr, Expected Points: 7.0
- Bukayo Saka (England, MID): Price 6.5M kr, Expected Points: 6.5
- Jude Bellingham (England, MID): Price 7.0M kr, Expected Points: 6.8
- Federico Valverde (Uruguay, MID): Price 5.5M kr, Expected Points: 5.0
- Kylian Mbappé (France, FWD): Price 9.5M kr, Expected Points: 8.5
- Lionel Messi (Argentina, FWD): Price 9.0M kr, Expected Points: 8.0

Remaining bank budget: 2.00M kr
Active Round: Round 1 (Group Stage 1)
Transfer Fee: 0%

Please perform a web search to confirm the latest team lineups, injured/suspended players, and World Cup news before responding.
Please provide:
1. Roster Evaluation
2. Transfer Recommendations
3. Captaincy Choice
4. General Strategy`
};

fs.mkdirSync(path.dirname(REQUEST_FILE), { recursive: true });
fs.writeFileSync(REQUEST_FILE, JSON.stringify(mockRequest, null, 2), 'utf-8');
console.log('Mock request written to temp/advisor_request.json');
