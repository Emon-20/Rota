/**
 * Rota - Ancient Roman Game
 * board.js - SVG Board Renderer, Touch & Click Interaction, Tactile Animations & Cyclic Symmetry Visualizer
 */

class RotaBoard {
  constructor(containerElement, onNodeClickCallback) {
    this.container = containerElement;
    this.onNodeClick = onNodeClickCallback;
    this.svg = null;
    this.cx = 240;
    this.cy = 240;
    this.radius = 170;
    this.nodeCoords = [];
    this.showMathOverlay = false;

    this.calculateCoordinates();
    this.renderSVG();
  }

  calculateCoordinates() {
    this.nodeCoords = [];
    // 8 rim points starting from 12 o'clock (-pi/2) clockwise
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 4;
      const x = this.cx + this.radius * Math.cos(angle);
      const y = this.cy + this.radius * Math.sin(angle);
      this.nodeCoords.push({ x, y, angle, label: this.getRomanNumeral(i) });
    }
    // Center point (Index 8)
    this.nodeCoords.push({ x: this.cx, y: this.cy, angle: 0, label: 'C' });
  }

  getRomanNumeral(i) {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    return numerals[i];
  }

  renderSVG() {
    this.container.innerHTML = `
      <svg id="rota-board-svg" viewBox="0 0 480 480" class="rota-board-svg" role="region" aria-label="Rota Game Board">
        <defs>
          <!-- Stone drop shadow -->
          <filter id="piece-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
          </filter>
          <!-- Center socket shadow -->
          <filter id="socket-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.5"/>
          </filter>
          <!-- Gold glow for winning and selected pieces -->
          <filter id="gold-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <!-- Player 1: Carnelian Crimson gradient with gold rim -->
          <radialGradient id="p1-stone" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ff4d4d"/>
            <stop offset="45%" stop-color="#b81414"/>
            <stop offset="85%" stop-color="#6e0505"/>
            <stop offset="100%" stop-color="#3d0000"/>
          </radialGradient>
          <!-- Player 2: Carrara White Marble gradient with silver rim -->
          <radialGradient id="p2-stone" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#e2e8f0"/>
            <stop offset="85%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#475569"/>
          </radialGradient>
        </defs>

        <!-- Outer Stone Wheel Base -->
        <circle cx="${this.cx}" cy="${this.cy}" r="230" class="board-base-rim" />
        <circle cx="${this.cx}" cy="${this.cy}" r="222" class="board-outer-groove" />
        <circle cx="${this.cx}" cy="${this.cy}" r="198" class="board-inner-plate" />

        <!-- Spoke Lines (Diameters through Center) -->
        <g id="board-spokes" class="board-spokes">
          <!-- Spoke 0 - 4 (Vertical) -->
          <line x1="${this.nodeCoords[0].x}" y1="${this.nodeCoords[0].y}" x2="${this.nodeCoords[4].x}" y2="${this.nodeCoords[4].y}" class="spoke-groove" />
          <!-- Spoke 2 - 6 (Horizontal) -->
          <line x1="${this.nodeCoords[2].x}" y1="${this.nodeCoords[2].y}" x2="${this.nodeCoords[6].x}" y2="${this.nodeCoords[6].y}" class="spoke-groove" />
          <!-- Spoke 1 - 5 (Diagonal \ ) -->
          <line x1="${this.nodeCoords[1].x}" y1="${this.nodeCoords[1].y}" x2="${this.nodeCoords[5].x}" y2="${this.nodeCoords[5].y}" class="spoke-groove" />
          <!-- Spoke 3 - 7 (Diagonal / ) -->
          <line x1="${this.nodeCoords[3].x}" y1="${this.nodeCoords[3].y}" x2="${this.nodeCoords[7].x}" y2="${this.nodeCoords[7].y}" class="spoke-groove" />
        </g>

        <!-- Circular Rim Line -->
        <circle cx="${this.cx}" cy="${this.cy}" r="${this.radius}" class="board-rim-circle" />

        <!-- Center Bronze Socket Ring -->
        <circle cx="${this.cx}" cy="${this.cy}" r="38" class="center-socket-ring" />

        <!-- Winning Line Highlight Layer -->
        <g id="win-line-layer"></g>

        <!-- Cyclic Math Visualization Layer -->
        <g id="math-overlay-layer" class="math-overlay ${this.showMathOverlay ? 'active' : ''}"></g>

        <!-- Board Nodes (Sockets) Layer -->
        <g id="board-nodes-layer"></g>

        <!-- Game Pieces Layer -->
        <g id="board-pieces-layer"></g>
      </svg>
    `;

    this.svg = this.container.querySelector('#rota-board-svg');
    this.renderNodes();
    this.renderMathOverlay();
  }

  renderNodes() {
    const nodesLayer = this.svg.querySelector('#board-nodes-layer');
    nodesLayer.innerHTML = '';

    this.nodeCoords.forEach((coord, idx) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `board-node node-${idx}`);
      g.setAttribute('data-node-id', idx);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `Position ${coord.label}`);

      // Socket hole
      const socket = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      socket.setAttribute('cx', coord.x);
      socket.setAttribute('cy', coord.y);
      socket.setAttribute('r', idx === 8 ? '26' : '23');
      socket.setAttribute('class', 'node-socket');
      socket.setAttribute('filter', 'url(#socket-shadow)');

      // Target indicator ring (pulsing when valid target)
      const targetRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      targetRing.setAttribute('cx', coord.x);
      targetRing.setAttribute('cy', coord.y);
      targetRing.setAttribute('r', idx === 8 ? '31' : '28');
      targetRing.setAttribute('class', 'node-target-ring');

      // Socket Roman label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', coord.x);
      text.setAttribute('y', coord.y + 4);
      text.setAttribute('class', 'node-roman-label');
      text.textContent = coord.label;

      // Click target for touch and accessibility
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hitArea.setAttribute('cx', coord.x);
      hitArea.setAttribute('cy', coord.y);
      hitArea.setAttribute('r', '32');
      hitArea.setAttribute('class', 'node-hit-area');

      g.appendChild(socket);
      g.appendChild(targetRing);
      g.appendChild(text);
      g.appendChild(hitArea);

      // Event listeners
      g.addEventListener('click', (e) => {
        e.preventDefault();
        this.onNodeClick(idx);
      });

      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onNodeClick(idx);
        }
      });

      nodesLayer.appendChild(g);
    });
  }

  renderMathOverlay() {
    const mathLayer = this.svg.querySelector('#math-overlay-layer');
    if (!mathLayer) return;
    mathLayer.innerHTML = '';

    if (!this.showMathOverlay) return;

    // Outer cyclic rotation arc
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', `M ${this.cx} ${this.cy - this.radius - 28} A ${this.radius + 28} ${this.radius + 28} 0 1 1 ${this.cx - 10} ${this.cy - this.radius - 28}`);
    arrowPath.setAttribute('class', 'math-cycle-arrow');
    arrowPath.setAttribute('marker-end', 'url(#arrowhead)');
    mathLayer.appendChild(arrowPath);

    // Modulo labels at each rim position
    for (let i = 0; i < 8; i++) {
      const coord = this.nodeCoords[i];
      const offset = 34;
      const angle = coord.angle;
      const lx = coord.x + offset * Math.cos(angle);
      const ly = coord.y + offset * Math.sin(angle);

      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', lx);
      t.setAttribute('y', ly + 4);
      t.setAttribute('class', 'math-mod-label');
      t.textContent = `${i} ≡ ${(i+8)%8}`;
      mathLayer.appendChild(t);
    }

    // Center equation label
    const centerMath = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centerMath.setAttribute('x', this.cx);
    centerMath.setAttribute('y', this.cy + 55);
    centerMath.setAttribute('class', 'math-group-label');
    centerMath.textContent = 'Rotational Symmetry C₈ Group';
    mathLayer.appendChild(centerMath);
  }

  toggleMathOverlay(enable) {
    this.showMathOverlay = enable !== undefined ? enable : !this.showMathOverlay;
    const mathLayer = this.svg.querySelector('#math-overlay-layer');
    if (mathLayer) {
      if (this.showMathOverlay) {
        mathLayer.classList.add('active');
        this.renderMathOverlay();
      } else {
        mathLayer.classList.remove('active');
        mathLayer.innerHTML = '';
      }
    }
    return this.showMathOverlay;
  }

  // Update piece positions, selection states, and valid targets
  update(gameState, validTargets = []) {
    const piecesLayer = this.svg.querySelector('#board-pieces-layer');
    piecesLayer.innerHTML = '';

    // Update target indicators on nodes
    const nodeElements = this.svg.querySelectorAll('.board-node');
    nodeElements.forEach((el, idx) => {
      const isTarget = validTargets.includes(idx);
      el.classList.toggle('valid-target', isTarget);
      el.classList.toggle('selected', gameState.selectedNode === idx);
    });

    // Render pieces
    gameState.board.forEach((player, nodeIdx) => {
      if (player === 0) return;

      const coord = this.nodeCoords[nodeIdx];
      const isSelected = gameState.selectedNode === nodeIdx;
      const isWinningPiece = gameState.winningLine && gameState.winningLine.includes(nodeIdx);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `game-piece piece-p${player} ${isSelected ? 'selected' : ''} ${isWinningPiece ? 'winning' : ''}`);
      g.setAttribute('data-node-id', nodeIdx);

      // Outer piece body
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', coord.x);
      circle.setAttribute('cy', coord.y);
      circle.setAttribute('r', '22');
      circle.setAttribute('fill', player === 1 ? 'url(#p1-stone)' : 'url(#p2-stone)');
      circle.setAttribute('filter', isWinningPiece || isSelected ? 'url(#gold-glow)' : 'url(#piece-shadow)');
      circle.setAttribute('class', 'stone-body');

      // Piece rim metallic ring
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', coord.x);
      ring.setAttribute('cy', coord.y);
      ring.setAttribute('r', '20');
      ring.setAttribute('class', `stone-rim ${player === 1 ? 'gold-rim' : 'silver-rim'}`);

      // Roman Insignia (Eagle / Aquila for P1 Carnelian, Laurel Wreath for P2 Marble)
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', coord.x);
      icon.setAttribute('y', coord.y + 5);
      icon.setAttribute('class', 'stone-icon');
      icon.textContent = player === 1 ? '🦅' : '🌿';

      g.appendChild(circle);
      g.appendChild(ring);
      g.appendChild(icon);

      // Clicking on your own piece in slide phase selects it
      g.addEventListener('click', (e) => {
        e.preventDefault();
        this.onNodeClick(nodeIdx);
      });

      piecesLayer.appendChild(g);
    });

    // Draw winning line if game won
    this.drawWinningLine(gameState.winningLine);
  }

  drawWinningLine(winLine) {
    const winLayer = this.svg.querySelector('#win-line-layer');
    winLayer.innerHTML = '';
    if (!winLine) return;

    const [a, b, c] = winLine;
    const cA = this.nodeCoords[a];
    const cB = this.nodeCoords[b];
    const cC = this.nodeCoords[c];

    // Check if rim win or diameter win
    const isDiameter = winLine.includes(8);

    if (isDiameter) {
      // Draw straight line through center
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      // Diameter endpoints are a and c
      const start = a === 8 ? b : a;
      const end = c === 8 ? b : c;
      line.setAttribute('x1', this.nodeCoords[start].x);
      line.setAttribute('y1', this.nodeCoords[start].y);
      line.setAttribute('x2', this.nodeCoords[end].x);
      line.setAttribute('y2', this.nodeCoords[end].y);
      line.setAttribute('class', 'win-laser-line');
      winLayer.appendChild(line);
    } else {
      // Draw arc along the rim connecting the 3 points
      // Order points in clockwise order along rim
      const pts = [a, b, c].sort((x, y) => x - y);
      // Handle wrap around: e.g. [0, 1, 7] or [0, 6, 7]
      let startIdx, endIdx;
      if (pts.includes(0) && pts.includes(7)) {
        if (pts.includes(6)) {
          startIdx = 6;
          endIdx = 0;
        } else {
          startIdx = 7;
          endIdx = 1;
        }
      } else {
        startIdx = pts[0];
        endIdx = pts[2];
      }

      const pStart = this.nodeCoords[startIdx];
      const pEnd = this.nodeCoords[endIdx];

      const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${pStart.x} ${pStart.y} A ${this.radius} ${this.radius} 0 0 1 ${pEnd.x} ${pEnd.y}`;
      arc.setAttribute('d', d);
      arc.setAttribute('class', 'win-laser-arc');
      winLayer.appendChild(arc);
    }
  }

  // Visual animation when piece is slid
  animateSlide(fromNode, toNode, callback) {
    const fromCoord = this.nodeCoords[fromNode];
    const toCoord = this.nodeCoords[toNode];
    if (callback) callback();
  }
}

window.RotaBoard = RotaBoard;
