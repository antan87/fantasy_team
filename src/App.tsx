import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Player, SquadPlayer, RoundConfig, MatchdayFixture, MatchScore, LivePlayerScore, TransferSuggestion } from './types';
import { useSquadManager } from './hooks/useSquadManager';
import playersFallback from './data/players.json';
import agentInsights from './data/agent_insights.json';

// --- CONFIGURATIONS FOR AFTONBLADET WORLD CUP 2026 FANTASY ---
const ROUND_CONFIGS: RoundConfig[] = [
  { id: 1, label: 'Matchday 1 (Groups)', budget: 50.0, transferFeePercent: 0.0, maxPlayersPerTeam: 4, closeDate: '2026-06-11T19:00:00Z' },
  { id: 2, label: 'Matchday 2 (Groups)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-06-18T16:00:00Z' },
  { id: 3, label: 'Matchday 3 (Groups)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-06-24T19:00:00Z' },
  { id: 4, label: 'Matchday 4 (Round of 32)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-06-28T19:00:00Z' },
  { id: 5, label: 'Matchday 5 (Round of 16)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-07-04T17:00:00Z' },
  { id: 6, label: 'Matchday 6 (Quarter-Finals)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-07-09T20:00:00Z' },
  { id: 7, label: 'Matchday 7 (Semi-Finals)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-07-14T19:00:00Z' },
  { id: 8, label: 'Matchday 8 (Final)', budget: 50.0, transferFeePercent: 0.7, maxPlayersPerTeam: 4, closeDate: '2026-07-18T21:00:00Z' }
];

const MATCHDAY_SCHEDULES: Record<number, MatchdayFixture[]> = {
  1: [
    { id: 1, home: 'Mexiko', away: 'Sydafrika', day: 1, date: '11 juni 2026', time: '13:00', homeWinProb: 0.55, drawProb: 0.25, awayWinProb: 0.20, homeCleanSheetProb: 0.38, awayCleanSheetProb: 0.22, homeExpectedGoals: 1.6, awayExpectedGoals: 0.9 },
    { id: 2, home: 'Sydkorea', away: 'Tjeckien', day: 1, date: '11 juni 2026', time: '20:00', homeWinProb: 0.38, drawProb: 0.28, awayWinProb: 0.34, homeCleanSheetProb: 0.30, awayCleanSheetProb: 0.32, homeExpectedGoals: 1.3, awayExpectedGoals: 1.2 },
    { id: 3, home: 'Kanada', away: 'Bosnien', day: 2, date: '12 juni 2026', time: '15:00', homeWinProb: 0.48, drawProb: 0.27, awayWinProb: 0.25, homeCleanSheetProb: 0.34, awayCleanSheetProb: 0.24, homeExpectedGoals: 1.5, awayExpectedGoals: 1.0 },
    { id: 4, home: 'USA', away: 'Paraguay', day: 2, date: '12 juni 2026', time: '18:00', homeWinProb: 0.52, drawProb: 0.26, awayWinProb: 0.22, homeCleanSheetProb: 0.36, awayCleanSheetProb: 0.22, homeExpectedGoals: 1.6, awayExpectedGoals: 0.9 },
    { id: 5, home: 'Brasilien', away: 'Marocko', day: 3, date: '13 juni 2026', time: '18:00', homeWinProb: 0.68, drawProb: 0.20, awayWinProb: 0.12, homeCleanSheetProb: 0.48, awayCleanSheetProb: 0.15, homeExpectedGoals: 2.2, awayExpectedGoals: 0.6 },
    { id: 6, home: 'Tyskland', away: 'Curaçao', day: 4, date: '14 juni 2026', time: '12:00', homeWinProb: 0.88, drawProb: 0.09, awayWinProb: 0.03, homeCleanSheetProb: 0.62, awayCleanSheetProb: 0.05, homeExpectedGoals: 3.2, awayExpectedGoals: 0.3 },
    { id: 7, home: 'Spanien', away: 'Kap Verde', day: 5, date: '15 juni 2026', time: '12:00', homeWinProb: 0.85, drawProb: 0.11, awayWinProb: 0.04, homeCleanSheetProb: 0.58, awayCleanSheetProb: 0.06, homeExpectedGoals: 2.9, awayExpectedGoals: 0.4 },
    { id: 8, home: 'Frankrike', away: 'Senegal', day: 6, date: '16 juni 2026', time: '15:00', homeWinProb: 0.62, drawProb: 0.22, awayWinProb: 0.16, homeCleanSheetProb: 0.44, awayCleanSheetProb: 0.18, homeExpectedGoals: 1.9, awayExpectedGoals: 0.7 },
    { id: 9, home: 'Argentina', away: 'Algeriet', day: 6, date: '16 juni 2026', time: '20:00', homeWinProb: 0.75, drawProb: 0.16, awayWinProb: 0.09, homeCleanSheetProb: 0.52, awayCleanSheetProb: 0.10, homeExpectedGoals: 2.4, awayExpectedGoals: 0.5 },
    { id: 10, home: 'England', away: 'Kroatien', day: 7, date: '17 juni 2026', time: '15:00', homeWinProb: 0.50, drawProb: 0.28, awayWinProb: 0.22, homeCleanSheetProb: 0.35, awayCleanSheetProb: 0.22, homeExpectedGoals: 1.5, awayExpectedGoals: 0.9 }
  ],
  2: [
    { id: 11, home: 'Mexiko', away: 'Tjeckien', day: 1, date: '18 juni 2026', time: '14:00', homeWinProb: 0.42, drawProb: 0.29, awayWinProb: 0.29, homeCleanSheetProb: 0.32, awayCleanSheetProb: 0.28, homeExpectedGoals: 1.4, awayExpectedGoals: 1.1 },
    { id: 12, home: 'Sydafrika', away: 'Sydkorea', day: 1, date: '18 juni 2026', time: '19:00', homeWinProb: 0.22, drawProb: 0.28, awayWinProb: 0.50, homeCleanSheetProb: 0.22, awayCleanSheetProb: 0.35, homeExpectedGoals: 0.9, awayExpectedGoals: 1.5 },
    { id: 13, home: 'Kanada', away: 'USA', day: 2, date: '19 juni 2026', time: '15:00', homeWinProb: 0.28, drawProb: 0.28, awayWinProb: 0.44, homeCleanSheetProb: 0.25, awayCleanSheetProb: 0.33, homeExpectedGoals: 1.0, awayExpectedGoals: 1.4 },
    { id: 14, home: 'Brasilien', away: 'Tyskland', day: 3, date: '20 juni 2026', time: '17:00', homeWinProb: 0.39, drawProb: 0.28, awayWinProb: 0.33, homeCleanSheetProb: 0.28, awayCleanSheetProb: 0.26, homeExpectedGoals: 1.4, awayExpectedGoals: 1.3 },
    { id: 15, home: 'Spanien', away: 'Frankrike', day: 4, date: '21 juni 2026', time: '18:00', homeWinProb: 0.36, drawProb: 0.29, awayWinProb: 0.35, homeCleanSheetProb: 0.27, awayCleanSheetProb: 0.27, homeExpectedGoals: 1.3, awayExpectedGoals: 1.3 }
  ]
};

// Swush Points (in kr) mapping
const SCORE_RULES = {
  SoccerDidPlay: 7000,
  SoccerDidNotPlay: -5000,
  SoccerYellowCard: -20000,
  SoccerSecondYellowCard: -20000,
  SoccerRedCard: -50000,
  SoccerOwnGoal: -50000,
  SoccerPenaltyMissed: -30000,
  SoccerShotOnGoal: 10000,
  SoccerSaveByGoalkeeper: 5000,
  SoccerManOfTheMatch: 33000,
  SoccerPlayerTeamWon: 25000,
  SoccerPlayerTeamDraw: 5000,
  SoccerPlayerTeamLost: -8000,
  SoccerPlayerToVictory: 40000,
  SoccerPlayerToDraw: 20000,
  SoccerAssist: 60000,
  SoccerGoalkeeperAssist: 50000,
  SoccerDefenderCleanSheet: 50000,
  SoccerGoalkeeperCleanSheet: 75000,
  SoccerDefenseGoal: 175000,
  SoccerMidfieldGoal: 150000,
  SoccerStrikerGoal: 125000,
  SoccerGoalkeeperGoal: 250000,
  SoccerOpposingTeamGoal: -8000
};

