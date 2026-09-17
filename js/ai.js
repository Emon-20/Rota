/**
 * Rota - Ancient Roman Game
 * ai.js - Minimax AI Engine with Alpha-Beta Pruning & Positional Heuristics
 * Supports Easy (Tiro), Medium (Centurio), Hard (Legatus), and Master (Imperator Caesar)
 */

class RotaAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy' | 'medium' | 'hard' | 'master'
    this.aiPlayer = 2;
    this.humanPlayer = 1;
    this.transpositionTable = new Map();
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  // Get best move given game instance
  getBestMove(game) {
    const validMoves = game.getValidMoves(this.aiPlayer);
    if (validMoves.length === 0) return null;
    if (validMoves.length === 1) return validMoves[0];

    // EASY DIFFICULTY: 45% chance of purely random move
    if (this.difficulty === 'easy') {
      if (Math.random() < 0.45) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      }
      // Otherwise depth 1 greed
      return this.findGreedyMove(game, validMoves);
    }

    // MEDIUM DIFFICULTY: Depth 2-3 with basic tactical awareness
    if (this.difficulty === 'medium') {
      // Immediate win check
      for (const m of validMoves) {
        const sim = game.clone();
        sim.makeMove(m);
        if (sim.winner === this.aiPlayer) return m;
      }
      // Immediate block check
      const opponentMoves = game.getValidMoves(this.humanPlayer);
      for (const om of opponentMoves) {
        const sim = game.clone();
        sim.makeMove(om);
        if (sim.winner === this.humanPlayer) {
          // Find a move that blocks the winning spot
          const blockTarget = om.type === 'drop' ? om.to : om.to;
          const blockingMove = validMoves.find(m => m.to === blockTarget);
          if (blockingMove) return blockingMove;
        }
      }

      // Medium search depth 2
      return this.minimaxSearch(game, 2);
    }

    // HARD DIFFICULTY: Depth 5 with Alpha-Beta pruning
    if (this.difficulty === 'hard') {
      return this.minimaxSearch(game, 5);
    }

    // MASTER DIFFICULTY: Depth 7-8 with full heuristic evaluation
    return this.minimaxSearch(game, 7);
  }

  // Simple greedy move for Easy AI
  findGreedyMove(game, validMoves) {
    for (const m of validMoves) {
      const sim = game.clone();
      sim.makeMove(m);
      if (sim.winner === this.aiPlayer) return m;
    }
    // Prioritize center if empty in drop phase
    if (game.phase === 'drop' && game.board[8] === 0) {
      const centerMove = validMoves.find(m => m.to === 8);
      if (centerMove) return centerMove;
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Minimax with Alpha-Beta pruning
  minimaxSearch(game, maxDepth) {
    this.transpositionTable.clear();
    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const moves = game.getValidMoves(this.aiPlayer);
    // Move ordering: prioritize center, then wins
    this.orderMoves(game, moves, this.aiPlayer);

    for (const move of moves) {
      const sim = game.clone();
      sim.makeMove(move);

      // If immediate win
      if (sim.winner === this.aiPlayer) {
        return move;
      }

      const score = this.minimax(sim, maxDepth - 1, alpha, beta, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }

    return bestMove || moves[0];
  }

  minimax(game, depth, alpha, beta, isMaximizing) {
    // Terminal states
    if (game.winner === this.aiPlayer) return 10000 + depth;
    if (game.winner === this.humanPlayer) return -10000 - depth;
    if (game.winner === 'draw') return 0;
    if (depth <= 0) return this.evaluateState(game);

    const stateKey = `${game.serialize()}_${depth}_${isMaximizing}`;
    if (this.transpositionTable.has(stateKey)) {
      return this.transpositionTable.get(stateKey);
    }

    const currentPlayer = isMaximizing ? this.aiPlayer : this.humanPlayer;
    const moves = game.getValidMoves(currentPlayer);

    if (moves.length === 0) {
      // Trapped with no legal moves = loss for trapped player
      return isMaximizing ? -10000 - depth : 10000 + depth;
    }

    this.orderMoves(game, moves, currentPlayer);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const sim = game.clone();
        sim.makeMove(move);
        const evalScore = this.minimax(sim, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      this.transpositionTable.set(stateKey, maxEval);
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const sim = game.clone();
        sim.makeMove(move);
        const evalScore = this.minimax(sim, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      this.transpositionTable.set(stateKey, minEval);
      return minEval;
    }
  }

  // Move ordering for Alpha-Beta efficiency
  orderMoves(game, moves, player) {
    moves.sort((a, b) => {
      // Prioritize center
      if (a.to === 8 && b.to !== 8) return -1;
      if (b.to === 8 && a.to !== 8) return 1;
      return 0;
    });
  }

  // Positional heuristic evaluation
  evaluateState(game) {
    let score = 0;

    // 1. Center node advantage (+60)
    if (game.board[8] === this.aiPlayer) score += 60;
    else if (game.board[8] === this.humanPlayer) score -= 60;

    // 2. 2-in-a-row threats evaluation
    for (const line of game.winLines) {
      const p1 = game.board[line[0]];
      const p2 = game.board[line[1]];
      const p3 = game.board[line[2]];

      const aiCount = (p1 === this.aiPlayer ? 1 : 0) + (p2 === this.aiPlayer ? 1 : 0) + (p3 === this.aiPlayer ? 1 : 0);
      const humanCount = (p1 === this.humanPlayer ? 1 : 0) + (p2 === this.humanPlayer ? 1 : 0) + (p3 === this.humanPlayer ? 1 : 0);

      // AI has 2 pieces and 3rd is empty
      if (aiCount === 2 && humanCount === 0) {
        score += 85;
      }
      // Human has 2 pieces and 3rd is empty
      if (humanCount === 2 && aiCount === 0) {
        score -= 90;
      }
    }

    // 3. Mobility difference (especially in slide phase)
    if (game.phase === 'slide') {
      const aiMoves = game.getValidMoves(this.aiPlayer).length;
      const humanMoves = game.getValidMoves(this.humanPlayer).length;
      score += (aiMoves - humanMoves) * 12;
    }

    return score;
  }
}

window.RotaAI = RotaAI;
