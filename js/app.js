/**
 * Rota - Ancient Roman Game
 * app.js - Main Application Controller
 * Handles user interactions, timer countdowns, mode switching, AI delays, dialogs, and game flow.
 */

class RotaApp {
  constructor() {
    this.game = new RotaGame();
    this.ai = new RotaAI('medium');
    this.progression = new ProgressionManager();
    this.board = null;

    this.mode = 'ai'; // 'ai' | 'friend'
    this.subMode = 'campaign'; // 'campaign' | 'custom'
    this.customAIDifficulty = 'medium';
    this.customTimerSeconds = 0;
    this.customTargetWins = 1;

    // Turn timer state
    this.timerInterval = null;
    this.turnTimeLeft = 0;
    this.currentTimerMax = 0;

    // Friend mode tournament series state
    this.friendMatch = {
      p1Score: 0,
      p2Score: 0,
      targetWins: 1
    };

    this.initDOM();
    this.initBoard();
    this.bindEvents();
    this.loadInitialMode();
  }

  initDOM() {
    this.dom = {
      boardContainer: document.getElementById('board-container'),
      phaseBadge: document.getElementById('game-phase-badge'),
      turnMessage: document.getElementById('turn-status-text'),
      timerDisplay: document.getElementById('timer-display'),
      timerFill: document.getElementById('timer-progress-fill'),
      timerSeconds: document.getElementById('timer-seconds'),
      
      // Player cards
      p1Card: document.getElementById('player1-card'),
      p2Card: document.getElementById('player2-card'),
      p1Name: document.getElementById('p1-name-display'),
      p2Name: document.getElementById('p2-name-display'),
      p1StonesReserve: document.getElementById('p1-stones-reserve'),
      p2StonesReserve: document.getElementById('p2-stones-reserve'),
      p1ScoreBadge: document.getElementById('p1-score-badge'),
      p2ScoreBadge: document.getElementById('p2-score-badge'),

      // Navigation & Modals
      modeTabs: document.querySelectorAll('.mode-tab-btn'),
      levelDrawerBtn: document.getElementById('btn-open-levels'),
      mathDrawerBtn: document.getElementById('btn-open-math'),
      rulesDrawerBtn: document.getElementById('btn-open-rules'),
      muteBtn: document.getElementById('btn-toggle-sound'),
      resetBtn: document.getElementById('btn-restart-game'),
      toggleMathOverlayBtn: document.getElementById('btn-toggle-math-overlay'),

      // Modals
      resultDialog: document.getElementById('dialog-result'),
      resultTitle: document.getElementById('result-title'),
      resultSubtitle: document.getElementById('result-subtitle'),
      resultDetail: document.getElementById('result-detail'),
      resultIcon: document.getElementById('result-icon'),
      btnResultNext: document.getElementById('btn-result-next'),
      btnResultRematch: document.getElementById('btn-result-rematch'),

      levelsModal: document.getElementById('dialog-levels'),
      levelsContainer: document.getElementById('levels-list-container'),
      closeLevelsBtn: document.getElementById('btn-close-levels'),

      mathModal: document.getElementById('dialog-math'),
      closeMathBtn: document.getElementById('btn-close-math'),

      rulesModal: document.getElementById('dialog-rules'),
      closeRulesBtn: document.getElementById('btn-close-rules'),

      // Campaign Header info
      campaignLevelTitle: document.getElementById('campaign-level-title'),
      campaignLevelSubtitle: document.getElementById('campaign-level-subtitle'),
      streakBadge: document.getElementById('streak-count')
    };
  }

  initBoard() {
    this.board = new RotaBoard(this.dom.boardContainer, (nodeIdx) => {
      this.handleNodeClick(nodeIdx);
    });
  }