const FORMATIONS = [
  '3-4-3',
  '3-5-2',
  '4-3-3',
  '4-4-2',
  '4-5-1',
  '5-3-2',
  '5-4-1'
];

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const getEventValueChange = (event: string, pos: string): number => {
  switch (event) {
    case 'Lineup':
    case 'SubstituteIn':
      return 7000;
    case 'Goal':
      if (pos === 'GK') return 250000;
      if (pos === 'DEF') return 175000;
      if (pos === 'MID') return 150000;
      return 125000; // FWD
    case 'Assist':
      if (pos === 'GK') return 50000;
      return 60000;
    case 'YellowCard':
      return -20000;
    case 'SecondYellowCard':
      return -20000;
    case 'RedCard':
      return -50000;
    case 'OwnGoal':
      return -50000;
    case 'SaveByGoalkeeper':
      return 5000;
    case 'ShotOnGoal':
      return 10000;
    case 'ManOfTheMatch':
      return 33000;
    case 'CleanSheet':
      if (pos === 'GK') return 75000;
      if (pos === 'DEF') return 50000;
      return 0;
    case 'Conceded':
      return -8000;
    case 'Victory':
      return 40000;
    case 'Draw':
      return 20000;
    default:
      return 0;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'scout' | 'lineup' | 'transfers' | 'advisor' | 'sim' | 'chat'>('scout');
  const [activeRound, setActiveRound] = useState<number>(1);
  const [prevActiveRound, setPrevActiveRound] = useState<number>(1);
  const [playersDatabase, setPlayersDatabase] = useState<Player[]>([]);
  const [activeRoundFixtures, setActiveRoundFixtures] = useState<MatchdayFixture[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState<boolean>(true);

  if (activeRound !== prevActiveRound) {
    setPrevActiveRound(activeRound);
    setLoadingPlayers(true);
  }

  const activeRoundConfig = useMemo(() => {
    return ROUND_CONFIGS.find(r => r.id === activeRound) || ROUND_CONFIGS[0];
  }, [activeRound]);

  // Custom expected points overrides (user customized expected points)
  const [expectedPointsOverrides, setExpectedPointsOverrides] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ab_fantasy_ep_overrides_v1');
    return saved ? JSON.parse(saved) : {};
  });



  // Base Expected Points generator (estimated from ownership/popularity + value growth + opponent difficulty)
  // Base Expected Points generator (estimated from ownership + win/clean-sheet odds + expected goals)
  const getExpectedPoints = useCallback((player: Player): number => {
    if (expectedPointsOverrides[player.id] !== undefined) {
      return expectedPointsOverrides[player.id];
    }
    if (!player.active) return 0;

    // Find active fixture for this player's team in the active round
    const fixtures = activeRoundFixtures;
    const fixture = fixtures.find(f => f.home === player.team || f.away === player.team);

    let finalEP = (player.price * 0.4) + (player.own * 0.05); // base stats

    if (fixture) {
      const isHome = fixture.home === player.team;
      const winProb = isHome ? fixture.homeWinProb : fixture.awayWinProb;
      const cleanSheetProb = isHome ? fixture.homeCleanSheetProb : fixture.awayCleanSheetProb;
      const expectedGoals = isHome ? fixture.homeExpectedGoals : fixture.awayExpectedGoals;

      if (player.pos === 'GK') {
        // Goalkeeper Clean Sheet (+7.5 points) + Win (+2.5 points) + Saves
        finalEP = (cleanSheetProb * 7.5) + (winProb * 2.5) + 1.2;
      } else if (player.pos === 'DEF') {
        // Defender Clean Sheet (+5.0 points) + Win (+2.5 points) + Goal threat
        finalEP = (cleanSheetProb * 5.0) + (winProb * 2.5) + (expectedGoals * 0.25) + 0.6;
      } else if (player.pos === 'MID') {
        // Midfielder Win (+2.5 points) + Goal (+15.0 points) and Assist contributions
        const goalContribution = (expectedGoals * 1.5) * (player.price / 8.5);
        finalEP = (winProb * 2.5) + goalContribution + 1.0;
      } else if (player.pos === 'FWD') {
        // Forward Win (+2.5 points) + Goal (+12.5 points) contribution
        const goalContribution = (expectedGoals * 1.25) * (player.price / 8.5);
        finalEP = (winProb * 2.5) + goalContribution + 1.2;
      }
    }

    return parseFloat(Math.max(0.5, finalEP).toFixed(1));
  }, [expectedPointsOverrides, activeRoundFixtures]);

  // Squad manager custom hook
  const {
    currentSquad,
    bank,
    squadCost,
    squadExpectedPoints,
    squadValidation,
    draftPlayer,
    removePlayer,
    toggleCaptain,
    runKnapsackOptimizer,
    optimizeAllFormations,
    saveSquadAndBank,
    resetTransfers,
    lockSquad,
    lockedSquad
  } = useSquadManager(activeRound, activeRoundConfig, playersDatabase, getExpectedPoints);

  const squadGrowth = useMemo(() => {
    return currentSquad.reduce((acc, p) => acc + (p.stats?.growth || 0), 0);
  }, [currentSquad]);

  const captainGrowth = useMemo(() => {
    const captain = currentSquad.find(p => p.isCaptain);
    return captain?.stats?.growth || 0;
  }, [currentSquad]);

  const totalGrowth = squadGrowth + captainGrowth;

  const getPositionOrder = (pos: string): number => {
    switch (pos) {
      case 'GK': return 1;
      case 'DEF': return 2;
      case 'MID': return 3;
      case 'FWD': return 4;
      default: return 5;
    }
  };

  const sortedSquad = useMemo(() => {
    return [...currentSquad].sort((a, b) => {
      const posA = getPositionOrder(a.pos);
      const posB = getPositionOrder(b.pos);
      if (posA !== posB) return posA - posB;
      return b.price - a.price;
    });
  }, [currentSquad]);

  // Position Scout Helper State
  const [scoutPos, setScoutPos] = useState<'GK' | 'DEF' | 'MID' | 'FWD'>('DEF');
  const [scoutMaxPrice, setScoutMaxPrice] = useState<number>(15.0);
  const [scoutSort, setScoutSort] = useState<'popularity' | 'price' | 'growth' | 'expectedPoints'>('expectedPoints');
  const [scoutAffordableOnly, setScoutAffordableOnly] = useState<boolean>(true);
  const [scoutHideDrafted, setScoutHideDrafted] = useState<boolean>(true);

  const handleRemovePlayer = (player: Player) => {
    setScoutPos(player.pos);
    setScoutMaxPrice(player.price + bank);
    removePlayer(player.id);
  };

  const handleReplacePitchPlayer = (player: Player) => {
    handleRemovePlayer(player);
    setActiveTab('transfers');
    setTimeout(() => {
      const element = document.getElementById('position-scout-finder');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const scoutCandidates = useMemo(() => {
    return playersDatabase
      .filter((p) => {
        if (!p.active) return false;
        if (p.pos !== scoutPos) return false;
        if (scoutHideDrafted && currentSquad.some((s) => s.id === p.id)) return false;
        if (scoutAffordableOnly && p.price > bank) return false;
        if (p.price > scoutMaxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        if (scoutSort === 'expectedPoints') {
          return getExpectedPoints(b) - getExpectedPoints(a);
        } else if (scoutSort === 'growth') {
          return b.stats.totalGrowth - a.stats.totalGrowth;
        } else if (scoutSort === 'price') {
          return b.price - a.price;
        } else {
          return b.own - a.own;
        }
      });
  }, [playersDatabase, scoutPos, scoutHideDrafted, scoutAffordableOnly, scoutMaxPrice, scoutSort, bank, currentSquad, getExpectedPoints]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [posFilter, setPosFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const minPrice = 1.5;
  const [maxPrice, setMaxPrice] = useState<number>(15.0);
  const [sortKey, setSortKey] = useState<'popularity' | 'price' | 'growth' | 'expectedPoints'>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // AI Advisor State
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('ab_fantasy_gemini_key') || '');
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [worldCupNews, setWorldCupNews] = useState<{title: string, description: string, link: string, pubDate: string}[]>([]);

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hej! I am your Antigravity Tactical AI Assistant. Ask me anything about your VM-Elvan 2026 squad, player valuations, upcoming fixtures, clean sheet probabilities, or optimal transfer choices!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Custom interactive buttons & player scout report states
  const [newsLoading, setNewsLoading] = useState<boolean>(false);
  const [scrapeLoading, setScrapeLoading] = useState<boolean>(false);
  const [selectedScoutPlayer, setSelectedScoutPlayer] = useState<Player | null>(null);
  const [localEPOverride, setLocalEPOverride] = useState<string>('');
  const [playerScoutLoading, setPlayerScoutLoading] = useState<boolean>(false);
  const [playerScoutReport, setPlayerScoutReport] = useState<string>('');

  const handleSendChatMessage = async (e?: React.FormEvent, customInput?: string) => {
    if (e) e.preventDefault();
    const messageText = customInput || chatInput;
    if (!messageText.trim() || chatLoading) return;

    const userText = messageText.trim();
    if (!customInput) {
      setChatInput('');
    }

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatLoading(true);

    const squadContext = sortedSquad.map(p => 
      `- ${p.name} (${p.team}, ${p.pos}): Price ${p.price}M kr, Expected Points: ${getExpectedPoints(p)}${p.isCaptain ? ' (Captain)' : ''}`
    ).join('\n');

    const historyContext = updatedMessages.slice(-8).map(m => 
      `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`
    ).join('\n');

    const prompt = `You are an elite, highly analytical Aftonbladet Sportbladet Manager (VM-elvan 2026 / VM-elvan) strategic advisor.
The user wants to chat with you about their team selection, transfers, player statistics, or game rules.

--- GAME RULES & SYSTEM BACKGROUND ---
- Squad Size: Exactly 11 players. No bench.
- Formation: 1 GK, rest are outfielders. Formations allowed: 3-4-3, 3-5-2, 4-3-3, 4-4-2, 4-5-1, 5-3-2, 5-4-1.
- Captain Bonus (Lagkaptensbonus): Captain's value growth is doubled. One part goes to player valuation (Spelarvärde), and the other part is paid as cash into the Bank budget.
- Transfer Fee: 0% in Round 1. 0.7% on the purchase price of the bought player in Round 2+. You can sell/buy players at their current grown values.
- Nation Cap: Max 4 players from the same nation (increases to 5 in Round of 16, 6 in Quarters, 8 in Semis, 10 in Final).
- Points to Value Growth Map (in Swedish Krona - kr):
  * Played (Lineup/Sub In): +7,000 kr
  * Benched/Not Play: -5,000 kr
  * Yellow Card: -20,000 kr
  * Red Card / Second Yellow: -50,000 kr
  * Own Goal: -50,000 kr
  * Penalty Missed: -30,000 kr
  * Shot on Goal: +10,000 kr
  * GK Save: +5,000 kr
  * Man of the Match (MOTM): +33,000 kr
  * Match Result: Win +25,000 kr, Draw +5,000 kr, Lost -8,000 kr
  * Played to Win (on pitch during win): +40,000 kr
  * Played to Draw (on pitch during draw): +20,000 kr
  * Assist: GK +50,000 kr, Outfield +60,000 kr
  * Clean Sheet: GK +75,000 kr, DEF +50,000 kr, MID/FWD 0 kr
  * Goal Scored: GK +250,000 kr, DEF +175,000 kr, MID +150,000 kr, FWD +125,000 kr
  * Conceded Goal (GK/DEF): -8,000 kr per goal

--- CURRENT USER SQUAD & CONTEXT ---
${squadContext || 'No squad selected yet.'}
Remaining bank budget: ${bank.toFixed(2)}M kr
Active Round: Matchday ${activeRound} (Rules: ${activeRoundConfig.label}, Max per team: ${activeRoundConfig.maxPlayersPerTeam})
Transfer Fee: ${activeRoundConfig.transferFeePercent}%

Here is the conversation history:
${historyContext}

Please respond in a helpful, analytical, and friendly tone. Suggest smart transfers or captain choices when asked. Make mathematical decisions based on expected points (EP) and price values. Keep the response concise, punchy, and formatted in professional Markdown with bullet points. Let's keep it under 3 paragraphs.`;

    try {
      if (geminiApiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
          })
        });

        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned from Gemini.';
        
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(),
          sender: 'ai',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        const response = await fetch('http://localhost:3001/api/request-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Local proxy returned status ${response.status}`);
        }
        const data = await response.json();
        const text = data.text || 'No response returned from local agent.';
        
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(),
          sender: 'ai',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error('Chat Error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      
      let failText = `❌ Error calling AI: ${errMsg}`;
      if (!geminiApiKey) {
        failText += `\n\nPlease run the following command in your active Antigravity CLI terminal to generate the reply:\n\nprocess advisor request`;
      }
      
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'ai',
        text: failText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleFetchNews = async () => {
    setNewsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/fetch-news', {
        method: 'POST'
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setWorldCupNews(data.news);
        alert('Successfully crawled latest World Cup news feeds!');
      }
    } catch (err) {
      console.error('Error crawling news:', err);
      alert(`Error crawling news: ${err instanceof Error ? err.message : String(err)}. Make sure the local proxy server is running.`);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleScrapeData = async () => {
    setScrapeLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: activeRound })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        alert(`Successfully scraped round ${data.round} data! Loaded ${data.count} players.`);
        window.location.reload();
      }
    } catch (err) {
      console.error('Error scraping player valuations:', err);
      alert(`Error scraping player valuations: ${err instanceof Error ? err.message : String(err)}. Make sure the local proxy server is running.`);
    } finally {
      setScrapeLoading(false);
    }
  };

  const fetchPlayerScoutReport = async (player: Player) => {
    setSelectedScoutPlayer(player);
    setPlayerScoutLoading(true);
    setPlayerScoutReport('');
    
    const prompt = `You are an elite Aftonbladet Sportbladet Manager (VM-elvan 2026) tactical scout.
Please provide a detailed fantasy scout report for:
- Player: ${player.name}
- Position: ${player.pos}
- Country: ${player.team}
- Price: ${player.price}M kr
- Ownership: ${player.own}%

Consider the latest team lineups, player injuries, and World Cup news.
Format your response in markdown:
1. **Starting Status & Form:** Is he a guaranteed starter? Recent performances?
2. **Fixture Analysis:** How difficult are his upcoming group stage matches?
3. **Verdict:** Rate him as 'MUST-HAVE', 'BUY', 'HOLD', or 'SELL' with a 2-sentence mathematical justification based on his price.`;

    try {
      if (geminiApiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
          })
        });

        if (!response.ok) throw new Error(`API returned status ${response.status}`);
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No scout report returned.';
        setPlayerScoutReport(text);
      } else {
        const response = await fetch('http://localhost:3001/api/request-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Local proxy returned status ${response.status}`);
        }
        const data = await response.json();
        setPlayerScoutReport(data.text || 'No scout report returned from local agent.');
      }
    } catch (err) {
      console.error('Scout Report Error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (geminiApiKey) {
        setPlayerScoutReport(`❌ Error fetching scout report: ${errMsg}`);
      } else {
        setPlayerScoutReport(`❌ Error calling local CLI proxy: ${errMsg}\n\nPlease run the following command in your active Antigravity CLI terminal to generate the report:\n\nprocess advisor request`);
      }
    } finally {
      setPlayerScoutLoading(false);
    }
  };

  useEffect(() => {
    import('./data/worldcup_news.json')
      .then(module => {
        setWorldCupNews(module.default);
      })
      .catch(() => {
        setWorldCupNews([
          {
            title: "World Cup 2026 Preparations Underway",
            description: "Teams are finalizing their training camps. The opening game kicks off on June 11, 2026. Use this dashboard to plan your optimal squad.",
            link: "https://manager.aftonbladet.se/",
            pubDate: "June 9, 2026"
          }
        ]);
      });
  }, []);

  // Simulator State
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simMinutes, setSimMinutes] = useState<number>(0);
  // Removed unused simDay state
  const [matchScores, setMatchScores] = useState<Record<number, MatchScore>>({});
  const [playerLiveScores, setPlayerLiveScores] = useState<Record<string, LivePlayerScore>>({});
  const [simLog, setSimLog] = useState<string[]>(['Matchday simulator initialized. Waiting for kickoff.']);
  const lastProcessedMinute = useRef<number>(-1);

  // Dynamic loading of players and fixtures for the selected round
  useEffect(() => {
    setLoadingPlayers(true);

    if (import.meta.env.DEV) {
      // In development, fetch directly to bypass Vite module cache and watch ignore rules
      const loadDevData = async () => {
        try {
          const playersRes = await fetch(`/src/data/players_round_${activeRound}.json?t=${Date.now()}`);
          if (!playersRes.ok) throw new Error(`Status ${playersRes.status}`);
          const playersData = await playersRes.json();
          setPlayersDatabase(playersData);
        } catch (err) {
          console.warn(`Round ${activeRound} players dev fetch failed, falling back to players.json`, err);
          setPlayersDatabase(playersFallback as Player[]);
        }

        try {
          const fixturesRes = await fetch(`/src/data/fixtures_round_${activeRound}.json?t=${Date.now()}`);
          if (!fixturesRes.ok) throw new Error(`Status ${fixturesRes.status}`);
          const fixturesData = await fixturesRes.json();
          setActiveRoundFixtures(fixturesData);
        } catch (err) {
          console.warn(`Round ${activeRound} fixtures dev fetch failed, falling back to hardcoded schedules`, err);
          setActiveRoundFixtures(MATCHDAY_SCHEDULES[activeRound] || []);
        } finally {
          setLoadingPlayers(false);
        }
      };
      loadDevData();
    } else {
      // In production, use Vite's dynamic imports (so they are bundled properly)
      Promise.all([
        import(`./data/players_round_${activeRound}.json`)
          .then((module) => module.default)
          .catch((err) => {
            console.warn(`Round ${activeRound} players import failed`, err);
            return playersFallback as Player[];
          }),
        import(`./data/fixtures_round_${activeRound}.json`)
          .then((module) => module.default)
          .catch((err) => {
            console.warn(`Round ${activeRound} fixtures import failed`, err);
            return MATCHDAY_SCHEDULES[activeRound] || [];
          })
      ]).then(([players, fixtures]) => {
        setPlayersDatabase(players);
        setActiveRoundFixtures(fixtures);
        setLoadingPlayers(false);
      });
    }
  }, [activeRound]);

  const handleUpdateEP = (playerId: string, val: number) => {
    const updated = { ...expectedPointsOverrides, [playerId]: val };
    setExpectedPointsOverrides(updated);
    localStorage.setItem('ab_fantasy_ep_overrides_v1', JSON.stringify(updated));
  };

  const handleRemoveEPOverride = (playerId: string) => {
    const updated = { ...expectedPointsOverrides };
    delete updated[playerId];
    setExpectedPointsOverrides(updated);
    localStorage.setItem('ab_fantasy_ep_overrides_v1', JSON.stringify(updated));
  };

  const handleClearEPOverrides = () => {
    setExpectedPointsOverrides({});
    localStorage.removeItem('ab_fantasy_ep_overrides_v1');
  };

  useEffect(() => {
    if (selectedScoutPlayer) {
      setLocalEPOverride(expectedPointsOverrides[selectedScoutPlayer.id]?.toString() || '');
    }
  }, [selectedScoutPlayer, expectedPointsOverrides]);

  // Available Teams List for filter
  const teamsList = useMemo(() => {
    const teams = new Set(playersDatabase.map(p => p.team));
    return ['ALL', ...Array.from(teams).sort()];
  }, [playersDatabase]);

  // Filter & Sort Player Database
  const filteredPlayers = useMemo(() => {
    return playersDatabase.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            player.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPos = posFilter === 'ALL' || player.pos === posFilter;
      const matchesTeam = teamFilter === 'ALL' || player.team === teamFilter;
      const matchesPrice = player.price >= minPrice && player.price <= maxPrice;
      return matchesSearch && matchesPos && matchesTeam && matchesPrice;
    }).map(p => ({
      ...p,
      expectedPoints: getExpectedPoints(p)
    })).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortKey === 'popularity') {
        valA = a.own;
        valB = b.own;
      } else if (sortKey === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortKey === 'growth') {
        valA = a.stats.totalGrowth;
        valB = b.stats.totalGrowth;
      } else if (sortKey === 'expectedPoints') {
        valA = a.expectedPoints;
        valB = b.expectedPoints;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [playersDatabase, searchQuery, posFilter, teamFilter, minPrice, maxPrice, sortKey, sortOrder, getExpectedPoints]);



  // Transfer Advisor & Planner Trades calculation
  const transferSuggestions = useMemo<TransferSuggestion[]>(() => {
    if (currentSquad.length !== 11) return [];

    const suggestions: TransferSuggestion[] = [];
    const pool = playersDatabase
      .filter(p => p.active && !currentSquad.some(s => s.id === p.id))
      .map(p => ({ ...p, ep: getExpectedPoints(p) }));

    const feePercent = activeRoundConfig.transferFeePercent;

    currentSquad.forEach(s => {
      const starterEP = getExpectedPoints(s);
      const posPool = pool.filter(p => p.pos === s.pos);

      posPool.forEach(candidate => {
        // Trade fee calculation: 0.7% on the bought player's price
        const tradeFee = candidate.price * (feePercent / 100);
        const netCost = candidate.price + tradeFee;
        const availableBudget = bank + s.price;

        if (netCost <= availableBudget) {
          const evGain = candidate.ep - starterEP;

          // Check if replacing s with candidate violates country cap
          const tempSquad = currentSquad.filter(p => p.id !== s.id);
          const teamCounts: Record<string, number> = {};
          tempSquad.forEach(p => {
            teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
          });
          teamCounts[candidate.team] = (teamCounts[candidate.team] || 0) + 1;

          const violatesCap = Object.values(teamCounts).some(count => count > activeRoundConfig.maxPlayersPerTeam);

          if (evGain > 0.1 && !violatesCap) {
            suggestions.push({
              sell: s,
              buy: candidate,
              evGain: evGain,
              netValueChange: candidate.price - s.price
            });
          }
        }
      });
    });

    return suggestions.sort((a, b) => b.evGain - a.evGain).slice(0, 10);
  }, [currentSquad, playersDatabase, bank, activeRoundConfig, getExpectedPoints]);

  const executeTransfer = (sellId: string, buyPlayer: Player) => {
    const feePercent = activeRoundConfig.transferFeePercent;
    const tradeFee = buyPlayer.price * (feePercent / 100);
    const sellPlayer = currentSquad.find(p => p.id === sellId);

    if (!sellPlayer) return;

    const updated = currentSquad.map(p => {
      if (p.id === sellId) {
        return {
          ...buyPlayer,
          isCaptain: p.isCaptain
        };
      }
      return p;
    });

    const newBank = bank + sellPlayer.price - buyPlayer.price - tradeFee;
    saveSquadAndBank(updated, newBank);
  };

  // Gemini AI Squad Strategic Advisor Integration
  const fetchAiStrategicAdvice = async () => {
    setAiLoading(true);
    setAiRecommendation('');

    const currentSquadText = sortedSquad.map(p => 
      `- ${p.name} (${p.team}, ${p.pos}): Price ${p.price}M kr, Expected Points: ${getExpectedPoints(p)}${p.isCaptain ? ' (Captain)' : ''}`
    ).join('\n');

    const topOptions = playersDatabase
      .filter(p => p.active && !currentSquad.some(s => s.id === p.id))
      .map(p => ({ ...p, ep: getExpectedPoints(p) }))
      .sort((a, b) => b.ep - a.ep)
      .slice(0, 15)
      .map(p => `- ${p.name} (${p.team}, ${p.pos}): Price ${p.price}M kr, Expected Points: ${p.ep}`)
      .join('\n');

    const schedule = activeRoundFixtures
      .map(m => `- ${m.home} vs ${m.away} (${m.date} ${m.time})`)
      .join('\n');

    const insightsText = `
Here are the latest real-time web-grounded insights and injuries collected by our Antigravity AI Agent:
Injuries/Suspensions:
${agentInsights.insights.injuredOrSuspended.map(p => `- ${p.name} (${p.team}): ${p.status} - ${p.details}`).join('\n')}

Budget Value Picks:
${agentInsights.insights.budgetPicks.map(p => `- ${p.name} (${p.team}, ${p.pos}): Price ${p.price}M kr - ${p.reason}`).join('\n')}

Premium Core Recommendations:
${agentInsights.insights.premiumStars.map(p => `- ${p.name} (${p.team}, ${p.pos}): Price ${p.price}M kr - ${p.reason}`).join('\n')}

Clean Sheet Fixtures:
${agentInsights.insights.matchday1CleanSheets.map(f => `- ${f.team} vs ${f.opponent} (Clean Sheet Chance: ${f.chance})`).join('\n')}
`;

    const prompt = `You are an elite, mathematical Sportbladet Manager (Aftonbladet World Cup Fantasy) strategic analyst.
The rules of this game are:
- Exactly 11 players in the squad. No bench.
- Transfers cost a 0.7% trade fee on the player bought (Round 1 is free).
- Max 4 players from the same nation/country.
- Captain gains double points (value growth).
- Point scores are converted directly to value growth (e.g. striker goal adds +125k, clean sheet defender adds +50k). The user wants to maximize total team value.

${insightsText}

My current squad for Round ${activeRound}:
${currentSquadText || 'No squad selected yet.'}

Remaining bank budget: ${bank.toFixed(2)}M kr
Active Round: ${activeRoundConfig.label}
Transfer Fee: ${activeRoundConfig.transferFeePercent}%

Top available players in the database (ordered by expected points):
${topOptions}

Match fixtures for this round:
${schedule}

Please perform a web search to confirm the latest team lineups, injured/suspended players, and World Cup news before responding.
Please provide:
1. **Roster Evaluation:** Critically analyze my current starting 11. Highlight any underperforming players or nations with tough fixtures.
2. **Transfer Recommendations:** Suggest 1 or 2 specific player trades (sell and buy) that would yield the highest net expected points increase, keeping in mind the ${activeRoundConfig.transferFeePercent}% trade fee and my ${bank.toFixed(2)}M kr bank limit.
3. **Captaincy Choice:** Suggest who should be captain and why.
4. **General Strategy:** Provide tactical advice for the upcoming matches.

Format your response in professional, clean Markdown with bullet points.`;

    try {
      if (geminiApiKey) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
          })
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No advice returned. Double check your API key.';
        setAiRecommendation(text);
      } else {
        // Fallback to local Antigravity CLI proxy server
        const response = await fetch('http://localhost:3001/api/request-advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Local proxy returned status ${response.status}. Make sure the proxy server is running (npm run dev).`);
        }

        const data = await response.json();
        const text = data.text || 'No advice returned from local Antigravity CLI.';
        setAiRecommendation(text);
      }
    } catch (err) {
      console.error('Advisor Error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (geminiApiKey) {
        setAiRecommendation(`❌ Error calling Gemini API: ${errMsg}. Make sure your API key is correct and you have an active network connection.`);
      } else {
        setAiRecommendation(`❌ Error calling local CLI proxy: ${errMsg}\n\nTo use the local Antigravity CLI:\n1. Ensure the development server is running ('npm run dev').\n2. Open your Antigravity CLI terminal and run the command: 'process advisor request' to generate the advice.`);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('ab_fantasy_gemini_key', key);
  };

  // --- MATCHDAY SIMULATOR LOGIC ---
  const startSimulation = () => {
    if (currentSquad.length !== 11) {
      alert('You must have exactly 11 players in your squad to simulate!');
      return;
    }
    setSimMinutes(0);
    setSimRunning(true);
    lastProcessedMinute.current = 0;
    setPlayerLiveScores({});
    
    // Initialize live scores for fixtures
    const initialScores: Record<number, MatchScore> = {};
    const fixtures = activeRoundFixtures;
    fixtures.forEach(f => {
      if (f.status === 'finished' || f.status === 'ended' || f.status === 'completed') {
        initialScores[f.id] = {
          home: f.homeScore !== undefined && f.homeScore !== null ? f.homeScore : 0,
          away: f.awayScore !== undefined && f.awayScore !== null ? f.awayScore : 0,
          finished: true
        };
      } else {
        initialScores[f.id] = { home: 0, away: 0, finished: false };
      }
    });
    setMatchScores(initialScores);

    // Initialize player live scores
    const initialPlayerScores: Record<string, LivePlayerScore> = {};
    currentSquad.forEach(p => {
      initialPlayerScores[p.id] = {
        goals: 0, assists: 0, ownGoals: 0, cleanSheet: true, conceded: 0,
        shotsOnGoal: 0, saves: 0, yellowCard: false, redCard: false,
        played: true, manOfTheMatch: false, victory: false, draw: false
      };
    });
    setPlayerLiveScores(initialPlayerScores);
    setSimLog([`⚽ Round ${activeRound} matchday kicked off! All 11 players are locked on the pitch.`]);
  };

  const runSimulatedTick = useCallback((minute: number) => {
    const fixtures = activeRoundFixtures;
    fixtures.forEach(match => {
      // Skip simulating if match is already finished in real life
      if (match.status === 'finished' || match.status === 'ended' || match.status === 'completed') return;

      const totalMatchXG = match.homeExpectedGoals + match.awayExpectedGoals;
      const goalChancePerMinute = totalMatchXG / 90;
      
      const chance = Math.random();
      if (chance < goalChancePerMinute) {
        // Goal Event
        const homeGoalRatio = match.homeExpectedGoals / Math.max(0.1, totalMatchXG);
        const isHomeGoal = Math.random() < homeGoalRatio;
        const scoringTeam = isHomeGoal ? match.home : match.away;
        const concededTeam = isHomeGoal ? match.away : match.home;

        // Check if any of our squad players are on the scoring or conceded team (must not have a red card)
        const scorersInSquad = currentSquad.filter(s => s.team === scoringTeam && !playerLiveScores[s.id]?.redCard);
        const defendersInSquad = currentSquad.filter(s => s.team === concededTeam && (s.pos === 'DEF' || s.pos === 'GK'));

        let eventText = `⚽ [${minute}'] Mål för ${scoringTeam}!`;

        if (scorersInSquad.length > 0) {
          // One of our squad players scored!
          const scorer = scorersInSquad[Math.floor(Math.random() * scorersInSquad.length)];
          setPlayerLiveScores(prev => {
            const current = prev[scorer.id] || { goals: 0, assists: 0, ownGoals: 0, cleanSheet: true, conceded: 0, shotsOnGoal: 0, saves: 0, yellowCard: false, redCard: false, played: true, manOfTheMatch: false, victory: false, draw: false };
            return {
              ...prev,
              [scorer.id]: {
                ...current,
                goals: current.goals + 1,
                shotsOnGoal: current.shotsOnGoal + 1
              }
            };
          });

          // Assist chance
          const assistersInSquad = scorersInSquad.filter(s => s.id !== scorer.id);
          if (assistersInSquad.length > 0 && Math.random() > 0.4) {
            const assister = assistersInSquad[Math.floor(Math.random() * assistersInSquad.length)];
            setPlayerLiveScores(prev => {
              const current = prev[assister.id];
              return {
                ...prev,
                [assister.id]: {
                  ...current,
                  assists: current.assists + 1
                }
              };
            });
            eventText = `⚽ [${minute}'] MÅL! ${scorer.name} nätar för ${scoringTeam}! Assisterad av ${assister.name}.`;
          } else {
            eventText = `⚽ [${minute}'] MÅL! ${scorer.name} nätar för ${scoringTeam}!`;
          }
        }

        // Apply conceded goals to defenders
        defendersInSquad.forEach(d => {
          setPlayerLiveScores(prev => {
            const current = prev[d.id];
            return {
              ...prev,
              [d.id]: {
                ...current,
                cleanSheet: false,
                conceded: current.conceded + 1
              }
            };
          });
        });

        // Update score
        setMatchScores(prev => {
          const score = prev[match.id] || { home: 0, away: 0, finished: false };
          return {
            ...prev,
            [match.id]: {
              ...score,
              home: isHomeGoal ? score.home + 1 : score.home,
              away: !isHomeGoal ? score.away + 1 : score.away
            }
          };
        });

        setSimLog(logs => [eventText, ...logs]);
      } else if (chance < 0.35) {
        // Shot on target or save event (must not have a red card)
        const activeSquadPlayers = currentSquad.filter(s => (s.team === match.home || s.team === match.away) && !playerLiveScores[s.id]?.redCard);
        if (activeSquadPlayers.length > 0) {
          const chosen = activeSquadPlayers[Math.floor(Math.random() * activeSquadPlayers.length)];
          setPlayerLiveScores(prev => {
            const current = prev[chosen.id];
            if (!current) return prev;
            
            if (chosen.pos === 'GK') {
              return {
                ...prev,
                [chosen.id]: { ...current, saves: current.saves + 1 }
              };
            } else {
              return {
                ...prev,
                [chosen.id]: { ...current, shotsOnGoal: current.shotsOnGoal + 1 }
              };
            }
          });
        }
      } else if (chance < 0.40) {
        // Card Event (must not already have a red card)
        const activeSquadPlayers = currentSquad.filter(s => (s.team === match.home || s.team === match.away) && !playerLiveScores[s.id]?.redCard);
        if (activeSquadPlayers.length > 0) {
          const chosen = activeSquadPlayers[Math.floor(Math.random() * activeSquadPlayers.length)];
          const isYellow = Math.random() > 0.15;
          const currentScore = playerLiveScores[chosen.id] || { yellowCard: false, redCard: false };
          const alreadyHasYellow = currentScore.yellowCard;

          let logMsg = '';
          let updatedYellow = alreadyHasYellow;
          let updatedRed = currentScore.redCard;

          if (isYellow) {
            if (alreadyHasYellow) {
              // Second yellow card -> Red card
              updatedRed = true;
              logMsg = `🟥 [${minute}'] Rött kort (andra gula) till ${chosen.name} (${chosen.team})!`;
            } else {
              // First yellow card
              updatedYellow = true;
              logMsg = `🟨 [${minute}'] Gult kort till ${chosen.name} (${chosen.team})!`;
            }
          } else {
            // Direct red card
            updatedRed = true;
            logMsg = `🟥 [${minute}'] Rött kort till ${chosen.name} (${chosen.team})!`;
          }

          setPlayerLiveScores(prev => {
            const current = prev[chosen.id];
            if (!current) return prev;
            return {
              ...prev,
              [chosen.id]: {
                ...current,
                yellowCard: updatedYellow,
                redCard: updatedRed
              }
            };
          });
          setSimLog(logs => [logMsg, ...logs]);
        }
      }
    });
  }, [activeRoundFixtures, currentSquad, playerLiveScores]);
  // Simulation Clock Tick (Interval)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (simRunning) {
      interval = setInterval(() => {
        setSimMinutes(prev => {
          if (prev >= 90) {
            return 90;
          }
          return prev + 10;
        });
      }, 800);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simRunning]);

  // Execute simulation tick and resolve final whistle side-effects
  useEffect(() => {
    if (!simRunning) return;

    // Run simulated tick for newly reached minutes
    if (simMinutes > 0 && simMinutes <= 90 && lastProcessedMinute.current < simMinutes) {
      const targetMin = simMinutes;
      lastProcessedMinute.current = targetMin;
      runSimulatedTick(targetMin);
    }

    // Resolve final whistle side-effects exactly once at 90 minutes
    if (simMinutes === 90) {
      setSimRunning(false);

      // Mark all matches as finished
      setMatchScores(scores => {
        const updated = { ...scores };
        Object.keys(updated).forEach(id => {
          updated[Number(id)].finished = true;
        });
        
        // Resolve match outcomes (won, draw, lost)
        const fixtures = activeRoundFixtures;
        setPlayerLiveScores(playerScores => {
          const updatedPlayerScores = { ...playerScores };
          currentSquad.forEach(p => {
            const fixture = fixtures.find(f => f.home === p.team || f.away === p.team);
            if (fixture) {
              const score = updated[fixture.id];
              const isHome = fixture.home === p.team;
              const won = isHome ? score.home > score.away : score.away > score.home;
              const draw = score.home === score.away;
              
              if (updatedPlayerScores[p.id]) {
                updatedPlayerScores[p.id].victory = won;
                updatedPlayerScores[p.id].draw = draw;
              }
            }
          });
          return updatedPlayerScores;
        });

        return updated;
      });

      // Randomly select 1 or 2 players as Man of the Match
      setPlayerLiveScores(playerScores => {
        const updated = { ...playerScores };
        const playerIds = Object.keys(updated);
        if (playerIds.length > 0) {
          const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
          updated[randomId].manOfTheMatch = true;
          setSimLog(logs => [`🏅 Man of the Match awarded to ${currentSquad.find(s => s.id === randomId)?.name}!`, ...logs]);
        }
        return updated;
      });

      setSimLog(logs => ['🏁 Final whistle! All fixtures completed. Value adjustments processed.', ...logs]);
    }
  }, [simMinutes, simRunning, runSimulatedTick, activeRoundFixtures, currentSquad]);

  // Convert live stats to value growth (kr) based on Swush rules
  const getCalculatedLiveGrowth = useCallback((player: SquadPlayer): number => {
    const live = playerLiveScores[player.id];
    if (!live) return 0;

    let growth = 0;
    if (live.played) growth += SCORE_RULES.SoccerDidPlay;
    
    // Goals points based on position
    if (live.goals > 0) {
      if (player.pos === 'GK') growth += live.goals * SCORE_RULES.SoccerGoalkeeperGoal;
      else if (player.pos === 'DEF') growth += live.goals * SCORE_RULES.SoccerDefenseGoal;
      else if (player.pos === 'MID') growth += live.goals * SCORE_RULES.SoccerMidfieldGoal;
      else if (player.pos === 'FWD') growth += live.goals * SCORE_RULES.SoccerStrikerGoal;
    }

    // Assists points
    if (live.assists > 0) {
      if (player.pos === 'GK') growth += live.assists * SCORE_RULES.SoccerGoalkeeperAssist;
      else growth += live.assists * SCORE_RULES.SoccerAssist;
    }

    // Clean sheet points
    if (live.cleanSheet) {
      if (player.pos === 'GK') growth += SCORE_RULES.SoccerGoalkeeperCleanSheet;
      else if (player.pos === 'DEF') growth += SCORE_RULES.SoccerDefenderCleanSheet;
    }

    // Conceded points (opposing goals)
    if (live.conceded > 0 && (player.pos === 'DEF' || player.pos === 'GK')) {
      growth += live.conceded * SCORE_RULES.SoccerOpposingTeamGoal;
    }

    // Saves & shots
    growth += live.saves * SCORE_RULES.SoccerSaveByGoalkeeper;
    growth += live.shotsOnGoal * SCORE_RULES.SoccerShotOnGoal;

    // Cards & penalties
    if (live.yellowCard) growth += SCORE_RULES.SoccerYellowCard;
    if (live.redCard) growth += SCORE_RULES.SoccerRedCard;
    if (live.ownGoals > 0) growth += live.ownGoals * SCORE_RULES.SoccerOwnGoal;

    // Match outcomes
    if (live.victory) growth += SCORE_RULES.SoccerPlayerTeamWon;
    else if (live.draw) growth += SCORE_RULES.SoccerPlayerTeamDraw;
    else if (live.played) growth += SCORE_RULES.SoccerPlayerTeamLost; // loss

    if (live.manOfTheMatch) growth += SCORE_RULES.SoccerManOfTheMatch;

    return growth;
  }, [playerLiveScores]);

  const totalSimulatedTeamGrowth = useMemo(() => {
    return currentSquad.reduce((acc, p) => {
      const g = getCalculatedLiveGrowth(p);
      return acc + (p.isCaptain ? g * 2 : g);
    }, 0);
  }, [currentSquad, getCalculatedLiveGrowth]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/15">
              <span className="text-xl">🏆</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Sportbladet Manager Optimizer
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  TypeScript v4
                </span>
              </h1>
              <p className="text-xs text-slate-400">VM-elvan 2026 value growth strategic planner</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Round select */}
            <div className="bg-slate-900/60 border border-slate-800 p-1.5 rounded-lg flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Round:</span>
              <select
                value={activeRound}
                onChange={(e) => setActiveRound(Number(e.target.value))}
                className="bg-slate-950 text-xs font-bold text-white border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                {ROUND_CONFIGS.map(round => (
                  <option key={round.id} value={round.id}>{round.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh / Fetch Button */}
            <button
              onClick={handleScrapeData}
              disabled={scrapeLoading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-slate-950 text-xs font-black px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              title="Fetch latest results, player stats, and update your team value"
            >
              {scrapeLoading ? (
                <>
                  <span className="h-3 w-3 rounded-full border border-slate-950 border-t-transparent animate-spin inline-block"></span>
                  Updating...
                </>
              ) : (
                <>
                  🔄 Fetch Live Stats
                </>
              )}
            </button>

            {/* Squad Price details */}
            <div className="bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-lg text-center min-w-[100px]">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Squad Value</p>
              <p className="text-sm font-black text-emerald-400">{(squadCost).toFixed(2)}M <span className="text-[10px] text-slate-500">/ 50.0M</span></p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-lg text-center min-w-[80px]">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Bank</p>
              <p className={`text-sm font-black ${bank >= 0 ? 'text-white' : 'text-rose-400'}`}>{bank.toFixed(2)}M</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-lg text-center min-w-[90px]">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Exp. Points</p>
              <p className="text-sm font-black text-amber-400">{squadExpectedPoints.toFixed(1)} pts</p>
            </div>
          </div>
        </div>
      </header>

      {/* SUB HEADER WARNING BAR */}
      {squadValidation.errors.length > 0 && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 py-2 px-4 text-xs text-rose-400">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span>⚠️ <strong>Squad Warnings:</strong> {squadValidation.errors[0]}</span>
            {squadValidation.errors.length > 1 && (
              <span className="bg-rose-500/20 px-1.5 py-0.5 rounded font-black text-[9px]">+{squadValidation.errors.length - 1} more</span>
            )}
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {/* TABS CONTAINER */}
        <div className="flex border-b border-slate-800 mb-6 gap-2 overflow-x-auto pb-1">
          <button 
            onClick={() => setActiveTab('scout')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'scout' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🔍 Player Database & Scout
          </button>
          <button 
            onClick={() => setActiveTab('lineup')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'lineup' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            📋 Tactical Lineup Field
          </button>
          <button 
            onClick={() => setActiveTab('transfers')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'transfers' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🔄 Transfer Trade Planner
          </button>
          <button 
            onClick={() => setActiveTab('advisor')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'advisor' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            🤖 Gemini AI Strategic Advisor
          </button>
          <button 
            onClick={() => setActiveTab('sim')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'sim' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            ⚡ Matchday Simulation Sandbox
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition border-b-2 ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            💬 AI Tactical Chat
          </button>
        </div>

        {/* TAB 1: PLAYER SCOUT & DATABASE */}
        {activeTab === 'scout' && (
          <div className="space-y-6">
            
            {/* FILTERS PANEL */}
            <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-5 flex flex-col xl:flex-row gap-6 glassmorphism">
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-heading">Search & Filters</h3>
                  <button
                    onClick={handleScrapeData}
                    disabled={scrapeLoading}
                    className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {scrapeLoading ? (
                      <>
                        <span className="h-2 w-2 rounded-full border border-emerald-400 border-t-transparent animate-spin inline-block"></span>
                        Scraping Swush API...
                      </>
                    ) : (
                      <>
                        🔄 Scrape Player Valuations (Round {activeRound})
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input 
                    type="text" 
                    placeholder="Search player or country..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Nations</option>
                    {teamsList.filter(t => t !== 'ALL').map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg">
                    {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => setPosFilter(pos)}
                        className={`flex-1 text-center py-1 rounded text-[10px] font-black transition ${posFilter === pos ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Max Price:</span>
                    <input 
                      type="range" 
                      min="2.0" 
                      max="14.0" 
                      step="0.5" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-500 h-1"
                    />
                    <span className="text-xs font-bold text-emerald-400">{maxPrice.toFixed(1)}M</span>
                  </div>
                </div>

                {/* Sorter selection */}
                <div className="flex gap-4 items-center pt-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sort by:</span>
                  <div className="flex gap-2">
                    {(['popularity', 'price', 'growth', 'expectedPoints'] as const).map(key => (
                      <button
                        key={key}
                        onClick={() => {
                          if (sortKey === key) {
                            setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortKey(key);
                            setSortOrder('desc');
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${sortKey === key ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}
                      >
                        {key === 'popularity' ? 'Ownership %' : key === 'price' ? 'Price' : key === 'growth' ? 'Growth' : 'Expected Points'}
                        {sortKey === key && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
                      </button>
                    ))}
                  </div>
                  
                  {Object.keys(expectedPointsOverrides).length > 0 && (
                    <button
                      onClick={handleClearEPOverrides}
                      className="ml-auto text-[10px] font-bold text-rose-400 hover:underline"
                    >
                      🧹 Clear Custom EP projections ({Object.keys(expectedPointsOverrides).length})
                    </button>
                  )}
                </div>
              </div>

              {/* KNAPSACK SOLVER ACTIONS */}
              <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl xl:w-96 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    🤖 Auto-Draft Optimizer
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Uses a Knapsack solver to instantly create the optimal 11-player roster fitting your budget, maximum nation caps, and exact position slots.
                  </p>
                </div>
                <div className="mt-3.5 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={optimizeAllFormations}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 rounded-lg transition"
                    >
                      Maximize Total EV
                    </button>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Or select formation:</span>
                    <div className="flex gap-1 flex-wrap">
                      {FORMATIONS.slice(0, 4).map(f => (
                        <button
                          key={f}
                          onClick={() => runKnapsackOptimizer(f)}
                          className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOADER */}
            {loadingPlayers ? (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs">Loading live Aftonbladet player data...</p>
              </div>
            ) : (
              /* PLAYER CARDS LIST */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlayers.slice(0, 40).map(player => {
                  const isInSquad = currentSquad.some(s => s.id === player.id);
                  const isOverriding = expectedPointsOverrides[player.id] !== undefined;

                  return (
                    <div 
                      key={player.id} 
                      className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition ${isInSquad ? 'border-emerald-500/50 bg-emerald-950/5' : 'border-slate-800/80'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black ${
                            player.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                            player.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                            player.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {player.pos}
                          </span>
                          <span className="text-sm font-black text-emerald-400">{(player.price).toFixed(2)}M kr</span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-2 font-heading truncate">{player.name}</h4>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                          <span>{player.team}</span>
                          {(() => {
                            const fixtures = activeRoundFixtures;
                            const f = fixtures.find(f => f.home === player.team || f.away === player.team);
                            if (!f) return null;
                            const opp = f.home === player.team ? f.away : f.home;
                            const isHome = f.home === player.team;
                            const cleanSheet = isHome ? f.homeCleanSheetProb : f.awayCleanSheetProb;
                            const winProb = isHome ? f.homeWinProb : f.awayWinProb;
                            return (
                              <span className="text-[9px] bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 font-medium" title={`Matchday Odds - Win: ${(winProb*100).toFixed(0)}%, CS: ${(cleanSheet*100).toFixed(0)}%`}>
                                vs {opp} ({player.pos === 'GK' || player.pos === 'DEF' ? `CS: ${(cleanSheet*100).toFixed(0)}%` : `Win: ${(winProb*100).toFixed(0)}%`})
                              </span>
                            );
                          })()}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/50 text-center">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Ownership</p>
                            <p className="text-xs font-semibold text-slate-300">{player.own.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Val Growth</p>
                            <p className={`text-xs font-semibold ${player.stats.totalGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {player.stats.totalGrowth >= 0 ? '+' : ''}{(player.stats.totalGrowth / 1000).toFixed(0)}k
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Exp Pts</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="15"
                                value={player.expectedPoints}
                                onChange={(e) => handleUpdateEP(player.id, parseFloat(e.target.value) || 0)}
                                className={`w-10 bg-slate-950 border text-center text-xs font-bold rounded focus:outline-none focus:border-emerald-500 ${isOverriding ? 'text-amber-400 border-amber-500/40' : 'text-slate-300 border-slate-800'}`}
                                title="Click to customize expected points projections"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/40 flex gap-2">
                        <button
                          onClick={() => fetchPlayerScoutReport(player)}
                          className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black py-1.5 rounded-lg transition"
                        >
                          Scout 🤖
                        </button>
                        {isInSquad ? (
                          <button
                            onClick={() => handleRemovePlayer(player)}
                            className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-black py-1.5 rounded-lg transition"
                          >
                            Sell
                          </button>
                        ) : (
                          <button
                            onClick={() => draftPlayer(player)}
                            className="flex-[2] bg-slate-800 hover:bg-slate-700 text-white text-xs font-black py-1.5 rounded-lg transition disabled:opacity-40"
                            disabled={currentSquad.length >= 11 || (squadCost + player.price) > 50.0}
                          >
                            {currentSquad.length >= 11 ? 'Full' : 'Draft'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TACTICAL LINEUP FIELD BOARD */}
        {activeTab === 'lineup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* LEFT COLUMN: THE PITCH */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-900 rounded-2xl p-5 shadow-xl glassmorphism flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <div>
                  <h3 className="text-md font-bold text-white font-heading">Active Roster Board</h3>
                  <p className="text-xs text-slate-400">Active Formation: <span className="text-emerald-400 font-bold">{squadValidation.activeFormation}</span> | Click players to toggle Captaincy (2x multiplier)</p>
                </div>
                {currentSquad.length > 0 && (
                  <button
                    onClick={() => saveSquadAndBank([], 50.0)}
                    className="bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/20 text-[10px] font-black px-3 py-1.5 rounded-lg transition"
                  >
                    Clear Entire Squad
                  </button>
                )}
              </div>

              {/* Pitch layout representation */}
              <div className="relative pitch-grass border border-emerald-800 rounded-xl p-6 min-h-[500px] flex flex-col justify-between overflow-hidden shadow-inner">
                {/* Tactical Board Lines */}
                <div className="absolute inset-0 opacity-10 pointer-events-none flex flex-col justify-between">
                  <div className="h-full border-b-2 border-dashed border-white flex flex-col justify-between">
                    <div className="h-1/2 border-b-2 border-white" />
                  </div>
                </div>

                {currentSquad.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-20 text-slate-400/70 text-xs">
                    <div>
                      <span className="text-4xl block mb-2">⚽</span>
                      <p>Roster is currently empty.</p>
                      <button 
                        onClick={optimizeAllFormations}
                        className="mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-lg transition"
                      >
                        Auto-Optimize Squad
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between gap-6 z-10">
                    {/* FWD Row */}
                    <div className="flex justify-around">
                      {currentSquad.filter(p => p.pos === 'FWD').map(p => renderPitchPlayer(p))}
                    </div>

                    {/* MID Row */}
                    <div className="flex justify-around">
                      {currentSquad.filter(p => p.pos === 'MID').map(p => renderPitchPlayer(p))}
                    </div>

                    {/* DEF Row */}
                    <div className="flex justify-around">
                      {currentSquad.filter(p => p.pos === 'DEF').map(p => renderPitchPlayer(p))}
                    </div>

                    {/* GK Row */}
                    <div className="flex justify-center">
                      {currentSquad.filter(p => p.pos === 'GK').map(p => renderPitchPlayer(p))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SQUAD LIST & CONTROLS */}
            <div className="lg:col-span-4 space-y-6">
              {/* Squad Summary Stats Card */}
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <h3 className="text-sm font-bold text-white font-heading">📊 Roster Summary</h3>
                
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Team Value</span>
                    <span className="text-sm font-bold text-white">{(squadCost + bank).toFixed(2)}M</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Bank Budget</span>
                    <span className={`text-sm font-bold ${bank < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{bank.toFixed(2)}M</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Expected Points</span>
                    <span className="text-sm font-bold text-emerald-400">{(squadExpectedPoints).toFixed(1)}p</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-lg">
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Formation</span>
                    <span className="text-sm font-bold text-white">{squadValidation.activeFormation}</span>
                  </div>
                </div>

                {/* Validation Alerts */}
                {squadValidation.errors.length > 0 ? (
                  <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-lg text-[10px] text-rose-400 space-y-1">
                    <p className="font-bold uppercase tracking-wider">⚠️ Rules Violations:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {squadValidation.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-lg text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>✅ Squad is compliant with all game rules!</span>
                  </div>
                )}

                {/* Financial breakdown */}
                <div className="bg-slate-950/40 border border-slate-850/60 p-3.5 rounded-lg space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider text-slate-400 font-heading">
                    <span>Ekonomi & Värdeökning</span>
                    <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-mono">kr</span>
                  </div>
                  {lockedSquad.length > 0 ? (
                    <div className="text-[9px] text-slate-500 flex items-center gap-1 font-semibold">
                      <span>🔒 Locked starting squad: {lockedSquad.length} players</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-rose-400 flex items-center gap-1 font-bold animate-pulse">
                      <span>⚠️ Squad not locked. Click 'Lock Squad' below to track growth!</span>
                    </div>
                  )}
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Spelarvärde (Squad Value):</span>
                      <span className="text-white">{(squadCost * 1000000).toLocaleString('sv-SE')} kr</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Bank (Cash):</span>
                      <span className="text-white">{(bank * 1000000).toLocaleString('sv-SE')} kr</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-850 pt-1.5">
                      <span>Värdeökning (Growth):</span>
                      <span className={squadGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {squadGrowth >= 0 ? '+' : ''}{squadGrowth.toLocaleString('sv-SE')} kr
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Lagkaptensbonus (Captain Bonus):</span>
                      <span className={captainGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {captainGrowth >= 0 ? '+' : ''}{captainGrowth.toLocaleString('sv-SE')} kr
                      </span>
                    </div>
                    <div className="flex justify-between text-white font-black border-t border-slate-850 pt-1.5">
                      <span>Total Värdeökning:</span>
                      <span className={totalGrowth >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toLocaleString('sv-SE')} kr
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Auto Optimizer / Lock Squad buttons */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      lockSquad();
                      alert(`Successfully locked your squad for Round ${activeRound}! These starting prices will be used to track future value growth.`);
                    }}
                    disabled={currentSquad.length !== 11}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 text-xs font-bold py-2 rounded-lg transition text-center shadow-lg cursor-pointer"
                    title="Lock your 11 players so the app knows their starting values when tracking growth"
                  >
                    🔒 Lock Squad
                  </button>
                  <button
                    onClick={optimizeAllFormations}
                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs font-bold py-2 rounded-lg text-slate-300 hover:text-white transition text-center cursor-pointer"
                    title="Automatically find the optimal squad based on EV"
                  >
                    🤖 Auto-Optimize
                  </button>
                </div>
              </div>

              {/* Ordered Selected Players List */}
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white font-heading">📋 Selected Roster ({currentSquad.length}/11)</h3>
                </div>

                {sortedSquad.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Your team is empty. Use the database or optimizer to add players.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60 max-h-[350px] overflow-y-auto pr-1">
                    {sortedSquad.map((player) => (
                      <div key={player.id} className="py-2 flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black w-7 text-center ${
                            player.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                            player.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                            player.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {player.pos}
                          </span>
                          <div className="truncate">
                            <h4 className="font-bold text-white truncate flex items-center gap-1">
                              {player.name}
                              {player.isCaptain && <span className="text-[8px] bg-amber-500/25 text-amber-400 font-bold px-1 rounded">C</span>}
                            </h4>
                            <span className="text-[9px] text-slate-500">{player.team} • {player.price.toFixed(1)}M</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-300">{getExpectedPoints(player).toFixed(1)}p</span>
                          <button
                            onClick={() => handleReplacePitchPlayer(player)}
                            className="bg-slate-950 hover:bg-rose-600/10 text-slate-400 hover:text-rose-400 border border-slate-850 hover:border-rose-500/25 p-1 rounded transition text-[10px]"
                            title="Replace this player"
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSFER TRADE PLANNER */}
        {activeTab === 'transfers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT SIDE: CURRENT SQUAD WITH SELLS */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 glassmorphism">
                <h3 className="text-md font-bold text-white font-heading mb-4 flex justify-between items-center">
                  <span>🔄 Sell Roster Candidates</span>
                  <div className="flex items-center gap-3">
                    {activeRoundConfig.transferFeePercent > 0 && (
                      <button
                        onClick={resetTransfers}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2.5 py-1 rounded-lg transition"
                        title="Revert all trades and reset back to starting squad"
                      >
                        Reset Trades ↩️
                      </button>
                    )}
                    <span className="text-xs text-slate-400">Trade fee: <span className="text-rose-400 font-bold">{activeRoundConfig.transferFeePercent}%</span></span>
                  </div>
                </h3>

                {currentSquad.length === 0 ? (
                  <p className="text-xs text-slate-500 py-10 text-center">Draft a squad first in the Scout or Lineup tabs.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {sortedSquad.map(player => (
                      <div key={player.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                            player.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                            player.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                            player.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                            'bg-rose-500/20 text-rose-300'
                          }`}>
                            {player.pos}
                          </span>
                          <div>
                            <h4 className="font-bold text-white flex items-center gap-1.5">
                              {player.name}
                              {player.isCaptain && <span className="text-[8px] bg-amber-500/20 text-amber-400 font-black px-1 py-0.2 rounded border border-amber-500/30">C</span>}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{player.team}</span>
                              {(() => {
                                const fixtures = activeRoundFixtures;
                                const f = fixtures.find(f => f.home === player.team || f.away === player.team);
                                if (!f) return null;
                                const opp = f.home === player.team ? f.away : f.home;
                                const isHome = f.home === player.team;
                                const cleanSheet = isHome ? f.homeCleanSheetProb : f.awayCleanSheetProb;
                                const winProb = isHome ? f.homeWinProb : f.awayWinProb;
                                return (
                                  <span className="text-[9px] text-slate-500 font-medium" title={`Matchday Odds - Win: ${(winProb*100).toFixed(0)}%, CS: ${(cleanSheet*100).toFixed(0)}%`}>
                                    vs {opp} ({player.pos === 'GK' || player.pos === 'DEF' ? `CS: ${(cleanSheet*100).toFixed(0)}%` : `Win: ${(winProb*100).toFixed(0)}%`})
                                  </span>
                                );
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">Value</p>
                            <p className="font-bold text-slate-300">{player.price.toFixed(2)}M</p>
                          </div>
                          <button
                            onClick={() => fetchPlayerScoutReport(player)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-1 px-2.5 rounded-lg border border-emerald-500/20 transition text-[10px]"
                          >
                            Scout 🤖
                          </button>
                          <button
                            onClick={() => handleRemovePlayer(player)}
                            className="bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold py-1 px-2.5 rounded-lg border border-rose-500/20 transition text-[10px]"
                          >
                            Sell
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 🔍 Position Scout & Replacement Finder */}
              <div id="position-scout-finder" className="bg-slate-900 border border-slate-900 rounded-xl p-5 glassmorphism space-y-4">
                <div>
                  <h3 className="text-md font-bold text-white font-heading">🔍 Position Scout & Replacement Finder</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Find the best replacement candidates for a specific position that fit your remaining bank of <span className="text-emerald-400 font-bold">{bank.toFixed(2)}M kr</span>.
                  </p>
                </div>

                {/* Position selection tabs */}
                <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-850">
                  {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                    const count = currentSquad.filter(p => p.pos === pos).length;
                    const isMissing = pos === 'GK' ? count < 1 : count < 3; // basic heuristic
                    return (
                      <button
                        key={pos}
                        onClick={() => setScoutPos(pos)}
                        className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          scoutPos === pos
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{pos}</span>
                        <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
                          scoutPos === pos 
                            ? 'bg-emerald-600 text-slate-950' 
                            : isMissing ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Max Price (M)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.5"
                      max="15.0"
                      value={scoutMaxPrice}
                      onChange={(e) => setScoutMaxPrice(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 bg-slate-950 border border-slate-850 text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Sort By</label>
                    <select
                      value={scoutSort}
                      onChange={(e) => setScoutSort(e.target.value as 'popularity' | 'price' | 'growth' | 'expectedPoints')}
                      className="w-full mt-1 bg-slate-950 border border-slate-850 text-slate-200 px-2 py-1 rounded-lg focus:outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="expectedPoints">Expected Points</option>
                      <option value="growth">Val Growth</option>
                      <option value="price">Price (High-Low)</option>
                      <option value="popularity">Ownership %</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-[10px] text-slate-400 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={scoutAffordableOnly}
                        onChange={(e) => setScoutAffordableOnly(e.target.checked)}
                        className="rounded border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Fit bank ({bank.toFixed(2)}M)</span>
                    </label>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-[10px] text-slate-400 font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={scoutHideDrafted}
                        onChange={(e) => setScoutHideDrafted(e.target.checked)}
                        className="rounded border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Hide Drafted</span>
                    </label>
                  </div>
                </div>

                {/* Candidate List */}
                <div className="mt-2 space-y-2 font-sans">
                  {scoutCandidates.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center border border-slate-800 border-dashed rounded-xl">
                      No matching replacement candidates found under these filters.
                    </p>
                  ) : (
                    scoutCandidates.slice(0, 5).map((player) => {
                      const isInSquad = currentSquad.some(s => s.id === player.id);
                      const nationCount = currentSquad.filter(s => s.team === player.team).length;
                      const fitsBudget = player.price <= bank;
                      const isDraftable = !isInSquad && currentSquad.length < 11 && fitsBudget && (nationCount < activeRoundConfig.maxPlayersPerTeam || currentSquad.some(s => s.id === player.id));
                      
                      return (
                        <div
                          key={player.id}
                          className={`p-3 bg-slate-950/40 border rounded-xl flex items-center justify-between transition hover:border-slate-800 ${
                            fitsBudget ? 'border-slate-850' : 'border-rose-950/20 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-3 font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                              player.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                              player.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                              player.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                              'bg-rose-500/20 text-rose-300'
                            }`}>
                              {player.pos}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-xs">{player.name}</h4>
                              <p className="text-[9px] text-slate-400 font-semibold flex items-center gap-1.5">
                                <span>{player.team}</span>
                                <span>•</span>
                                <span>Price: {player.price.toFixed(2)}M</span>
                                <span>•</span>
                                <span>Own: {player.own.toFixed(1)}%</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-sans">
                            <div className="text-right">
                              <p className="text-[9px] text-slate-500">Exp Pts</p>
                              <p className="font-bold text-slate-350">{(getExpectedPoints(player)).toFixed(1)}p</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-[9px] text-slate-500">Growth</p>
                              <p className={`font-bold ${player.stats.totalGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {player.stats.totalGrowth >= 0 ? '+' : ''}{(player.stats.totalGrowth / 1000).toFixed(0)}k
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => fetchPlayerScoutReport(player)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-1 px-2 rounded border border-emerald-500/20 transition text-[9px]"
                              >
                                Scout 🤖
                              </button>
                              <button
                                onClick={() => draftPlayer(player)}
                                disabled={!isDraftable}
                                className={`font-bold py-1 px-2 rounded transition text-[9px] ${
                                  isInSquad
                                    ? 'bg-emerald-500 text-slate-950 cursor-default font-extrabold'
                                    : isDraftable
                                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                      : 'bg-slate-900/40 text-slate-650 cursor-not-allowed border border-slate-900'
                                }`}
                              >
                                {isInSquad ? 'Drafted' : 'Draft ➕'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: MATHEMATICAL TRADE SWAPS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 glassmorphism space-y-4">
                <div>
                  <h3 className="text-md font-bold text-white font-heading">📐 Expected points Arbitrage Swaps</h3>
                  <p className="text-xs text-slate-400 mt-1">Algorithmic suggestions showing the highest EV trades that satisfy budget, caps, and 0.7% transaction fees.</p>
                </div>

                {transferSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6 border border-slate-800 border-dashed rounded-xl">
                    No profitable transfer swaps found. Current team is at max mathematical efficiency.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transferSuggestions.map((sug, idx) => (
                      <div key={idx} className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg flex flex-col justify-between gap-3 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                          <span className="text-rose-400 font-bold">🔴 Sell: {sug.sell.name.split(' ').pop()}</span>
                          <span className="text-emerald-400 font-bold">🟢 Buy: {sug.buy.name.split(' ').pop()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>EP Change: {getExpectedPoints(sug.sell)} → {getExpectedPoints(sug.buy)}</span>
                          <span>Cost Delta: {sug.netValueChange >= 0 ? '+' : ''}{sug.netValueChange.toFixed(2)}M</span>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/25 p-2 rounded-lg flex justify-between items-center text-[10px] text-emerald-400 font-bold">
                          <span>Net Expected Gain:</span>
                          <span className="font-black">+{sug.evGain.toFixed(1)} pts</span>
                        </div>
                        <button
                          onClick={() => executeTransfer(sug.sell.id, sug.buy)}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg transition text-[10px]"
                        >
                          Execute Swap Trade
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GEMINI AI STRATEGIC ADVISOR */}
        {activeTab === 'advisor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: GEMINI CONSOLE */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-md font-bold text-white font-heading flex items-center gap-2">
                      🤖 Gemini AI Strategic Advisor
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Search Grounded
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Send your squad, available budget, and round fixtures to Gemini for strategic transfers and captaincy advice.</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="password"
                      placeholder="Optional: Enter Gemini API Key..."
                      value={geminiApiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full md:w-60"
                    />
                    <button
                      onClick={fetchAiStrategicAdvice}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-1.5 rounded-lg text-xs transition flex items-center gap-2 shrink-0 disabled:opacity-50"
                      disabled={aiLoading}
                    >
                      {aiLoading ? 'Thinking...' : geminiApiKey ? 'Get AI Advice' : 'Get CLI AI Advice'}
                    </button>
                  </div>
                </div>

                {/* Advice Console */}
                {aiLoading ? (
                  <div className="py-20 text-center text-slate-400 space-y-4 border border-slate-800 border-dashed rounded-xl">
                    <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto animate-pulse"></div>
                    {geminiApiKey ? (
                      <p className="text-xs text-slate-400">Gemini is researching World Cup news and analyzing squad stats...</p>
                    ) : (
                      <div className="space-y-3 px-4">
                        <p className="text-xs font-bold text-emerald-400 animate-pulse">Waiting for local Antigravity CLI...</p>
                        <p className="text-[11px] text-slate-400">Please run the following command in your active Antigravity CLI terminal:</p>
                        <div className="bg-slate-950 px-4 py-2 rounded-lg inline-block border border-slate-800 font-mono text-xs text-yellow-400 select-all cursor-pointer">
                          process advisor request
                        </div>
                        <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
                          The advisor panel will automatically refresh and display the recommendations once the CLI command completes.
                        </p>
                      </div>
                    )}
                  </div>
                ) : aiRecommendation ? (
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed font-sans space-y-4 whitespace-pre-line">
                    {aiRecommendation}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 border border-slate-850 border-dashed rounded-xl text-xs space-y-2 max-w-md mx-auto">
                    <p className="text-slate-400 font-semibold">Ready to get strategic advice?</p>
                    <p>You can either paste a Gemini API Key above to run directly in-browser, or leave it blank to run via your local Antigravity CLI agent.</p>
                    <p className="text-[10px] text-slate-600">If using the CLI, ensure the dev server is running and click the button.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: AGENT INSIGHTS & RSS NEWS */}
            <div className="lg:col-span-4 space-y-6">
              {/* AGENT INSIGHTS PANEL */}
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    🧠 Antigravity Agent Insights
                  </h3>
                  <p className="text-[10px] text-slate-400">Web-scraped player intel prepared by the AI coding assistant at dev-time.</p>
                </div>

                <div className="space-y-3">
                  {/* INJURIES */}
                  <div>
                    <h4 className="text-[10px] uppercase font-black tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
                      Injuries & Suspensions
                    </h4>
                    <div className="space-y-1.5">
                      {agentInsights.insights.injuredOrSuspended.map((p, idx) => (
                        <div key={idx} className="bg-slate-950/50 border border-slate-850 rounded p-2 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{p.name} ({p.team})</span>
                            <span className="text-rose-400">{p.status}</span>
                          </div>
                          <p className="text-slate-400 mt-0.5">{p.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VALUE BUDGET PICKS */}
                  <div>
                    <h4 className="text-[10px] uppercase font-black tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Value Budget Picks
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {agentInsights.insights.budgetPicks.map((p, idx) => (
                        <div key={idx} className="bg-slate-950/50 border border-slate-850 rounded p-2 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{p.name} ({p.team} - {p.pos})</span>
                            <span className="text-emerald-400">{p.price.toFixed(1)}M kr</span>
                          </div>
                          <p className="text-slate-400 mt-0.5">{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PREMIUM CORE */}
                  <div>
                    <h4 className="text-[10px] uppercase font-black tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                      Premium Recommendations
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {agentInsights.insights.premiumStars.map((p, idx) => (
                        <div key={idx} className="bg-slate-950/50 border border-slate-850 rounded p-2 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>{p.name} ({p.team} - {p.pos})</span>
                            <span className="text-amber-400">{p.price.toFixed(1)}M kr</span>
                          </div>
                          <p className="text-slate-400 mt-0.5">{p.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* WORLD CUP RSS NEWS */}
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                      📰 Live World Cup News
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Live soccer updates from SVT, Expressen, and BBC Sport.
                    </p>
                  </div>
                  <button
                    onClick={handleFetchNews}
                    disabled={newsLoading}
                    className="bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {newsLoading ? 'Crawling...' : 'Fetch Feed 📰'}
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {worldCupNews.length > 0 ? (
                    worldCupNews.map((news, idx) => (
                      <a 
                        key={idx} 
                        href={news.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block bg-slate-950/50 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 rounded p-2.5 transition text-[10px] space-y-1"
                      >
                        <h4 className="font-bold text-slate-200 hover:text-emerald-400 leading-tight">{news.title}</h4>
                        <p className="text-slate-400 line-clamp-2 leading-relaxed">{news.description}</p>
                        <span className="text-[8px] text-slate-500 block">{news.pubDate}</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-center text-[10px] text-slate-500 py-4">No news loaded. Run the script above to fetch feeds.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE TOURNAMENT SIMULATOR */}
        {activeTab === 'sim' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: MATCHDAY SIM CONTROLS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div>
                  <h3 className="text-md font-bold text-white font-heading">⏱️ Live Simulator</h3>
                  <p className="text-xs text-slate-400">Practice rotation and trading strategies on our matchday simulator sandbox.</p>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex justify-between items-center text-center">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Active Round</span>
                    <span className="text-sm font-bold text-white">Round {activeRound}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black block">Match Clock</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${simRunning ? 'bg-emerald-500/10 text-emerald-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                      {simRunning ? `${simMinutes}'` : simMinutes === 90 ? 'Finished' : 'Ready'}
                    </span>
                  </div>
                </div>

                {/* Simulation Control Buttons */}
                <div className="space-y-2">
                  {!simRunning && simMinutes === 0 && (
                    <button
                      onClick={startSimulation}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-lg text-xs transition"
                    >
                      Kickoff Matchday Fixtures
                    </button>
                  )}
                  {simRunning && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2.5 rounded-lg text-xs text-center font-bold animate-pulse-gentle">
                      ⚽ Simulating live matches in real time...
                    </div>
                  )}
                  {!simRunning && simMinutes === 90 && (
                    <button
                      onClick={() => {
                        setSimMinutes(0);
                        setPlayerLiveScores({});
                        setMatchScores({});
                        setSimLog(['Simulator reset. Ready for kickoff.']);
                      }}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-white font-black py-2.5 rounded-lg text-xs transition"
                    >
                      Reset Simulator
                    </button>
                  )}
                </div>

                {/* Fixtures list and live scores */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Round Fixtures</h4>
                  {activeRoundFixtures.map(f => {
                    const isRealFinished = f.status === 'finished' || f.status === 'ended' || f.status === 'completed';
                    const score = matchScores[f.id] || {
                      home: isRealFinished && f.homeScore !== undefined && f.homeScore !== null ? f.homeScore : 0,
                      away: isRealFinished && f.awayScore !== undefined && f.awayScore !== null ? f.awayScore : 0,
                      finished: isRealFinished
                    };
                    return (
                      <div key={f.id} className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg space-y-2 font-sans">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-350 w-5/12 text-right truncate">{f.home}</span>
                          <div className="flex flex-col items-center justify-center w-2/12">
                            <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-emerald-450 font-extrabold text-center text-[10px]">
                              {score.home} - {score.away}
                            </span>
                            {f.status && (
                              <span className={`text-[7px] mt-1 uppercase font-bold px-1 rounded ${
                                f.status === 'finished' || f.status === 'ended' || f.status === 'completed'
                                  ? 'bg-slate-950 text-slate-500 border border-slate-900'
                                  : f.status === 'live' || f.status === 'active'
                                  ? 'bg-red-500/25 text-red-450 border border-red-550/30'
                                  : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                              }`}>
                                {f.status === 'finished' || f.status === 'ended' || f.status === 'completed' ? 'Slut' : f.status === 'live' || f.status === 'active' ? 'Live' : 'Planerad'}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-350 w-5/12 text-left truncate">{f.away}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 pt-1 border-t border-slate-900/60 font-semibold">
                          <span>Win Prob: {(f.homeWinProb * 100).toFixed(0)}% • {(f.drawProb * 100).toFixed(0)}% • {(f.awayWinProb * 100).toFixed(0)}%</span>
                          <span>CS Prob: {(f.homeCleanSheetProb * 100).toFixed(0)}% / {(f.awayCleanSheetProb * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SQUAD POINT ANALYTICS */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-bold text-white font-heading">🏃 Squad Live Point Tracker</h3>
                    <p className="text-xs text-slate-400">Values are updated dynamically based on goals, assists, saves, cards, and match outcomes.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Total Live Growth</p>
                    <p className="text-xl font-black text-emerald-400">
                      {totalSimulatedTeamGrowth >= 0 ? '+' : ''}{(totalSimulatedTeamGrowth / 1000).toFixed(0)}k kr
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px] font-black">
                        <th className="py-2.5">Player</th>
                        <th className="py-2.5 text-center">Goals</th>
                        <th className="py-2.5 text-center">Assists</th>
                        <th className="py-2.5 text-center">Clean Sheet</th>
                        <th className="py-2.5 text-center">Saves / Cards</th>
                        <th className="py-2.5 text-center">Match Status</th>
                        <th className="py-2.5 text-right">Live Growth</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {sortedSquad.map(player => {
                        const live = playerLiveScores[player.id] || { goals: 0, assists: 0, conceded: 0, cleanSheet: true, saves: 0, yellowCard: false, redCard: false, manOfTheMatch: false, victory: false, draw: false };
                        const growth = player.isCaptain ? getCalculatedLiveGrowth(player) * 2 : getCalculatedLiveGrowth(player);

                        return (
                          <tr key={player.id} className="hover:bg-slate-800/20 transition">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-1 rounded text-[8px] font-black ${
                                  player.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                                  player.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                                  player.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                                  'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {player.pos}
                                </span>
                                <div>
                                  <p className="font-bold text-white flex items-center gap-1.5">
                                    {player.name}
                                    {player.isCaptain && <span className="text-[8px] bg-amber-500/25 text-amber-400 font-bold px-1 rounded border border-amber-500/35">C</span>}
                                  </p>
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                    <span>{player.team}</span>
                                    {(() => {
                                      const fixtures = activeRoundFixtures;
                                      const f = fixtures.find(f => f.home === player.team || f.away === player.team);
                                      if (!f) return null;
                                      const opp = f.home === player.team ? f.away : f.home;
                                      const isHome = f.home === player.team;
                                      const cleanSheet = isHome ? f.homeCleanSheetProb : f.awayCleanSheetProb;
                                      const winProb = isHome ? f.homeWinProb : f.awayWinProb;
                                      return (
                                        <span className="text-[9px] text-slate-500 font-medium" title={`Matchday Odds - Win: ${(winProb*100).toFixed(0)}%, CS: ${(cleanSheet*100).toFixed(0)}%`}>
                                          vs {opp} ({player.pos === 'GK' || player.pos === 'DEF' ? `CS: ${(cleanSheet*100).toFixed(0)}%` : `Win: ${(winProb*100).toFixed(0)}%`})
                                        </span>
                                      );
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center font-bold text-white">{live.goals}</td>
                            <td className="text-center font-bold text-white">{live.assists}</td>
                            <td className="text-center">
                              {player.pos === 'DEF' || player.pos === 'GK' ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${live.cleanSheet ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {live.cleanSheet ? 'Yes' : `No (${live.conceded})`}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="text-center">
                              <span className="text-slate-300">{player.pos === 'GK' ? `${live.saves} saves` : ''}</span>
                              {live.yellowCard && <span className="ml-1.5 text-amber-400 font-bold text-[10px] bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">YC</span>}
                              {live.redCard && <span className="ml-1.5 text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20 font-heading">RC</span>}
                            </td>
                            <td className="text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                !simRunning && simMinutes === 0 ? 'bg-slate-850 text-slate-400' : 
                                simRunning ? 'bg-emerald-500/15 text-emerald-400 animate-pulse' : 
                                live.victory ? 'bg-emerald-500/10 text-emerald-400' : 
                                live.draw ? 'bg-slate-800 text-slate-300' : 
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {!simRunning && simMinutes === 0 ? 'Upcoming' : 
                                 simRunning ? 'Live' : 
                                 live.victory ? 'Victory' : 
                                 live.draw ? 'Draw' : 
                                 'Defeat'}
                              </span>
                            </td>
                            <td className={`text-right font-black ${growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {growth >= 0 ? '+' : ''}{(growth / 1000).toFixed(0)}k
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* GAME LOGS CONSOLE */}
                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2 font-heading">📢 Live Match Feed Console</h4>
                  <div className="bg-slate-950 rounded-xl p-4 h-36 overflow-y-auto font-mono text-[10px] text-emerald-400/90 space-y-1 border border-slate-850">
                    {simLog.map((log, idx) => (
                      <div key={idx} className="border-b border-slate-900 pb-0.5">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AI CHAT ASSISTANT */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* LEFT COLUMN: CHAT WINDOW */}
            <div className="lg:col-span-8 flex flex-col h-[600px] bg-slate-900 border border-slate-900 rounded-xl shadow-xl glassmorphism">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/30 rounded-t-xl">
                <div>
                  <h3 className="text-md font-bold text-white font-heading flex items-center gap-2">
                    💬 AI Tactical Chat Assistant
                  </h3>
                  <p className="text-xs text-slate-400">Ask strategic questions, evaluate options, or analyze rule parameters.</p>
                </div>
                <button
                  onClick={() => setChatMessages([
                    {
                      id: 'welcome',
                      sender: 'ai',
                      text: 'Hej! I am your Antigravity Tactical AI Assistant. Ask me anything about your VM-Elvan 2026 squad, player valuations, upcoming fixtures, clean sheet probabilities, or optimal transfer choices!',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[10px] text-slate-400 hover:text-white font-black px-2.5 py-1 rounded transition"
                >
                  Clear History
                </button>
              </div>

              {/* Chat Log */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs scrollbar-thin">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-3.5 shadow-md relative ${
                        msg.sender === 'user'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-tr-none'
                          : 'bg-slate-950/60 border border-slate-850 text-slate-300 rounded-tl-none'
                      }`}
                    >
                      <div className="prose prose-invert prose-xs whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-1 text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-slate-950/60 border border-slate-850 rounded-xl rounded-tl-none p-3.5 max-w-[80%] text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full border border-emerald-400 border-t-transparent animate-spin"></div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI is thinking...</span>
                      </div>
                      {!geminiApiKey && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-900">
                          <p className="text-[10px] text-slate-500">Waiting for local Antigravity CLI. Run this command in your chat terminal:</p>
                          <div className="bg-slate-950 px-2.5 py-1 rounded font-mono text-[10px] text-yellow-400 select-all cursor-pointer inline-block border border-slate-850">
                            process advisor request
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChatMessage} className="p-4 border-t border-slate-800 bg-slate-950/30 rounded-b-xl flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about your team, players, or rules..."
                  disabled={chatLoading}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold text-xs px-5 py-2 rounded-lg transition"
                >
                  Send
                </button>
              </form>
            </div>

            {/* RIGHT COLUMN: QUICK SUGGESTIONS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-slate-900 rounded-xl p-5 shadow-xl glassmorphism space-y-4">
                <div>
                  <h3 className="text-md font-bold text-white font-heading">💡 Smart Prompt Shortcuts</h3>
                  <p className="text-xs text-slate-400">Click any of these suggestions to quickly ask your AI Assistant:</p>
                </div>

                <div className="space-y-2">
                  {[
                    "Suggest a bargain defender for this round",
                    "Evaluate my captaincy choice and risks",
                    "Should I take a transfer hit in Round 2?",
                    "Who are the best differential options under 5.0M?",
                    "What are the rules regarding transfer fees?",
                    "Explain point conversions to squad value growth"
                  ].map((sugText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(undefined, sugText)}
                      disabled={chatLoading}
                      className="w-full text-left bg-slate-950/50 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 p-3 rounded-lg text-xs text-slate-300 hover:text-white transition flex items-center justify-between group disabled:opacity-50"
                    >
                      <span className="truncate pr-2">{sugText}</span>
                      <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition text-[10px] font-bold">➔</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 mt-12">
        <p>© 2026 Sportbladet Manager Strategic Hub. Powered by TypeScript & Tailwind CSS v4.</p>
      </footer>

      {/* AI PLAYER SCOUT REPORT MODAL */}
      {selectedScoutPlayer && (() => {
        const isInSquad = currentSquad.some(p => p.id === selectedScoutPlayer.id);
        const isCaptain = currentSquad.find(p => p.id === selectedScoutPlayer.id)?.isCaptain;
        const nationCount = currentSquad.filter(s => s.team === selectedScoutPlayer.team).length;
        const maxPerTeam = activeRoundConfig.maxPlayersPerTeam;
        const isNationCapViolated = !isInSquad && nationCount >= maxPerTeam;
        
        // Starting price = current price - growth
        const startingPrice = selectedScoutPlayer.price - ((selectedScoutPlayer.stats?.growth || 0) / 1000000);
        
        // Find fixture
        const fixture = activeRoundFixtures.find(f => f.home === selectedScoutPlayer.team || f.away === selectedScoutPlayer.team);
        
        // Calculate dynamic expected points
        const calculatedEP = getExpectedPoints(selectedScoutPlayer);
        const hasOverride = expectedPointsOverrides[selectedScoutPlayer.id] !== undefined;

        // Fits budget?
        const fitsBudget = bank >= selectedScoutPlayer.price;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative glassmorphism flex flex-col max-h-[90vh]">
              {/* Close button */}
              <button 
                onClick={() => setSelectedScoutPlayer(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold cursor-pointer z-10"
              >
                ✕
              </button>
              
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/60 pb-4 mb-4">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                  selectedScoutPlayer.pos === 'GK' ? 'bg-purple-500/20 text-purple-300' : 
                  selectedScoutPlayer.pos === 'DEF' ? 'bg-blue-500/20 text-blue-300' : 
                  selectedScoutPlayer.pos === 'MID' ? 'bg-teal-500/20 text-teal-300' : 
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {selectedScoutPlayer.pos}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-white font-heading">{selectedScoutPlayer.name}</h3>
                    {selectedScoutPlayer.active ? (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Active</span>
                    ) : (
                      <span className="bg-rose-500/10 text-rose-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Inactive</span>
                    )}
                    {isInSquad && (
                      <span className="bg-blue-500/10 text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                        In Squad {isCaptain && '• Captain'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {selectedScoutPlayer.team} • Valued at <span className="text-white font-bold">{selectedScoutPlayer.price.toFixed(2)}M kr</span> ({selectedScoutPlayer.own.toFixed(1)}% ownership)
                  </p>
                </div>
              </div>

              {/* Two-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1 pb-4">
                
                {/* LEFT COLUMN: Player Stats, Expected Points, Match events */}
                <div className="md:col-span-5 space-y-4">
                  
                  {/* Expected Points Card */}
                  <div className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading">
                        Expected Points (Omgång {activeRound})
                      </h4>
                      {hasOverride && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-black uppercase">Override</span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-amber-400">{calculatedEP.toFixed(1)}</span>
                      <span className="text-xs text-slate-400 font-bold">pts expected</span>
                    </div>

                    <div className="pt-2 border-t border-slate-850/60 space-y-2">
                      <label className="text-[9px] text-slate-500 font-bold block uppercase">Custom Projection Override:</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.0"
                          max="25.0"
                          placeholder={calculatedEP.toFixed(1)}
                          value={localEPOverride}
                          onChange={(e) => setLocalEPOverride(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white w-20 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat(localEPOverride);
                            if (!isNaN(val)) {
                              handleUpdateEP(selectedScoutPlayer.id, val);
                            }
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer"
                        >
                          Save
                        </button>
                        {hasOverride && (
                          <button
                            onClick={() => handleRemoveEPOverride(selectedScoutPlayer.id)}
                            className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black px-2.5 py-1 rounded transition cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Fixture Card */}
                  <div className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading">
                      Next Fixture
                    </h4>
                    {fixture ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-white">{fixture.home} vs {fixture.away}</span>
                          <span className="text-[10px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded">{fixture.date} • {fixture.time}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-400">
                          <div className="bg-slate-900/50 p-1.5 rounded border border-slate-850/40">
                            <span className="text-slate-500 uppercase block font-black text-[8px]">Win Probability</span>
                            <span className="text-emerald-400 font-bold">{((fixture.home === selectedScoutPlayer.team ? fixture.homeWinProb : fixture.awayWinProb) * 100).toFixed(0)}%</span>
                          </div>
                          {selectedScoutPlayer.pos === 'GK' || selectedScoutPlayer.pos === 'DEF' ? (
                            <div className="bg-slate-900/50 p-1.5 rounded border border-slate-850/40">
                              <span className="text-slate-500 uppercase block font-black text-[8px]">Clean Sheet Prob</span>
                              <span className="text-emerald-400 font-bold">{((fixture.home === selectedScoutPlayer.team ? fixture.homeCleanSheetProb : fixture.awayCleanSheetProb) * 100).toFixed(0)}%</span>
                            </div>
                          ) : (
                            <div className="bg-slate-900/50 p-1.5 rounded border border-slate-850/40">
                              <span className="text-slate-500 uppercase block font-black text-[8px]">Expected Goals</span>
                              <span className="text-emerald-400 font-bold">{(fixture.home === selectedScoutPlayer.team ? fixture.homeExpectedGoals : fixture.awayExpectedGoals).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">No fixture scheduled for this round.</p>
                    )}
                  </div>

                  {/* Valuation & Growth Events Breakdown */}
                  <div className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading">
                        Growth & Stats (Omgång {activeRound})
                      </h4>
                      <span className="text-[9px] text-slate-400">Base starting value: {startingPrice.toFixed(2)}M</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Value Growth:</span>
                      <span className={`font-mono font-bold ${((selectedScoutPlayer.stats?.growth || 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {((selectedScoutPlayer.stats?.growth || 0)) >= 0 ? '+' : ''}
                        {((selectedScoutPlayer.stats?.growth || 0)).toLocaleString('sv-SE')} kr
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-850/50">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Event Breakdown:</span>
                      {!selectedScoutPlayer.stats?.events?.round || Object.keys(selectedScoutPlayer.stats.events.round).length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No match events recorded yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                          {Object.entries(selectedScoutPlayer.stats.events.round).map(([event, amount]) => {
                            let icon = '📊';
                            if (event === 'Goal') icon = '⚽';
                            else if (event === 'Assist') icon = '🅰️';
                            else if (event === 'YellowCard') icon = '🟨';
                            else if (event === 'RedCard') icon = '🟥';
                            else if (event === 'SecondYellowCard') icon = '🟨🟥';
                            else if (event === 'OwnGoal') icon = '❌';
                            else if (event === 'Lineup') icon = '🏃';
                            else if (event === 'SubstituteIn') icon = '🔄📥';
                            else if (event === 'SubstituteOut') icon = '🔄📤';
                            else if (event === 'SaveByGoalkeeper') icon = '👐';
                            else if (event === 'ShotOnGoal') icon = '🎯';
                            else if (event === 'ShotWide') icon = '🥅';
                            else if (event === 'HitPost' || event === 'HitBar') icon = '💥';
                            else if (event === 'ManOfTheMatch') icon = '🏅';
                            else if (event === 'Benched') icon = '🪑';
                            else if (event === 'Offside') icon = '🚩';

                            const valueChange = getEventValueChange(event, selectedScoutPlayer.pos) * amount;
                            const displayChange = valueChange !== 0 
                              ? `${valueChange >= 0 ? '+' : ''}${valueChange.toLocaleString('sv-SE')} kr`
                              : '--';

                            return (
                              <div key={event} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-850/30">
                                <span className="flex items-center gap-1.5 text-slate-300">
                                  <span>{icon}</span>
                                  <span>{event} <span className="text-slate-500 font-bold">x{amount}</span></span>
                                </span>
                                <span className={`font-mono ${valueChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{displayChange}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: AI Scout report */}
                <div className="md:col-span-7 flex flex-col max-h-[500px] md:max-h-full">
                  <div className="bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl flex-1 flex flex-col overflow-y-auto">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-heading border-b border-slate-850 pb-2 mb-3">
                      Scout Verdict & Tactical Report
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto text-xs text-slate-300 leading-relaxed pr-1">
                      {playerScoutLoading ? (
                        <div className="py-20 text-center space-y-3">
                          <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
                          {geminiApiKey ? (
                            <p className="text-slate-400">Gemini is compiling scout data...</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-emerald-400 font-bold animate-pulse">Waiting for local Antigravity CLI...</p>
                              <p className="text-[10px] text-slate-500">Please run this command in your chat terminal:</p>
                              <div className="bg-slate-950 px-3 py-1.5 rounded font-mono text-[11px] text-yellow-400 select-all cursor-pointer inline-block border border-slate-850">
                                process advisor request
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="prose prose-invert prose-xs whitespace-pre-line text-xs text-slate-300 leading-relaxed font-sans space-y-4">
                          {playerScoutReport || 'Click the player cards or search them to request an AI scout report details.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* FOOTER ACTION BUTTONS */}
              <div className="border-t border-slate-800/60 pt-4 mt-4 flex flex-wrap justify-between gap-3 items-center">
                
                {/* Squad Warnings / Context */}
                <div className="text-[10px] text-slate-400">
                  {isInSquad ? (
                    <span className="text-emerald-400 font-bold">✓ This player is currently on your team.</span>
                  ) : isNationCapViolated ? (
                    <span className="text-rose-400 font-bold">⚠️ Nation cap reached (Max {maxPerTeam} from {selectedScoutPlayer.team}).</span>
                  ) : !fitsBudget ? (
                    <span className="text-rose-400 font-semibold">⚠️ Insufficient cash (needs {selectedScoutPlayer.price.toFixed(2)}M, you have {bank.toFixed(2)}M).</span>
                  ) : (
                    <span className="text-slate-500">Available to draft into your lineup.</span>
                  )}
                </div>

                <div className="flex gap-2.5">
                  {isInSquad ? (
                    <>
                      <button
                        onClick={() => {
                          handleRemovePlayer(selectedScoutPlayer);
                          setSelectedScoutPlayer(null);
                        }}
                        className="bg-rose-500 hover:bg-rose-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg cursor-pointer"
                      >
                        Remove from Squad
                      </button>
                      {!isCaptain && (
                        <button
                          onClick={() => {
                            toggleCaptain(selectedScoutPlayer.id);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg cursor-pointer"
                        >
                          Make Captain
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        draftPlayer(selectedScoutPlayer);
                        setSelectedScoutPlayer(null);
                      }}
                      disabled={currentSquad.length >= 11 || isNationCapViolated || !fitsBudget}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-slate-950 text-xs font-bold px-5 py-2 rounded-lg transition shadow-lg cursor-pointer"
                    >
                      {currentSquad.length >= 11 ? 'Squad Full (11/11)' : 'Draft into Squad'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedScoutPlayer(null)}
                    className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold px-4 py-2 rounded-lg transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // Render player card helper for Tactical board
  function renderPitchPlayer(player: SquadPlayer) {
    const ep = getExpectedPoints(player);
    const liveGrowth = player.isCaptain ? getCalculatedLiveGrowth(player) * 2 : getCalculatedLiveGrowth(player);
    return (
      <div 
        key={player.id} 
        onClick={() => toggleCaptain(player.id)}
        className="cursor-pointer bg-slate-950/90 border-2 border-emerald-500/40 hover:border-emerald-400 transition rounded-xl p-2 w-24 text-center shadow-lg relative animate-float group"
      >
        <span className="absolute -top-2 -right-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-[9px] px-1 py-0.2 rounded-full font-bold">
          {player.pos}
        </span>
        {player.isCaptain && (
          <span className="absolute -top-2.5 -left-1.5 bg-amber-500 border border-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-lg animate-glow">
            C
          </span>
        )}
        {(() => {
          const fixtures = activeRoundFixtures;
          const f = fixtures.find(f => f.home === player.team || f.away === player.team);
          const opp = f ? (f.home === player.team ? f.away : f.home) : null;
          return (
            <p className="text-[9px] font-semibold text-slate-400 truncate">
              {player.team} {opp ? `vs ${opp.slice(0, 3)}` : ''}
            </p>
          );
        })()}
        <p className="text-xs font-bold text-white truncate font-heading group-hover:text-emerald-400 transition">{player.name.split(' ').pop()}</p>
        <div className="mt-1 pt-1 border-t border-slate-850 text-[10px] flex justify-between items-center">
          <span className="text-slate-500">{player.price.toFixed(1)}M</span>
          <span className="font-extrabold text-emerald-400">
            {simRunning || simMinutes === 90 
              ? `${(liveGrowth / 1000).toFixed(0)}k` 
              : `${ep.toFixed(1)}p`
            }
          </span>
        </div>
        
        {/* Hover overlay actions */}
        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10 animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); fetchPlayerScoutReport(player); }}
            className="bg-slate-950 border border-slate-800 hover:bg-emerald-500 text-[8px] font-black px-2 py-0.5 rounded text-slate-300 hover:text-slate-950 transition shadow-md whitespace-nowrap"
          >
            Scout 🤖
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleReplacePitchPlayer(player); }}
            className="bg-slate-950 border border-slate-800 hover:bg-rose-500 text-[8px] font-black px-2 py-0.5 rounded text-slate-300 hover:text-slate-950 transition shadow-md whitespace-nowrap"
          >
            Replace 🔄
          </button>
        </div>
      </div>
    );
  }
}
