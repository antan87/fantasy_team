import { useState, useMemo, useEffect } from 'react';
import type { Player, SquadPlayer, RoundConfig } from '../types';

const FORMATIONS = [
  '3-4-3',
  '3-5-2',
  '4-3-3',
  '4-4-2',
  '4-5-1',
  '5-3-2',
  '5-4-1'
];

export function useSquadManager(
  activeRound: number,
  activeRoundConfig: RoundConfig,
  playersDatabase: Player[],
  getExpectedPoints: (player: Player) => number
) {
  // Helper to load or inherit initial state
  const loadInitialState = () => {
    const savedSquad = localStorage.getItem(`ab_fantasy_squad_r${activeRound}`);
    const savedBank = localStorage.getItem(`ab_fantasy_bank_r${activeRound}`);
    
    let squadInit: SquadPlayer[] = [];
    let bankInit: number = 50.0;

    if (savedSquad) {
      squadInit = JSON.parse(savedSquad);
      bankInit = savedBank ? parseFloat(savedBank) : 50.0;
    } else {
      if (activeRound > 1) {
        const prevSquad = localStorage.getItem(`ab_fantasy_squad_r${activeRound - 1}`);
        const prevBank = localStorage.getItem(`ab_fantasy_bank_r${activeRound - 1}`);
        if (prevSquad) {
          squadInit = JSON.parse(prevSquad);
          bankInit = prevBank ? parseFloat(prevBank) : 50.0;
          localStorage.setItem(`ab_fantasy_squad_r${activeRound}`, prevSquad);
          localStorage.setItem(`ab_fantasy_bank_r${activeRound}`, bankInit.toFixed(4));
        }
      }
    }

    const savedLockedSquad = localStorage.getItem(`ab_fantasy_locked_squad_r${activeRound}`);
    const savedStartingBank = localStorage.getItem(`ab_fantasy_starting_bank_r${activeRound}`);

    let lockedSquadInit: SquadPlayer[] = [];
    let startingBankInit: number = bankInit;

    if (savedLockedSquad) {
      try {
        const parsed = JSON.parse(savedLockedSquad);
        if (Array.isArray(parsed) && parsed.length > 0) {
          lockedSquadInit = parsed;
          startingBankInit = savedStartingBank ? parseFloat(savedStartingBank) : bankInit;
        } else {
          // Fallback to squadInit with starting prices
          lockedSquadInit = squadInit.map(p => {
            const growth = p.stats?.growth || 0;
            return { ...p, price: p.price - (growth / 1000000) };
          });
          const startingCost = lockedSquadInit.reduce((acc, p) => acc + p.price, 0);
          startingBankInit = activeRound === 1 ? 50.0 - startingCost : bankInit;
        }
      } catch (e) {
        lockedSquadInit = squadInit;
        startingBankInit = bankInit;
      }
    } else {
      // Initialize with squadInit with starting prices
      lockedSquadInit = squadInit.map(p => {
        const growth = p.stats?.growth || 0;
        return { ...p, price: p.price - (growth / 1000000) };
      });
      const startingCost = lockedSquadInit.reduce((acc, p) => acc + p.price, 0);
      startingBankInit = activeRound === 1 ? 50.0 - startingCost : bankInit;
    }

    if ((!savedLockedSquad || JSON.parse(savedLockedSquad).length === 0) && squadInit.length > 0) {
      localStorage.setItem(`ab_fantasy_locked_squad_r${activeRound}`, JSON.stringify(lockedSquadInit));
      localStorage.setItem(`ab_fantasy_starting_bank_r${activeRound}`, startingBankInit.toFixed(4));
    }

    return { squadInit, bankInit, lockedSquadInit, startingBankInit };
  };

  const initialState = loadInitialState();

  const [currentSquad, setCurrentSquad] = useState<SquadPlayer[]>(initialState.squadInit);
  const [bank, setBank] = useState<number>(initialState.bankInit);
  const [lockedSquad, setLockedSquad] = useState<SquadPlayer[]>(initialState.lockedSquadInit);
  const [startingBank, setStartingBank] = useState<number>(initialState.startingBankInit);

  const [prevRound, setPrevRound] = useState(activeRound);
  if (activeRound !== prevRound) {
    setPrevRound(activeRound);
    const loaded = loadInitialState();
    setCurrentSquad(loaded.squadInit);
    setBank(loaded.bankInit);
    setLockedSquad(loaded.lockedSquadInit);
    setStartingBank(loaded.startingBankInit);
  }

  // Synchronize local squad state with the playersDatabase when it loads or changes
  useEffect(() => {
    if (playersDatabase.length === 0) return;

    const syncSquadWithDatabase = (squad: SquadPlayer[]) => {
      return squad.map(sp => {
        const dbPlayer = playersDatabase.find(p => p.id === sp.id);
        if (dbPlayer) {
          return {
            ...dbPlayer,
            isCaptain: sp.isCaptain
          };
        }
        return sp;
      });
    };

    const syncedCurrent = syncSquadWithDatabase(currentSquad);
    const syncedLocked = syncSquadWithDatabase(lockedSquad);

    let currentChanged = false;
    if (syncedCurrent.length !== currentSquad.length) {
      currentChanged = true;
    } else {
      for (let i = 0; i < currentSquad.length; i++) {
        if (
          syncedCurrent[i].price !== currentSquad[i].price ||
          syncedCurrent[i].name !== currentSquad[i].name ||
          syncedCurrent[i].team !== currentSquad[i].team ||
          JSON.stringify(syncedCurrent[i].stats) !== JSON.stringify(currentSquad[i].stats) ||
          syncedCurrent[i].isCaptain !== currentSquad[i].isCaptain
        ) {
          currentChanged = true;
          break;
        }
      }
    }

    let lockedChanged = false;
    if (syncedLocked.length !== lockedSquad.length) {
      lockedChanged = true;
    } else {
      for (let i = 0; i < lockedSquad.length; i++) {
        if (
          syncedLocked[i].price !== lockedSquad[i].price ||
          syncedLocked[i].name !== lockedSquad[i].name ||
          syncedLocked[i].team !== lockedSquad[i].team ||
          JSON.stringify(syncedLocked[i].stats) !== JSON.stringify(lockedSquad[i].stats) ||
          syncedLocked[i].isCaptain !== lockedSquad[i].isCaptain
        ) {
          lockedChanged = true;
          break;
        }
      }
    }

    if (currentChanged) {
      setCurrentSquad(syncedCurrent);
      localStorage.setItem(`ab_fantasy_squad_r${activeRound}`, JSON.stringify(syncedCurrent));
    }
    if (lockedChanged) {
      setLockedSquad(syncedLocked);
      localStorage.setItem(`ab_fantasy_locked_squad_r${activeRound}`, JSON.stringify(syncedLocked));
    }

    // Recalculate bank to ensure it is always using synced prices
    const newBank = getBankForSquad(syncedCurrent, syncedLocked, startingBank);
    if (Math.abs(newBank - bank) > 0.0001) {
      setBank(newBank);
      localStorage.setItem(`ab_fantasy_bank_r${activeRound}`, newBank.toFixed(4));
    }
  }, [playersDatabase, startingBank, bank, activeRound]);

  const getBankForSquad = (squad: SquadPlayer[], baseLocked: SquadPlayer[], baseStartingBank: number) => {
    const feePercent = activeRoundConfig.transferFeePercent;
    const bought = squad.filter(p => !baseLocked.some(l => l.id === p.id));
    const sold = baseLocked.filter(l => !squad.some(s => s.id === l.id));
    
    const sellValue = sold.reduce((acc, p) => acc + p.price, 0);
    const buyValue = bought.reduce((acc, p) => acc + p.price, 0);
    const tradeFee = bought.reduce((acc, p) => acc + p.price * (feePercent / 100), 0);
    
    // Lagkaptensbonus: Captain's value growth is doubled, and the bonus is paid to the bank
    const captain = squad.find(p => p.isCaptain);
    const captainBonus = captain && captain.stats && typeof captain.stats.growth === 'number'
      ? captain.stats.growth / 1000000
      : 0;
    
    return baseStartingBank + sellValue - buyValue - tradeFee + captainBonus;
  };

  const saveSquadAndBank = (newSquad: SquadPlayer[], newBank: number) => {
    setCurrentSquad(newSquad);
    setBank(newBank);
    localStorage.setItem(`ab_fantasy_squad_r${activeRound}`, JSON.stringify(newSquad));
    localStorage.setItem(`ab_fantasy_bank_r${activeRound}`, newBank.toFixed(4));
  };

  const squadCost = useMemo(() => {
    return currentSquad.reduce((acc, p) => acc + p.price, 0);
  }, [currentSquad]);

  const squadExpectedPoints = useMemo(() => {
    return currentSquad.reduce((acc, p) => {
      const ep = getExpectedPoints(p);
      return acc + (p.isCaptain ? ep * 2 : ep);
    }, 0);
  }, [currentSquad, getExpectedPoints]);

  const squadValidation = useMemo(() => {
    const errors: string[] = [];
    if (currentSquad.length !== 11) {
      errors.push(`Squad size is ${currentSquad.length}/11. You must select exactly 11 players.`);
    }

    const gks = currentSquad.filter(p => p.pos === 'GK');
    const defs = currentSquad.filter(p => p.pos === 'DEF');
    const mids = currentSquad.filter(p => p.pos === 'MID');
    const fwds = currentSquad.filter(p => p.pos === 'FWD');

    if (currentSquad.length === 11) {
      if (gks.length !== 1) {
        errors.push(`Invalid Goalkeepers count: ${gks.length}. Must be exactly 1.`);
      }
      const activeFormation = `${defs.length}-${mids.length}-${fwds.length}`;
      if (!FORMATIONS.includes(activeFormation)) {
        errors.push(`Invalid Formation: ${activeFormation}. Valid formations: ${FORMATIONS.join(', ')}.`);
      }
    }

    // Cap per nation check
    const teamCounts: Record<string, number> = {};
    currentSquad.forEach(p => {
      teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
    });
    Object.entries(teamCounts).forEach(([team, count]) => {
      if (count > activeRoundConfig.maxPlayersPerTeam) {
        errors.push(`Nation violation: ${team} has ${count} players. Max allowed is ${activeRoundConfig.maxPlayersPerTeam} per nation.`);
      }
    });

    // Captain check
    if (currentSquad.length > 0 && !currentSquad.some(p => p.isCaptain)) {
      errors.push('No Captain selected. Click a player card to set the Captain (gains double points).');
    }

    // Budget check
    if (bank < 0.0) {
      errors.push(`Budget exceeded: Remaining bank budget is negative (${(bank * 1000000).toLocaleString('sv-SE')} kr).`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      activeFormation: gks.length === 1 && FORMATIONS.includes(`${defs.length}-${mids.length}-${fwds.length}`) 
        ? `${defs.length}-${mids.length}-${fwds.length}` 
        : 'Invalid'
    };
  }, [currentSquad, activeRoundConfig, bank]);

  const draftPlayer = (player: Player) => {
    if (currentSquad.some(p => p.id === player.id)) return;
    if (currentSquad.length >= 11) return;

    const updated = [...currentSquad, { ...player, isCaptain: currentSquad.length === 0 }];
    const newBank = getBankForSquad(updated, lockedSquad, startingBank);
    saveSquadAndBank(updated, newBank);
  };

  const removePlayer = (playerId: string) => {
    const updated = currentSquad.filter(p => p.id !== playerId);
    if (currentSquad.find(p => p.id === playerId)?.isCaptain && updated.length > 0) {
      updated[0].isCaptain = true;
    }
    const newBank = getBankForSquad(updated, lockedSquad, startingBank);
    saveSquadAndBank(updated, newBank);
  };

  const toggleCaptain = (playerId: string) => {
    const updated = currentSquad.map(p => ({
      ...p,
      isCaptain: p.id === playerId
    }));
    const newBank = getBankForSquad(updated, lockedSquad, startingBank);
    saveSquadAndBank(updated, newBank);
  };

  const resetTransfers = () => {
    saveSquadAndBank(lockedSquad, startingBank);
  };

  const solveExact = (
    pool: Player[],
    formation: string,
    maxPerTeam: number,
    getEP: (p: Player) => number
  ): { squad: SquadPlayer[]; totalCost: number; totalEP: number } | null => {
    const [defQuota, midQuota, fwdQuota] = formation.split('-').map(Number);

    const gks = pool.filter(p => p.pos === 'GK' && p.active);
    const defs = pool.filter(p => p.pos === 'DEF' && p.active);
    const mids = pool.filter(p => p.pos === 'MID' && p.active);
    const fwds = pool.filter(p => p.pos === 'FWD' && p.active);

    const sortFn = (a: Player, b: Player) => getEP(b) - getEP(a);
    gks.sort(sortFn);
    defs.sort(sortFn);
    mids.sort(sortFn);
    fwds.sort(sortFn);

    const getCandidatePool = (arr: Player[], count: number) => {
      const top = arr.slice(0, count);
      const cheapest = [...arr].sort((a, b) => a.price - b.price).slice(0, 5);
      const merged = [...top];
      cheapest.forEach(c => {
        if (!merged.some(m => m.id === c.id)) {
          merged.push(c);
        }
      });
      return merged;
    };

    // To keep it extremely fast (< 10ms), limit pool sizes
    const candidateGKs = getCandidatePool(gks, 10);
    const candidateDEFs = getCandidatePool(defs, 18);
    const candidateMIDs = getCandidatePool(mids, 18);
    const candidateFWDs = getCandidatePool(fwds, 18);

    let bestSquad: Player[] = [];
    let bestEV = -1;
    let bestCost = 0;

    const selected: Player[] = [];
    const teamCounts: Record<string, number> = {};
    let currentCost = 0;

    const minPrice = {
      GK: candidateGKs.length > 0 ? Math.min(...candidateGKs.map(p => p.price)) : 3.0,
      DEF: candidateDEFs.length > 0 ? Math.min(...candidateDEFs.map(p => p.price)) : 3.0,
      MID: candidateMIDs.length > 0 ? Math.min(...candidateMIDs.map(p => p.price)) : 3.0,
      FWD: candidateFWDs.length > 0 ? Math.min(...candidateFWDs.map(p => p.price)) : 3.0
    };

    const getCumulativeMaxEP = (arr: Player[], k: number): number => {
      let sum = 0;
      for (let i = 0; i < k && i < arr.length; i++) {
        sum += getEP(arr[i]);
      }
      return sum;
    };

    const maxSingleEP = Math.max(
      candidateGKs.length > 0 ? getEP(candidateGKs[0]) : 0,
      candidateDEFs.length > 0 ? getEP(candidateDEFs[0]) : 0,
      candidateMIDs.length > 0 ? getEP(candidateMIDs[0]) : 0,
      candidateFWDs.length > 0 ? getEP(candidateFWDs[0]) : 0
    );

    function backtrack(stage: 'GK' | 'FWD' | 'MID' | 'DEF', index: number, count: number) {
      // Prune if budget exceeded
      const minRemainingCost = 
        (stage === 'GK' ? minPrice.GK : 0) +
        (stage === 'GK' || stage === 'FWD' ? (fwdQuota - (stage === 'FWD' ? count : 0)) * minPrice.FWD : 0) +
        (stage === 'GK' || stage === 'FWD' || stage === 'MID' ? (midQuota - (stage === 'MID' ? count : 0)) * minPrice.MID : 0) +
        (defQuota - (stage === 'DEF' ? count : 0)) * minPrice.DEF;

      if (currentCost + minRemainingCost > 50.0) return;

      // Prune if theoretical maximum EV cannot beat the best EV
      const currentEP = selected.reduce((sum, p) => sum + getEP(p), 0);
      const maxRemainingEP =
        (stage === 'GK' ? getEP(candidateGKs[0] || gks[0] || { price: 0, stats: { totalGrowth: 0 }, own: 0, active: false, id: '', name: '', pos: 'GK', team: '' }) : 0) +
        (stage === 'GK' || stage === 'FWD' ? getCumulativeMaxEP(candidateFWDs.slice(index), fwdQuota - (stage === 'FWD' ? count : 0)) : 0) +
        (stage === 'GK' || stage === 'FWD' || stage === 'MID' ? getCumulativeMaxEP(candidateMIDs.slice(index), midQuota - (stage === 'MID' ? count : 0)) : 0) +
        getCumulativeMaxEP(candidateDEFs.slice(index), defQuota - (stage === 'DEF' ? count : 0));

      if (currentEP + maxRemainingEP + maxSingleEP < bestEV) return;

      if (stage === 'GK') {
        for (let i = 0; i < candidateGKs.length; i++) {
          const p = candidateGKs[i];
          if (currentCost + p.price <= 50.0 && (teamCounts[p.team] || 0) < maxPerTeam) {
            selected.push(p);
            currentCost += p.price;
            teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;

            backtrack('FWD', 0, 0);

            selected.pop();
            currentCost -= p.price;
            teamCounts[p.team]--;
          }
        }
      } else if (stage === 'FWD') {
        if (count === fwdQuota) {
          backtrack('MID', 0, 0);
          return;
        }
        for (let i = index; i <= candidateFWDs.length - (fwdQuota - count); i++) {
          const p = candidateFWDs[i];
          if (currentCost + p.price <= 50.0 && (teamCounts[p.team] || 0) < maxPerTeam) {
            selected.push(p);
            currentCost += p.price;
            teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;

            backtrack('FWD', i + 1, count + 1);

            selected.pop();
            currentCost -= p.price;
            teamCounts[p.team]--;
          }
        }
      } else if (stage === 'MID') {
        if (count === midQuota) {
          backtrack('DEF', 0, 0);
          return;
        }
        for (let i = index; i <= candidateMIDs.length - (midQuota - count); i++) {
          const p = candidateMIDs[i];
          if (currentCost + p.price <= 50.0 && (teamCounts[p.team] || 0) < maxPerTeam) {
            selected.push(p);
            currentCost += p.price;
            teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;

            backtrack('MID', i + 1, count + 1);

            selected.pop();
            currentCost -= p.price;
            teamCounts[p.team]--;
          }
        }
      } else if (stage === 'DEF') {
        if (count === defQuota) {
          let maxEP = -1;
          let squadSum = 0;
          selected.forEach(p => {
            const ep = getEP(p);
            squadSum += ep;
            if (ep > maxEP) maxEP = ep;
          });
          const totalEV = squadSum + maxEP;

          if (totalEV > bestEV) {
            bestEV = totalEV;
            bestSquad = [...selected];
            bestCost = currentCost;
          }
          return;
        }
        for (let i = index; i <= candidateDEFs.length - (defQuota - count); i++) {
          const p = candidateDEFs[i];
          if (currentCost + p.price <= 50.0 && (teamCounts[p.team] || 0) < maxPerTeam) {
            selected.push(p);
            currentCost += p.price;
            teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;

            backtrack('DEF', i + 1, count + 1);

            selected.pop();
            currentCost -= p.price;
            teamCounts[p.team]--;
          }
        }
      }
    }

    backtrack('GK', 0, 0);

    if (bestSquad.length === 11) {
      let maxEP = -1;
      let capIndex = 0;
      bestSquad.forEach((p, idx) => {
        const ep = getEP(p);
        if (ep > maxEP) {
          maxEP = ep;
          capIndex = idx;
        }
      });

      const squad: SquadPlayer[] = bestSquad.map((p, idx) => ({
        ...p,
        isCaptain: idx === capIndex
      }));

      return { squad, totalCost: bestCost, totalEP: bestEV };
    }

    return null;
  };

  const runKnapsackOptimizer = (targetFormation: string) => {
    const result = solveExact(playersDatabase, targetFormation, activeRoundConfig.maxPlayersPerTeam, getExpectedPoints);
    if (result) {
      saveSquadAndBank(result.squad, 50.0 - result.totalCost);
    } else {
      alert('Could not find a valid squad matching the budget and nation cap rules for this formation.');
    }
  };

  const optimizeAllFormations = () => {
    let bestSquad: SquadPlayer[] = [];
    let bestEV = -1;
    let bestCost = 50.0;

    FORMATIONS.forEach(form => {
      const result = solveExact(playersDatabase, form, activeRoundConfig.maxPlayersPerTeam, getExpectedPoints);
      if (result && result.totalEP > bestEV) {
        bestEV = result.totalEP;
        bestSquad = result.squad;
        bestCost = result.totalCost;
      }
    });

    if (bestSquad.length === 11) {
      saveSquadAndBank(bestSquad, 50.0 - bestCost);
    } else {
      alert('Could not find a valid squad matching the budget and nation cap rules for any formation.');
    }
  };

  const lockSquad = () => {
    const lockedSquadWithStartingPrices = currentSquad.map(p => {
      const growth = p.stats?.growth || 0;
      return {
        ...p,
        price: p.price - (growth / 1000000)
      };
    });

    let calculatedStartingBank = 0;
    if (activeRound === 1) {
      const startingCost = lockedSquadWithStartingPrices.reduce((acc, p) => acc + p.price, 0);
      calculatedStartingBank = 50.0 - startingCost;
    } else {
      const prevBank = localStorage.getItem(`ab_fantasy_bank_r${activeRound - 1}`);
      calculatedStartingBank = prevBank ? parseFloat(prevBank) : 50.0;
    }

    setLockedSquad(lockedSquadWithStartingPrices);
    setStartingBank(calculatedStartingBank);
    localStorage.setItem(`ab_fantasy_locked_squad_r${activeRound}`, JSON.stringify(lockedSquadWithStartingPrices));
    localStorage.setItem(`ab_fantasy_starting_bank_r${activeRound}`, calculatedStartingBank.toFixed(4));
  };

  return {
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
    lockedSquad,
    startingBank,
    resetTransfers,
    lockSquad
  };
}
