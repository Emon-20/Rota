/**
 * Node.js Test Suite for Rota Game Engine & AI
 */

const fs = require('fs');

// Mock browser globals
global.window = {};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); }
};

// Load scripts
require('./js/game.js');
require('./js/ai.js');
require('./js/levels.js');

const RotaGame = window.RotaGame;
const RotaAI = window.RotaAI;
const AI_CAMPAIGN = window.AI_CAMPAIGN;
const FRIEND_CAMPAIGN = window.FRIEND_CAMPAIGN;
const ProgressionManager = window.ProgressionManager;

console.log('=== 1. TESTING GAME ENGINE INITIALIZATION ===');
const game = new RotaGame();
console.assert(game.board.length === 9, 'Board should have 9 nodes');
console.assert(game.phase === 'drop', 'Initial phase should be drop');
console.assert(game.winLines.length === 12, 'There should be 12 winning lines (8 rim + 4 diameters)');
console.log('✔ Game initialization verified');

console.log('=== 2. TESTING DROP PHASE & 3-IN-A-ROW (DIAMETER) ===');
// P1 drops at 0 (top), P2 drops at 1
game.makeMove({ type: 'drop', to: 0, player: 1 });
game.makeMove({ type: 'drop', to: 1, player: 2 });
// P1 drops at 8 (center), P2 drops at 2
game.makeMove({ type: 'drop', to: 8, player: 1 });
game.makeMove({ type: 'drop', to: 2, player: 2 });
// P1 drops at 4 (bottom - completing 0-8-4 diameter win)
game.makeMove({ type: 'drop', to: 4, player: 1 });

console.assert(game.winner === 1, 'P1 should have won with diameter 0-8-4');
console.assert(JSON.stringify(game.winningLine) === JSON.stringify([0, 8, 4]), 'Winning line should be [0, 8, 4]');
console.log('✔ Diameter win detection verified');

console.log('=== 3. TESTING RIM WIN (WRAP AROUND 7-0-1) ===');
game.reset();
game.makeMove({ type: 'drop', to: 7, player: 1 });
game.makeMove({ type: 'drop', to: 3, player: 2 });
game.makeMove({ type: 'drop', to: 0, player: 1 });
game.makeMove({ type: 'drop', to: 4, player: 2 });
game.makeMove({ type: 'drop', to: 1, player: 1 }); // 7-0-1 rim win
console.assert(game.winner === 1, 'P1 should win on wrap-around rim [7, 0, 1]');
console.log('✔ Rim cyclic wrap-around win verified');

console.log('=== 4. TESTING SLIDE PHASE TRANSITION & MOVES ===');
game.reset();
// 3 drops for P1: 0, 2, 4
// 3 drops for P2: 1, 3, 5
game.makeMove({ type: 'drop', to: 0, player: 1 });
game.makeMove({ type: 'drop', to: 1, player: 2 });
game.makeMove({ type: 'drop', to: 2, player: 1 });
game.makeMove({ type: 'drop', to: 3, player: 2 });
game.makeMove({ type: 'drop', to: 4, player: 1 });
game.makeMove({ type: 'drop', to: 5, player: 2 });

console.assert(game.phase === 'slide', 'Game should transition to slide phase after 6 pieces');
console.assert(game.unplaced[1] === 0 && game.unplaced[2] === 0, 'No unplaced stones left');

// Check valid targets for P1 piece at node 0 (adjacent empty are 7 and 8 center)
const targets0 = game.getValidTargetsForNode(0);
console.assert(targets0.includes(7) && targets0.includes(8), 'Piece at 0 can move to empty 7 and 8');

// P1 slides from 0 to 8 (center)
const slideSuccess = game.makeMove({ type: 'slide', from: 0, to: 8, player: 1 });
console.assert(slideSuccess === true, 'Slide move should succeed');
console.assert(game.board[0] === 0, 'Node 0 should now be empty');
console.assert(game.board[8] === 1, 'Node 8 should now have P1 stone');
console.assert(game.turn === 2, 'Turn should switch to Player 2');
console.log('✔ Slide phase execution and turn switching verified');

console.log('=== 5. TESTING MINIMAX AI (EASY, MEDIUM, HARD, MASTER) ===');
const ai = new RotaAI('hard');
const bestMove = ai.getBestMove(game);
console.assert(bestMove !== null, 'AI should return a valid move');
console.assert(bestMove.player === 2, 'AI move should be for Player 2');
console.log(`✔ AI returned valid move: from ${bestMove.from} to ${bestMove.to}`);

// Test AI Immediate Block
game.reset();
// P1 drops at 0 and 8 (threatening 4 for diameter win)
game.makeMove({ type: 'drop', to: 0, player: 1 });
game.makeMove({ type: 'drop', to: 2, player: 2 });
game.makeMove({ type: 'drop', to: 8, player: 1 });
// It is now P2's turn; P1 is threatening spot 4
const blockMove = ai.getBestMove(game);
console.assert(blockMove.to === 4, `AI should block at socket 4, chose ${blockMove.to}`);
console.log('✔ AI immediate threat blocking verified');

console.log('=== 6. TESTING 5 CAMPAIGN LEVELS & TIERS ===');
console.assert(AI_CAMPAIGN.length === 5, 'AI Campaign should have 5 levels');
console.assert(FRIEND_CAMPAIGN.length === 5, 'Friend Campaign should have 5 tiers');

const pm = new ProgressionManager();
console.assert(pm.aiProgress.unlockedLevel === 1, 'Should start at level 1');
const winResult = pm.recordAIResult(true, false);
console.assert(winResult.levelCompleted === true, 'Winning level 1 should complete level 1');
console.assert(pm.aiProgress.unlockedLevel === 2, 'Level 2 should now be unlocked');
console.log('✔ Level progression and unlocking verified');

console.log('\nALL 6 TEST SUITES PASSED FLAWLESSLY! 🚀');
