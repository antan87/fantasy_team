import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchData(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error fetching ${url}! Status: ${response.status}`);
  }
  return response.json();
}

async function main() {
  const gameId = 735;
  console.log(`🤖 Starting Aftonbladet Swush Scraper for Game ID ${gameId}...`);

  // Parse command line arguments for specific round (e.g. npm run scrape 1)
  let roundArg = process.argv[2];
  let roundNum = roundArg ? parseInt(roundArg, 10) : null;

  try {
    // 1. Fetch game details to resolve active round if none provided
    console.log('1/5. Fetching game configuration...');
    const game = await fetchData(`https://api-manager.aftonbladet.se/games/${gameId}`);
    
    if (!roundNum) {
      // Determine active round based on current time
      const now = new Date();
      let activeRoundIndex = 0;
      
      // Find the first round that is either currently active or has close date in the future
      for (let i = 0; i < game.rounds.length; i++) {
        const round = game.rounds[i];
        const start = new Date(round.start);
        const end = new Date(round.end);
        
        if (now >= start && now <= end) {
          activeRoundIndex = i;
          break;
        }
        if (now < start) {
          activeRoundIndex = Math.max(0, i - 1); // fallback to previous or stay at 0
          break;
        }
        activeRoundIndex = i; // if all are in the past, default to last
      }
      
      roundNum = activeRoundIndex + 1;
      console.log(`No round specified. Autodetected active round: ${roundNum}`);
    }

    console.log(`Targeting Round ${roundNum} for statistics and valuations.`);

    // 2. Fetch all required datasets in parallel
    console.log('2/5. Downloading player lists, person details, teams, round stats, matches, and ruleset...');
    const [players, persons, teams, roundStatsData, matches, ruleset] = await Promise.all([
      fetchData(`https://api-manager.aftonbladet.se/games/${gameId}/players`),
      fetchData(`https://api-manager.aftonbladet.se/games/${gameId}/persons`),
      fetchData(`https://api-manager.aftonbladet.se/games/${gameId}/teams`),
      fetchData(`https://api-manager.aftonbladet.se/games/${gameId}/rounds/${roundNum}/statistics?appid=aftonbladet&culture=sv-SE`),
      fetchData(`https://api-manager.aftonbladet.se/games/${gameId}/rounds/${roundNum}/matches`),
      fetchData(`https://api-manager.aftonbladet.se/rulesets/${game.ruleset.id}?appid=aftonbladet&culture=sv-SE`)
    ]);

    console.log(`Downloaded ${players.length} players, ${persons.length} persons, ${teams.length} teams, ${roundStatsData.length} round-stats records, and ${matches.length} matches.`);

    // Create event types lookup map
    const eventTypeMap = new Map(ruleset.eventTypes.map(et => [et.id, et.name]));

    // 3. Create maps for O(1) lookups
    console.log('3/5. Indexing records for merge operation...');
    const personMap = new Map(persons.map(p => [p.id, p]));
    const teamMap = new Map(teams.map(t => [t.id, t]));
    
    // Map statistics endpoint format to the old roundPlayer format
    const roundPlayerMap = new Map(roundStatsData.map(rp => {
      // Map events arrays to Record<string, number> using ruleset names
      const roundEvents = {};
      const totalEvents = {};
      
      if (rp.events && rp.events.round) {
        rp.events.round.forEach(e => {
          const name = eventTypeMap.get(e.type.id) || e.type.id.toString();
          roundEvents[name] = (roundEvents[name] || 0) + e.amount;
        });
      }
      if (rp.events && rp.events.total) {
        rp.events.total.forEach(e => {
          const name = eventTypeMap.get(e.type.id) || e.type.id.toString();
          totalEvents[name] = (totalEvents[name] || 0) + e.amount;
        });
      }

      return [rp.player.id, {
        value: rp.values.value,
        popularity: Math.round(rp.values.popularity * 1000), // convert 0.2769 -> 277
        growth: rp.values.growth,
        totalGrowth: rp.values.totalGrowth,
        trend: rp.values.trend,
        events: {
          round: roundEvents,
          total: totalEvents
        }
      }];
    }));

    const posMap = {
      6: 'GK',
      7: 'DEF',
      8: 'MID',
      9: 'FWD'
    };

    // 4. Merge records
    console.log('4/5. Merging datasets...');
    const mergedPlayers = [];

    for (const p of players) {
      const person = personMap.get(p.person.id);
      const team = teamMap.get(p.team.id);
      const roundStats = roundPlayerMap.get(p.id);

      if (!person || !team || !roundStats) continue;

      // Accents / Translation fallback (sv-SE if available, English, otherwise default name)
      const teamName = team.translations?.['sv-SE']?.name || team.name;

      // Price in kr (e.g. 5,000,000 kr -> 5.0M)
      const price = roundStats.value / 1000000;

      // Popularity (ownership rate). In Swush, popularity: 49 means 4.9%
      const ownershipPercent = roundStats.popularity / 10;

      mergedPlayers.push({
        id: p.id.toString(),
        name: `${person.firstname} ${person.lastname}`.trim(),
        team: teamName,
        pos: posMap[p.position.id] || 'MID',
        price: price,
        own: ownershipPercent,
        active: p.active && !p.eliminated,
        stats: {
          value: roundStats.value,
          popularity: roundStats.popularity,
          growth: roundStats.growth,
          totalGrowth: roundStats.totalGrowth,
          trend: roundStats.trend,
          events: roundStats.events
        }
      });
    }

    // Sort by expected value growth density or value descending
    mergedPlayers.sort((a, b) => b.stats.popularity - a.stats.popularity);

    // Calculate team average player price based on top 11 players
    const teamPrices = {};
    mergedPlayers.forEach(p => {
      if (!teamPrices[p.team]) teamPrices[p.team] = [];
      teamPrices[p.team].push(p.price);
    });

    const teamStrengths = {};
    Object.entries(teamPrices).forEach(([team, prices]) => {
      const top11 = prices.sort((a, b) => b - a).slice(0, 11);
      const avg = top11.reduce((sum, pr) => sum + pr, 0) / Math.max(1, top11.length);
      teamStrengths[team] = avg;
    });

    const resolvedMatches = [];
    let matchIdCounter = 1;
    for (const m of matches) {
      const homeTeamObj = m.teams?.find(t => t.type === 'home');
      const awayTeamObj = m.teams?.find(t => t.type === 'away');
      
      let homeName = '';
      let awayName = '';
      
      if (homeTeamObj && awayTeamObj) {
        const homeTeam = teamMap.get(homeTeamObj.team);
        const awayTeam = teamMap.get(awayTeamObj.team);
        homeName = homeTeam?.translations?.['sv-SE']?.name || homeTeam?.name || `Team ${homeTeamObj.team}`;
        awayName = awayTeam?.translations?.['sv-SE']?.name || awayTeam?.name || `Team ${awayTeamObj.team}`;
      } else {
        // Fallback for knockouts where teams are not yet determined (e.g. "Second A - Second B")
        const parts = m.name ? m.name.split(' | ')[0].split(' - ') : ['TBD Home', 'TBD Away'];
        homeName = parts[0] || 'TBD Home';
        awayName = parts[1] || 'TBD Away';
      }

      // Calculate strengths
      const sHome = teamStrengths[homeName] || 3.0;
      const sAway = teamStrengths[awayName] || 3.0;
      
      // Calculate odds using hyperbolic tangent mapping
      const diff = sHome - sAway;
      const factor = Math.tanh(diff / 2.0);
      
      const homeWinProb = Math.max(0.05, Math.min(0.95, parseFloat((0.38 + 0.35 * factor).toFixed(2))));
      const awayWinProb = Math.max(0.05, Math.min(0.95, parseFloat((0.38 - 0.35 * factor).toFixed(2))));
      const drawProb = Math.max(0.05, parseFloat((1.0 - homeWinProb - awayWinProb).toFixed(2)));
      
      const homeCleanSheetProb = Math.max(0.05, Math.min(0.95, parseFloat((0.30 + 0.20 * factor).toFixed(2))));
      const awayCleanSheetProb = Math.max(0.05, Math.min(0.95, parseFloat((0.30 - 0.20 * factor).toFixed(2))));
      
      const homeExpectedGoals = Math.max(0.1, parseFloat((1.3 + 0.9 * factor).toFixed(1)));
      const awayExpectedGoals = Math.max(0.1, parseFloat((1.3 - 0.9 * factor).toFixed(1)));

      // Parse date/time
      const startDate = new Date(m.start);
      const dateStr = startDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = startDate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

      resolvedMatches.push({
        id: m.id || matchIdCounter++,
        home: homeName,
        away: awayName,
        day: 1, // calculated below
        date: dateStr,
        time: timeStr,
        start: m.start,
        status: m.status || 'pending',
        homeScore: m.properties?.homeScore !== undefined && m.properties.homeScore !== '' ? parseInt(m.properties.homeScore, 10) : null,
        awayScore: m.properties?.awayScore !== undefined && m.properties.awayScore !== '' ? parseInt(m.properties.awayScore, 10) : null,
        homeWinProb,
        drawProb,
        awayWinProb,
        homeCleanSheetProb,
        awayCleanSheetProb,
        homeExpectedGoals,
        awayExpectedGoals
      });
    }

    // Sort matches by start time and assign relative day numbers
    resolvedMatches.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    if (resolvedMatches.length > 0) {
      const baseTime = new Date(resolvedMatches[0].start).getTime();
      resolvedMatches.forEach(m => {
        const diffDays = Math.floor((new Date(m.start).getTime() - baseTime) / (1000 * 60 * 60 * 24));
        m.day = diffDays + 1;
      });
    }

    // 5. Ensure target data directories exist and write JSON
    console.log('5/5. Writing output files...');
    const dataDir = path.join(__dirname, '..', 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const roundFileName = `players_round_${roundNum}.json`;
    const roundFilePath = path.join(dataDir, roundFileName);
    fs.writeFileSync(roundFilePath, JSON.stringify(mergedPlayers, null, 2));
    console.log(`✅ Success! Saved ${mergedPlayers.length} merged players to ${roundFilePath}`);

    const fixturesFileName = `fixtures_round_${roundNum}.json`;
    const fixturesFilePath = path.join(dataDir, fixturesFileName);
    fs.writeFileSync(fixturesFilePath, JSON.stringify(resolvedMatches, null, 2));
    console.log(`✅ Success! Saved ${resolvedMatches.length} matches to ${fixturesFilePath}`);

    // Create a copy as players.json (current fallback)
    const currentFilePath = path.join(dataDir, 'players.json');
    fs.writeFileSync(currentFilePath, JSON.stringify(mergedPlayers, null, 2));
    console.log(`✅ Success! Cloned to default active pointer: ${currentFilePath}`);

  } catch (err) {
    console.error('❌ Scraper process crashed:', err);
    process.exit(1);
  }
}

main();
