/**
 * Rota - Ancient Roman Game
 * levels.js - Progressive Level Campaigns for VS Computer & VS Friend
 * 5 levels each with escalating difficulty, timers, win conditions, and thematic Roman lore.
 */

const AI_CAMPAIGN = [
  {
    id: 1,
    name: 'I. Tiro (The Recruit)',
    title: 'The Campus Martius',
    subtitle: 'Training Grounds',
    difficulty: 'easy',
    timerSeconds: 0, // untimed
    winsRequired: 1,
    lore: 'Begin your military service on the training fields outside the Servian Wall. Practice placing three stones and learning cyclic rim moves.',
    badge: '⚔️',
    tips: 'Tip: Watch the rim! Any 3 adjacent spots along the outer circle form a winning line.'
  },
  {
    id: 2,
    name: 'II. Miles (The Legionary)',
    title: 'The Roman Forum',
    subtitle: 'Tactical Defense',
    difficulty: 'medium',
    timerSeconds: 20,
    winsRequired: 1,
    lore: 'In the bustling heart of Rome, veterans challenge you. The legionary knows how to block obvious traps. Keep your eye on the center node.',
    badge: '🛡️',
    tips: 'Tip: The center node is connected to all 8 rim points and part of 4 diameter lines!'
  },
  {
    id: 3,
    name: 'III. Gladiator (Colosseum Champion)',
    title: 'Flavian Amphitheatre',
    subtitle: 'Duel Under the Sun',
    difficulty: 'medium',
    timerSeconds: 15,
    winsRequired: 2,
    lore: 'The roaring arena crowd demands relentless precision. Win 2 bouts against the arena veteran to claim the rudis (wooden sword) of freedom.',
    badge: '🏟️',
    tips: 'Tip: In the sliding phase, create fork threats where two winning moves open simultaneously.'
  },
  {
    id: 4,
    name: 'IV. Centurio (Praetorian Guard)',
    title: 'Castra Praetoria',
    subtitle: 'Master of Strategy',
    difficulty: 'hard',
    timerSeconds: 10,
    winsRequired: 2,
    lore: 'The elite imperial guard calculates every spoke transition. Under the 10-second blitz clock, panic is your greatest enemy.',
    badge: '🦅',
    tips: 'Tip: Do not allow the Centurion to occupy the center while holding two opposite rim stones.'
  },
  {
    id: 5,
    name: 'V. Imperator (Caesar’s Triumph)',
    title: 'Temple of Jupiter',
    subtitle: 'The Supreme Imperial Laurel',
    difficulty: 'master',
    timerSeconds: 7,
    winsRequired: 2, // Best of 3
    lore: 'Face the Emperor himself atop the Capitoline Hill. Unforgiving Minimax foresight under extreme 7-second blitz pressure. Eternal glory awaits!',
    badge: '👑',
    tips: 'Tip: Control cyclic rotation. Modulo arithmetic ensures every position can be pivoted into a trap.'
  }
];

const FRIEND_CAMPAIGN = [
  {
    id: 1,
    name: 'I. The Appian Way',
    title: 'Via Appia',
    subtitle: 'Travelers’ Leisure Match',
    bestOf: 1, // Single game
    timerSeconds: 0,
    lore: 'A relaxed friendly match carved into the basalt stone slabs of Rome’s queen of long roads.',
    badge: '🏛️'
  },
  {
    id: 2,
    name: 'II. Thermae of Caracalla',
    title: 'The Imperial Baths',
    subtitle: 'Social Rivalry (Best of 3)',
    bestOf: 3,
    timerSeconds: 30,
    lore: 'Patricians and philosophers gather over warm pools to test their wit and tactical dexterity.',
    badge: '🏺'
  },
  {
    id: 3,
    name: 'III. Circus Maximus',
    title: 'The Great Chariot Arena',
    subtitle: 'Speed & Adrenaline (Best of 3)',
    bestOf: 3,
    timerSeconds: 15,
    lore: 'Feel the thunder of four-horse quadrigas. Quick 15-second moves test who can think clearly under pressure.',
    badge: '🐎'
  },
  {
    id: 4,
    name: 'IV. The Pantheon Arena',
    title: 'Dome of the Gods',
    subtitle: 'Symmetry of the Heavens (Best of 5)',
    bestOf: 5,
    timerSeconds: 12,
    lore: 'Under Hadrian’s perfect concrete dome and open oculus, explore the celestial C₈ rotational symmetry.',
    badge: '⭐'
  },
  {
    id: 5,
    name: 'V. Capitoline Grand Championship',
    title: 'Capitoline Hill',
    subtitle: 'Imperial Laurel Duel (Best of 5)',
    bestOf: 5,
    timerSeconds: 8,
    lore: 'The ultimate showdown between two Roman masters. Lightning 8-second turns, sudden-death glory.',
    badge: '🏆'
  }
];

class ProgressionManager {
  constructor() {
    this.aiProgress = this.loadData('rota_ai_progress', {
      unlockedLevel: 1,
      currentLevel: 1,
      levelWins: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      streak: 0,
      bestStreak: 0
    });

    this.friendProgress = this.loadData('rota_friend_progress', {
      unlockedTier: 1,
      currentTier: 1,
      p1Score: 0,
      p2Score: 0,
      totalMatches: 0
    });
  }

  loadData(key, defaultVal) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? { ...defaultVal, ...JSON.parse(stored) } : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  saveData() {
    try {
      localStorage.setItem('rota_ai_progress', JSON.stringify(this.aiProgress));
      localStorage.setItem('rota_friend_progress', JSON.stringify(this.friendProgress));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  recordAIResult(isWin, isDraw) {
    if (isDraw) {
      this.aiProgress.totalDraws++;
      this.aiProgress.streak = 0;
    } else if (isWin) {
      this.aiProgress.totalWins++;
      this.aiProgress.levelWins++;
      this.aiProgress.streak++;
      if (this.aiProgress.streak > this.aiProgress.bestStreak) {
        this.aiProgress.bestStreak = this.aiProgress.streak;
      }

      const curLvl = AI_CAMPAIGN.find(l => l.id === this.aiProgress.currentLevel);
      if (curLvl && this.aiProgress.levelWins >= curLvl.winsRequired) {
        // Unlock next level if available
        if (this.aiProgress.currentLevel < AI_CAMPAIGN.length) {
          if (this.aiProgress.unlockedLevel <= this.aiProgress.currentLevel) {
            this.aiProgress.unlockedLevel = this.aiProgress.currentLevel + 1;
          }
          return { levelCompleted: true, nextLevelId: this.aiProgress.currentLevel + 1 };
        }
        return { campaignCompleted: true };
      }
    } else {
      this.aiProgress.totalLosses++;
      this.aiProgress.streak = 0;
      this.aiProgress.levelWins = 0; // reset current level progress on defeat in campaign
    }
    this.saveData();
    return {};
  }

  resetCampaignProgress() {
    this.aiProgress.unlockedLevel = 1;
    this.aiProgress.currentLevel = 1;
    this.aiProgress.levelWins = 0;
    this.saveData();
  }
}

window.AI_CAMPAIGN = AI_CAMPAIGN;
window.FRIEND_CAMPAIGN = FRIEND_CAMPAIGN;
window.ProgressionManager = ProgressionManager;