  bindEvents() {
    // Mode tabs
    this.dom.modeTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetMode = e.currentTarget.dataset.mode;
        this.switchMode(targetMode);
      });
    });

    // Reset button
    this.dom.resetBtn.addEventListener('click', () => {
      window.soundSystem.playSelect();
      this.startNewGame();
    });

    // Sound mute toggle
    this.dom.muteBtn.addEventListener('click', () => {
      const muted = window.soundSystem.toggleMute();
      this.updateSoundButtonUI(muted);
    });
    this.updateSoundButtonUI(window.soundSystem.isMuted);

    // Levels Drawer
    this.dom.levelDrawerBtn.addEventListener('click', () => {
      window.soundSystem.playSelect();
      this.openLevelsModal();
    });
    this.dom.closeLevelsBtn.addEventListener('click', () => {
      this.dom.levelsModal.close();
    });

    // Math Modal
    this.dom.mathDrawerBtn.addEventListener('click', () => {
      window.soundSystem.playSelect();
      this.dom.mathModal.showModal();
    });
    this.dom.closeMathBtn.addEventListener('click', () => {
      this.dom.mathModal.close();
    });

    // Rules Modal
    this.dom.rulesDrawerBtn.addEventListener('click', () => {
      window.soundSystem.playSelect();
      this.dom.rulesModal.showModal();
    });
    this.dom.closeRulesBtn.addEventListener('click', () => {
      this.dom.rulesModal.close();
    });

    // Toggle Math Overlay directly on board
    this.dom.toggleMathOverlayBtn.addEventListener('click', () => {
      window.soundSystem.playSelect();
      const active = this.board.toggleMathOverlay();
      this.dom.toggleMathOverlayBtn.classList.toggle('active', active);
    });

    // Modal result buttons
    this.dom.btnResultRematch.addEventListener('click', () => {
      this.dom.resultDialog.close();
      this.startNewGame();
    });

    this.dom.btnResultNext.addEventListener('click', () => {
      this.dom.resultDialog.close();
      if (this.mode === 'ai') {
        if (this.progression.aiProgress.currentLevel < AI_CAMPAIGN.length) {
          this.progression.aiProgress.currentLevel++;
          this.progression.saveData();
        }
      } else {
        if (this.progression.friendProgress.currentTier < FRIEND_CAMPAIGN.length) {
          this.progression.friendProgress.currentTier++;
          this.progression.saveData();
        }
      }
      this.startNewGame();
    });
  }

  updateSoundButtonUI(isMuted) {
    this.dom.muteBtn.textContent = isMuted ? '🔇 Unmute' : '🔊 Sound';
    this.dom.muteBtn.classList.toggle('muted', isMuted);
  }

  loadInitialMode() {
    this.switchMode('ai');
  }

  switchMode(mode) {
    this.mode = mode;
    this.dom.modeTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });

    if (mode === 'ai') {
      this.dom.p1Name.textContent = 'Gladiator (You)';
      this.dom.p2Name.textContent = 'Roman AI';
    } else {
      this.dom.p1Name.textContent = 'Player I (Carnelian)';
      this.dom.p2Name.textContent = 'Player II (Marble)';
      this.friendMatch.p1Score = 0;
      this.friendMatch.p2Score = 0;
    }

    this.startNewGame();
  }

  getCurrentConfig() {
    if (this.mode === 'ai') {
      if (this.subMode === 'campaign') {
        const lvl = AI_CAMPAIGN.find(l => l.id === this.progression.aiProgress.currentLevel) || AI_CAMPAIGN[0];
        return {
          title: lvl.name,
          subtitle: `${lvl.title} • ${lvl.subtitle}`,
          difficulty: lvl.difficulty,
          timerSeconds: lvl.timerSeconds,
          winsRequired: lvl.winsRequired,
          badge: lvl.badge
        };
      } else {
        return {
          title: `Custom AI (${this.customAIDifficulty.toUpperCase()})`,
          subtitle: `Practice Arena`,
          difficulty: this.customAIDifficulty,
          timerSeconds: this.customTimerSeconds,
          winsRequired: 1,
          badge: '⚙️'
        };
      }
    } else {
      if (this.subMode === 'campaign') {
        const tier = FRIEND_CAMPAIGN.find(t => t.id === this.progression.friendProgress.currentTier) || FRIEND_CAMPAIGN[0];
        return {
          title: tier.name,
          subtitle: `${tier.title} • ${tier.subtitle}`,
          timerSeconds: tier.timerSeconds,
          bestOf: tier.bestOf,
          targetWins: Math.ceil(tier.bestOf / 2),
          badge: tier.badge
        };
      } else {
        return {
          title: 'Custom Duel',
          subtitle: `Free Match Series`,
          timerSeconds: this.customTimerSeconds,
          targetWins: this.customTargetWins,
          badge: '👥'
        };
      }
    }
  }

  startNewGame() {
    this.stopTimer();
    this.game.reset();

    const config = this.getCurrentConfig();
    if (this.mode === 'ai') {
      this.ai.setDifficulty(config.difficulty);
      this.dom.p2Name.textContent = `AI (${config.difficulty.toUpperCase()})`;
    }

    // Update Header Lore
    this.dom.campaignLevelTitle.textContent = config.title;
    this.dom.campaignLevelSubtitle.textContent = config.subtitle;
    this.updateStatsDisplay();

    // Reset Turn Timer
    this.currentTimerMax = config.timerSeconds;
    this.resetTurnTimer();

    this.updateUI();
  }

  handleNodeClick(nodeIdx) {
    if (this.game.winner) return;

    // In AI mode, ignore clicks during AI's turn (Player 2)
    if (this.mode === 'ai' && this.game.turn === 2) return;

    const player = this.game.turn;

    // DROP PHASE
    if (this.game.phase === 'drop') {
      if (this.game.board[nodeIdx] === 0 && this.game.unplaced[player] > 0) {
        const success = this.game.makeMove({ type: 'drop', to: nodeIdx, player });
        if (success) {
          window.soundSystem.playDrop();
          this.onMoveCompleted();
        }
      }
    } 
    // SLIDE PHASE
    else if (this.game.phase === 'slide') {
      // 1. If clicking own piece: select or reselect
      if (this.game.board[nodeIdx] === player) {
        this.game.selectedNode = nodeIdx;
        window.soundSystem.playSelect();
        this.updateUI();
        return;
      }

      // 2. If already selected a piece and clicking an empty adjacent node: slide
      if (this.game.selectedNode !== null) {
        const validTargets = this.game.getValidTargetsForNode(this.game.selectedNode);
        if (validTargets.includes(nodeIdx)) {
          const from = this.game.selectedNode;
          const success = this.game.makeMove({
            type: 'slide',
            from,
            to: nodeIdx,
            player
          });
          if (success) {
            window.soundSystem.playSlide();
            this.onMoveCompleted();
          }
        } else {
          // Deselect if clicking non-valid target
          this.game.selectedNode = null;
          this.updateUI();
        }
      }
    }
  }

  onMoveCompleted() {
    this.updateUI();

    // Check terminal condition
    if (this.game.winner) {
      this.handleGameOver(this.game.winner);
      return;
    }

    // Reset turn timer for the next turn
    this.resetTurnTimer();

    // If AI's turn, schedule AI move
    if (this.mode === 'ai' && this.game.turn === 2) {
      this.triggerAIMove();
    }
  }

  triggerAIMove() {
    this.dom.turnMessage.textContent = 'Roman AI is calculating...';
    this.dom.p2Card.classList.add('thinking');

    // Slight delay for human natural pacing
    const delay = this.game.phase === 'drop' ? 450 : 600;
    setTimeout(() => {
      if (this.game.winner || this.game.turn !== 2) return;

      const bestMove = this.ai.getBestMove(this.game);
      if (bestMove) {
        if (bestMove.type === 'drop') {
          this.game.makeMove(bestMove);
          window.soundSystem.playDrop();
        } else {
          this.game.makeMove(bestMove);
          window.soundSystem.playSlide();
        }
      } else {
        // AI has no moves, player 1 wins
        this.game.winner = 1;
      }

      this.dom.p2Card.classList.remove('thinking');
      this.updateUI();

      if (this.game.winner) {
        this.handleGameOver(this.game.winner);
      } else {
        this.resetTurnTimer();
      }
    }, delay);
  }

  resetTurnTimer() {
    this.stopTimer();

    if (this.currentTimerMax <= 0) {
      this.dom.timerDisplay.classList.add('hidden');
      return;
    }

    this.dom.timerDisplay.classList.remove('hidden');
    this.turnTimeLeft = this.currentTimerMax;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.turnTimeLeft--;
      this.updateTimerDisplay();

      // Sound tick for blitz tension
      if (this.turnTimeLeft <= 3 && this.turnTimeLeft > 0) {
        window.soundSystem.playTick();
      }

      if (this.turnTimeLeft <= 0) {
        this.stopTimer();
        this.handleTimeTimeout();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    this.dom.timerSeconds.textContent = `${this.turnTimeLeft}s`;
    const percent = Math.max(0, (this.turnTimeLeft / this.currentTimerMax) * 100);
    this.dom.timerFill.style.width = `${percent}%`;

    if (this.turnTimeLeft <= 3) {
      this.dom.timerDisplay.classList.add('urgent');
    } else {
      this.dom.timerDisplay.classList.remove('urgent');
    }
  }

  handleTimeTimeout() {
    // Current player ran out of time, opponent wins!
    const timeoutPlayer = this.game.turn;
    const winner = timeoutPlayer === 1 ? 2 : 1;
    this.game.winner = winner;
    this.updateUI();
    this.handleGameOver(winner, true);
  }

  handleGameOver(winner, isTimeout = false) {
    this.stopTimer();

    let title = '';
    let subtitle = '';
    let detail = '';
    let icon = '🏆';
    let canAdvance = false;

    if (winner === 'draw') {
      title = 'PAX ROMANA (DRAW)';
      subtitle = 'Threefold Repetition or Stalemate';
      detail = 'Neither gladiator could break the cyclic deadlock. The contest ends in noble balance.';
      icon = '⚖️';
      window.soundSystem.playDefeat();
      if (this.mode === 'ai') {
        this.progression.recordAIResult(false, true);
      }
    } else if (winner === 1) {
      title = this.mode === 'ai' ? 'VICTORIA! YOU WIN' : 'PLAYER I WINS!';
      subtitle = isTimeout ? 'Opponent ran out of time' : '3-in-a-row achieved along the sacred wheel!';
      detail = 'The crowd roars in triumph! Your circular spatial mastery has conquered Rome.';
      icon = '👑';
      window.soundSystem.playVictory();

      if (this.mode === 'ai') {
        const res = this.progression.recordAIResult(true, false);
        if (res.levelCompleted) {
          canAdvance = true;
          window.soundSystem.playLevelUp();
          detail = `Level Cleared! You have unlocked Level ${res.nextLevelId}!`;
        } else if (res.campaignCompleted) {
          detail = `IMPERATOR TRIUMPH! You have defeated all 5 levels and conquered ancient Rome!`;
        }
      } else {
        this.friendMatch.p1Score++;
        const config = this.getCurrentConfig();
        if (this.friendMatch.p1Score >= config.targetWins) {
          detail = `Player I wins the ${config.title} Tournament (${this.friendMatch.p1Score} - ${this.friendMatch.p2Score})!`;
          if (this.progression.friendProgress.unlockedTier <= this.progression.friendProgress.currentTier) {
            this.progression.friendProgress.unlockedTier = Math.min(5, this.progression.friendProgress.currentTier + 1);
            this.progression.saveData();
          }
          canAdvance = true;
        }
      }
    } else {
      // Player 2 wins
      title = this.mode === 'ai' ? 'DEFEAT' : 'PLAYER II WINS!';
      subtitle = isTimeout ? 'You ran out of time' : 'Roman AI achieved 3-in-a-row!';
      detail = this.mode === 'ai' 
        ? 'The Roman tactician prevailed this time. Study the spokes and try again.'
        : 'Player II mastered the cyclic wheel and claimed victory!';
      icon = '🏛️';
      window.soundSystem.playDefeat();

      if (this.mode === 'ai') {
        this.progression.recordAIResult(false, false);
      } else {
        this.friendMatch.p2Score++;
        const config = this.getCurrentConfig();
        if (this.friendMatch.p2Score >= config.targetWins) {
          detail = `Player II wins the ${config.title} Tournament (${this.friendMatch.p2Score} - ${this.friendMatch.p1Score})!`;
        }
      }
    }

    this.updateStatsDisplay();

    // Configure Result Dialog
    this.dom.resultTitle.textContent = title;
    this.dom.resultSubtitle.textContent = subtitle;
    this.dom.resultDetail.textContent = detail;
    this.dom.resultIcon.textContent = icon;
    this.dom.btnResultNext.classList.toggle('hidden', !canAdvance);

    setTimeout(() => {
      this.dom.resultDialog.showModal();
    }, 450);
  }

  updateUI() {
    // 1. Phase badge
    if (this.game.phase === 'drop') {
      const remainingP1 = this.game.unplaced[1];
      const remainingP2 = this.game.unplaced[2];
      this.dom.phaseBadge.textContent = `Phase I: Placement (${remainingP1 + remainingP2} pieces left)`;
      this.dom.phaseBadge.className = 'phase-badge phase-drop';
    } else {
      this.dom.phaseBadge.textContent = `Phase II: Sliding Along Connected Lines`;
      this.dom.phaseBadge.className = 'phase-badge phase-slide';
    }

    // 2. Active player card highlights
    this.dom.p1Card.classList.toggle('active-turn', this.game.turn === 1 && !this.game.winner);
    this.dom.p2Card.classList.toggle('active-turn', this.game.turn === 2 && !this.game.winner);

    // 3. Unplaced stones indicators
    this.renderReserveStones(this.dom.p1StonesReserve, this.game.unplaced[1], 'p1');
    this.renderReserveStones(this.dom.p2StonesReserve, this.game.unplaced[2], 'p2');

    // 4. Turn Status Text
    if (this.game.winner) {
      this.dom.turnMessage.textContent = 'Match Concluded';
    } else if (this.game.turn === 1) {
      if (this.game.phase === 'drop') {
        this.dom.turnMessage.textContent = 'Your Turn: Place a stone on any vacant socket.';
      } else {
        this.dom.turnMessage.textContent = this.game.selectedNode !== null
          ? 'Select a glowing adjacent socket to slide your stone.'
          : 'Your Turn: Select one of your stones to slide.';
      }
    } else {
      if (this.mode === 'ai') {
        this.dom.turnMessage.textContent = 'Roman AI is contemplating its move...';
      } else {
        if (this.game.phase === 'drop') {
          this.dom.turnMessage.textContent = 'Player II Turn: Place a stone on any vacant socket.';
        } else {
          this.dom.turnMessage.textContent = this.game.selectedNode !== null
            ? 'Player II: Select an adjacent socket to slide.'
            : 'Player II Turn: Select one of your stones to slide.';
        }
      }
    }

    // 5. Update SVG Board
    let validTargets = [];
    if (this.game.phase === 'drop') {
      // In drop phase, show all unoccupied sockets if it's human's turn
      if ((this.mode === 'ai' && this.game.turn === 1) || this.mode === 'friend') {
        validTargets = this.game.getValidMoves(this.game.turn).map(m => m.to);
      }
    } else if (this.game.phase === 'slide' && this.game.selectedNode !== null) {
      validTargets = this.game.getValidTargetsForNode(this.game.selectedNode);
    }
    this.board.update(this.game, validTargets);
  }

  renderReserveStones(container, count, playerClass) {
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const stone = document.createElement('span');
      stone.className = `reserve-stone ${playerClass} ${i < count ? 'active' : 'placed'}`;
      container.appendChild(stone);
    }
  }

  updateStatsDisplay() {
    if (this.mode === 'ai') {
      const p = this.progression.aiProgress;
      this.dom.streakBadge.textContent = `${p.streak} (Best: ${p.bestStreak})`;
      this.dom.p1ScoreBadge.textContent = `Wins: ${p.totalWins}`;
      this.dom.p2ScoreBadge.textContent = `Losses: ${p.totalLosses}`;
    } else {
      this.dom.streakBadge.textContent = `Tourney`;
      this.dom.p1ScoreBadge.textContent = `Score: ${this.friendMatch.p1Score}`;
      this.dom.p2ScoreBadge.textContent = `Score: ${this.friendMatch.p2Score}`;
    }
  }

  openLevelsModal() {
    this.dom.levelsContainer.innerHTML = '';

    if (this.mode === 'ai') {
      AI_CAMPAIGN.forEach(lvl => {
        const isUnlocked = lvl.id <= this.progression.aiProgress.unlockedLevel;
        const isCurrent = lvl.id === this.progression.aiProgress.currentLevel;

        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;
        card.innerHTML = `
          <div class="level-header">
            <span class="level-badge">${lvl.badge}</span>
            <div class="level-meta">
              <h4>${lvl.name}</h4>
              <span class="level-sub">${lvl.title} • ${lvl.subtitle}</span>
            </div>
            ${isCurrent ? '<span class="tag-current">Active</span>' : ''}
            ${!isUnlocked ? '<span class="tag-locked">🔒 Locked</span>' : ''}
          </div>
          <p class="level-lore">${lvl.lore}</p>
          <div class="level-specs">
            <span>⚔️ Diff: <strong>${lvl.difficulty.toUpperCase()}</strong></span>
            <span>⏱️ Timer: <strong>${lvl.timerSeconds ? lvl.timerSeconds + 's' : 'Relaxed'}</strong></span>
            <span>🏆 Goal: <strong>${lvl.winsRequired} Win${lvl.winsRequired > 1 ? 's' : ''}</strong></span>
          </div>
        `;

        if (isUnlocked) {
          card.addEventListener('click', () => {
            window.soundSystem.playSelect();
            this.progression.aiProgress.currentLevel = lvl.id;
            this.progression.saveData();
            this.dom.levelsModal.close();
            this.startNewGame();
          });
        }

        this.dom.levelsContainer.appendChild(card);
      });
    } else {
      FRIEND_CAMPAIGN.forEach(tier => {
        const isUnlocked = tier.id <= this.progression.friendProgress.unlockedTier;
        const isCurrent = tier.id === this.progression.friendProgress.currentTier;

        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`;
        card.innerHTML = `
          <div class="level-header">
            <span class="level-badge">${tier.badge}</span>
            <div class="level-meta">
              <h4>${tier.name}</h4>
              <span class="level-sub">${tier.title} • ${tier.subtitle}</span>
            </div>
            ${isCurrent ? '<span class="tag-current">Active</span>' : ''}
            ${!isUnlocked ? '<span class="tag-locked">🔒 Locked</span>' : ''}
          </div>
          <p class="level-lore">${tier.lore}</p>
          <div class="level-specs">
            <span>🏛️ Match: <strong>Best of ${tier.bestOf}</strong></span>
            <span>⏱️ Timer: <strong>${tier.timerSeconds ? tier.timerSeconds + 's' : 'Unlimited'}</strong></span>
          </div>
        `;

        if (isUnlocked) {
          card.addEventListener('click', () => {
            window.soundSystem.playSelect();
            this.progression.friendProgress.currentTier = tier.id;
            this.progression.saveData();
            this.dom.levelsModal.close();
            this.startNewGame();
          });
        }

        this.dom.levelsContainer.appendChild(card);
      });
    }

    this.dom.levelsModal.showModal();
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.rotaApp = new RotaApp();
});
