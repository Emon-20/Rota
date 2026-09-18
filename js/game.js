/**
 * Rota - Ancient Roman Game
 * game.js - Core Game State Machine & Rules Engine
 * Implements cyclic graph topology, drop & slide phases, 3-in-a-row detection, and threefold repetition.
 */

class RotaGame {
  constructor() {
    // 9 Vertices: 0..7 (Rim clockwise from top), 8 (Center)
    this.board = new Array(9).fill(0); // 0 = empty, 1 = Player 1, 2 = Player 2
    this.unplaced = { 1: 3, 2: 3 };
    this.turn = 1;
    this.phase = 'drop'; // 'drop' | 'slide'
    this.selectedNode = null;
    this.winner = null; // null | 1 | 2 | 'draw'
    this.winningLine = null; // [a, b, c]
    this.moveCount = 0;
    this.stateHistory = []; // serialized states for 3-fold repetition
    this.moveHistory = []; // log of moves for display

    // Adjacency graph
    this.adj = {
      0: [7, 1, 8],
      1: [0, 2, 8],
      2: [1, 3, 8],
      3: [2, 4, 8],
      4: [3, 5, 8],
      5: [4, 6, 8],
      6: [5, 7, 8],
      7: [6, 0, 8],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    };

    // 12 Winning Triplets (8 rim + 4 diameters)
    this.winLines = [
      // Rim lines
      [0, 1, 2],
      [1, 2, 3],
      [2, 3, 4],
      [3, 4, 5],
      [4, 5, 6],
      [5, 6, 7],
      [6, 7, 0],
      [7, 0, 1],
      // Diameters through center
      [0, 8, 4],
      [1, 8, 5],
      [2, 8, 6],
      [3, 8, 7]
    ];
  }

  reset() {
    this.board.fill(0);
    this.unplaced = { 1: 3, 2: 3 };
    this.turn = 1;
    this.phase = 'drop';
    this.selectedNode = null;
    this.winner = null;
    this.winningLine = null;
    this.moveCount = 0;
    this.stateHistory = [];
    this.moveHistory = [];
  }

  // Clone game state (essential for Minimax AI simulations)
  clone() {
    const copy = new RotaGame();
    copy.board = [...this.board];
    copy.unplaced = { ...this.unplaced };
    copy.turn = this.turn;
    copy.phase = this.phase;
    copy.selectedNode = this.selectedNode;
    copy.winner = this.winner;
    copy.winningLine = this.winningLine ? [...this.winningLine] : null;
    copy.moveCount = this.moveCount;
    copy.stateHistory = [...this.stateHistory];
    return copy;
  }

  serialize() {
    return `${this.board.join('')}_${this.turn}_${this.unplaced[1]}${this.unplaced[2]}`;
  }

  // Check if player has 3-in-a-row
  checkWin(player) {
    for (const line of this.winLines) {
      if (
        this.board[line[0]] === player &&
        this.board[line[1]] === player &&
        this.board[line[2]] === player
      ) {
        return line;
      }
    }
    return null;
  }

  // Get valid moves for the specified player (or current player)
  getValidMoves(player = this.turn) {
    if (this.winner) return [];

    if (this.unplaced[player] > 0) {
      // Drop phase: any empty node is valid
      const moves = [];
      for (let i = 0; i < 9; i++) {
        if (this.board[i] === 0) {
          moves.push({ type: 'drop', to: i, player });
        }
      }
      return moves;
    } else {
      // Slide phase: any piece of 'player' moving to an adjacent empty node
      const moves = [];
      for (let from = 0; from < 9; from++) {
        if (this.board[from] === player) {
          for (const to of this.adj[from]) {
            if (this.board[to] === 0) {
              moves.push({ type: 'slide', from, to, player });
            }
          }
        }
      }
      return moves;
    }
  }

  // Valid destinations for currently selected piece
  getValidTargetsForNode(fromNode) {
    if (this.winner) return [];
    if (this.phase !== 'slide') return [];
    if (this.board[fromNode] !== this.turn) return [];

    return this.adj[fromNode].filter(to => this.board[to] === 0);
  }

  // Execute a move
  makeMove(move) {
    if (this.winner) return false;

    if (move.type === 'drop') {
      if (this.phase !== 'drop' || this.board[move.to] !== 0 || this.unplaced[move.player] <= 0) {
        return false;
      }

      this.board[move.to] = move.player;
      this.unplaced[move.player]--;
      this.moveCount++;

      this.moveHistory.push({
        type: 'drop',
        player: move.player,
        to: move.to,
        notation: `P${move.player} drops on ${this.nodeName(move.to)}`
      });

      // Check immediate win
      const win = this.checkWin(move.player);
      if (win) {
        this.winner = move.player;
        this.winningLine = win;
        return true;
      }

      // Check transition to slide phase
      if (this.unplaced[1] === 0 && this.unplaced[2] === 0) {
        this.phase = 'slide';
      }

      // Switch turn
      this.turn = this.turn === 1 ? 2 : 1;
      return true;
    } else if (move.type === 'slide') {
      if (
        this.phase !== 'slide' ||
        this.board[move.from] !== move.player ||
        this.board[move.to] !== 0 ||
        !this.adj[move.from].includes(move.to)
      ) {
        return false;
      }

      this.board[move.from] = 0;
      this.board[move.to] = move.player;
      this.moveCount++;
      this.selectedNode = null;

      this.moveHistory.push({
        type: 'slide',
        player: move.player,
        from: move.from,
        to: move.to,
        notation: `P${move.player} slides ${this.nodeName(move.from)} → ${this.nodeName(move.to)}`
      });

      // Check win
      const win = this.checkWin(move.player);
      if (win) {
        this.winner = move.player;
        this.winningLine = win;
        return true;
      }

      // Record state history for threefold repetition
      const s = this.serialize();
      this.stateHistory.push(s);
      const repCount = this.stateHistory.filter(x => x === s).length;
      if (repCount >= 3) {
        this.winner = 'draw';
        return true;
      }

      // Switch turn
      this.turn = this.turn === 1 ? 2 : 1;

      // Check stalemate (next player has no moves)
      const nextMoves = this.getValidMoves(this.turn);
      if (nextMoves.length === 0) {
        // In ancient Roman games, stalemating opponent is a win for the player who trapped them
        this.winner = move.player;
        return true;
      }

      return true;
    }

    return false;
  }

  // Node name for notation (I through VIII and C for center)
  nodeName(idx) {
    if (idx === 8) return 'Center (C)';
    const roman = ['I (12h)', 'II', 'III (3h)', 'IV', 'V (6h)', 'VI', 'VII (9h)', 'VIII'];
    return `Rim ${roman[idx]}`;
  }
}

window.RotaGame = RotaGame;
