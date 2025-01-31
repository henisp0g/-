import { PIECES } from './pieces.js';

class Tetris {
  constructor(gameArea, nextBlockArea, linesDisplay, scoreDisplay, comboDisplay, finalLinesDisplay, finalScoreDisplay) {
    this.gameArea = gameArea;
    this.nextBlockArea = nextBlockArea;
    this.linesDisplay = linesDisplay;
    this.scoreDisplay = scoreDisplay;
    this.comboDisplay = comboDisplay;
    this.finalLinesDisplay = finalLinesDisplay;
    this.finalScoreDisplay = finalScoreDisplay;
    this.gridWidth = 10;
    this.gridHeight = 20;
    this.blockSize = 30;
    this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(null));
    this.currentPiece = null;
    this.nextPiece = null;
    this.lines = 0;
    this.score = 0;
    this.comboCounter = 0;
    this.isPaused = false;
    this.lockDelay = 500; // Delay before locking piece
    this.lockTimer = null;
    
    this.setupControls();
    this.setupVisibilityChangeHandler();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      if (this.isPaused) return;
      
      switch(e.key) {
        case 'a': this.movePiece(-1, 0); break;
        case 'd': this.movePiece(1, 0); break;
        case 's': this.movePiece(0, 1); break;
        case 'w': this.rotatePiece(); break;
        case ' ': this.hardDrop(); break;
      }
    });
  }

  setupVisibilityChangeHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.isPaused) {
        this.pauseGame();
      }
    });
  }

  startGame() {
    // Reset game state
    this.grid = Array(this.gridHeight).fill().map(() => Array(this.gridWidth).fill(null));
    this.lines = 0;
    this.score = 0;
    this.comboCounter = 0;
    
    // Reset displays
    this.updateScoreDisplay();
    this.finalLinesDisplay.textContent = '0';
    this.finalScoreDisplay.textContent = '0';
    
    // Reset overlay
    const gameOverlay = document.getElementById('gameOverlay');
    const gameOverSection = document.querySelector('.game-over');
    const pauseSection = document.querySelector('.pause-menu');
    gameOverSection.style.display = 'none';
    pauseSection.style.display = 'none';
    gameOverlay.style.display = 'none';
    
    this.isPaused = false;
    
    this.nextPiece = this.getRandomPiece();
    this.spawnPiece();
    this.gameLoop();
  }

  spawnPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = this.getRandomPiece();
    this.drawNextPiece();
    
    this.currentPiece.x = Math.floor(this.gridWidth / 2) - Math.floor(this.currentPiece.shape[0].length / 2);
    this.currentPiece.y = 0;

    if (this.checkCollision()) {
      this.gameOver();
    }

    this.drawGame();
  }

  gameLoop() {
    if (!this.isPaused) {
      this.movePiece(0, 1);
    }
    setTimeout(() => this.gameLoop(), 500);
  }

  movePiece(dx, dy) {
    // Clear any existing lock timer
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }

    this.currentPiece.x += dx;
    this.currentPiece.y += dy;

    if (this.checkCollision()) {
      this.currentPiece.x -= dx;
      this.currentPiece.y -= dy;

      if (dy > 0) {
        // Start lock delay timer
        this.startLockDelay();
      }
    } else {
      // Reset lock delay if piece moves
      this.drawGame();
    }
  }

  startLockDelay() {
    // Clear any existing lock timer
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    // Set a new lock timer
    this.lockTimer = setTimeout(() => {
      this.lockPiece();
    }, this.lockDelay);
  }

  hardDrop() {
    // Clear any existing lock timer
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }

    while (!this.checkCollision()) {
      this.currentPiece.y++;
    }
    this.currentPiece.y--;
    this.lockPiece();
  }

  lockPiece() {
    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.color;
        }
      }
    }

    this.clearLines();
    this.spawnPiece();
  }

  clearLines() {
    let linesCleared = 0;
    const clearedRows = [];

    // First pass: identify full rows and mark them
    for (let y = this.gridHeight - 1; y >= 0; y--) {
      if (this.grid[y].every(cell => cell !== null)) {
        this.markRowForClearing(y);
        clearedRows.push(y);
        linesCleared++;
      }
    }

    // If we found lines to clear, handle the clearing with a delay
    if (linesCleared > 0) {
      // Disable controls during animation
      this.isPaused = true;
      
      setTimeout(() => {
        // Remove all cleared rows at once
        clearedRows.sort((a, b) => b - a).forEach(row => {
          this.grid.splice(row, 1);
          this.grid.unshift(Array(this.gridWidth).fill(null));
        });

        this.lines += linesCleared;
        this.score += [0, 40, 100, 300, 1200][linesCleared];
        this.comboCounter++;
        this.updateScoreDisplay();
        this.showCombo(linesCleared);
        this.isPaused = false;
        this.drawGame();
      }, 200);
    } else {
      this.comboCounter = 0;
    }
  }

  markRowForClearing(row) {
    const blocks = this.gameArea.querySelectorAll('.game-block');
    blocks.forEach(block => {
      const blockY = parseInt(block.style.top) / this.blockSize;
      if (Math.floor(blockY) === row) {
        block.classList.add('clearing');
      }
    });
  }

  showCombo(linesCleared) {
    if (this.comboCounter > 1) {
      this.comboDisplay.textContent = `Combo x${this.comboCounter}`;
      this.comboDisplay.style.opacity = 1;
      setTimeout(() => {
        this.comboDisplay.style.opacity = 0;
      }, 1000);
    }
  }

  updateScoreDisplay() {
    this.linesDisplay.textContent = this.lines;
    this.scoreDisplay.textContent = this.score;
  }

  drawGame() {
    this.gameArea.innerHTML = '';
    
    // Draw ghost piece
    const ghostPiece = JSON.parse(JSON.stringify(this.currentPiece));
    while (!this.checkCollisionForGhost(ghostPiece)) {
      ghostPiece.y++;
    }
    ghostPiece.y--;

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const blockColor = this.grid[y][x];
        if (blockColor) {
          this.drawBlock(x, y, blockColor);
        }
      }
    }

    // Draw ghost piece blocks
    for (let y = 0; y < ghostPiece.shape.length; y++) {
      for (let x = 0; x < ghostPiece.shape[y].length; x++) {
        if (ghostPiece.shape[y][x]) {
          this.drawBlock(ghostPiece.x + x, ghostPiece.y + y, ghostPiece.color, true);
        }
      }
    }

    // Draw current piece
    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          this.drawBlock(this.currentPiece.x + x, this.currentPiece.y + y, this.currentPiece.color);
        }
      }
    }
  }

  drawNextPiece() {
    this.nextBlockArea.innerHTML = '';
    const piece = this.nextPiece;
    const offsetX = Math.floor((4 - piece.shape[0].length) / 2);
    const offsetY = Math.floor((4 - piece.shape.length) / 2);

    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const block = document.createElement('div');
          block.classList.add('game-block');
          block.style.position = 'absolute';
          block.style.width = '30px';
          block.style.height = '30px';
          block.style.left = `${(x + offsetX) * 30}px`;
          block.style.top = `${(y + offsetY) * 30}px`;
          block.style.backgroundColor = piece.color;
          this.nextBlockArea.appendChild(block);
        }
      }
    }
  }

  drawBlock(x, y, color, isGhost = false) {
    const block = document.createElement('div');
    block.classList.add('game-block');
    if (isGhost) block.classList.add('ghost-block');
    block.style.left = `${x * this.blockSize}px`;
    block.style.top = `${y * this.blockSize}px`;
    block.style.backgroundColor = color;
    this.gameArea.appendChild(block);
  }

  rotatePiece() {
    const rotated = this.currentPiece.shape[0].map((_, index) => 
      this.currentPiece.shape.map(row => row[index]).reverse()
    );
    
    const originalShape = this.currentPiece.shape;
    this.currentPiece.shape = rotated;

    if (this.checkCollision()) {
      this.currentPiece.shape = originalShape;
    }

    this.drawGame();
  }

  checkCollision() {
    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          const newX = this.currentPiece.x + x;
          const newY = this.currentPiece.y + y;

          if (
            newX < 0 || 
            newX >= this.gridWidth || 
            newY >= this.gridHeight || 
            (newY >= 0 && this.grid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkCollisionForGhost(piece) {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x;
          const newY = piece.y + y;

          if (
            newX < 0 || 
            newX >= this.gridWidth || 
            newY >= this.gridHeight || 
            (newY >= 0 && this.grid[newY][newX] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getRandomPiece() {
    const piece = { ...PIECES[Math.floor(Math.random() * PIECES.length)] };
    return piece;
  }

  pauseGame() {
    this.isPaused = true;
    const gameOverlay = document.getElementById('gameOverlay');
    const gameOverSection = document.querySelector('.game-over');
    const pauseSection = document.querySelector('.pause-menu');
    
    gameOverSection.style.display = 'none';
    pauseSection.style.display = 'block';
    gameOverlay.style.display = 'flex';
  }

  gameOver() {
    this.isPaused = true;
    const gameOverlay = document.getElementById('gameOverlay');
    const gameOverSection = document.querySelector('.game-over');
    const pauseSection = document.querySelector('.pause-menu');
    
    // Update final score displays
    this.finalLinesDisplay.textContent = this.lines;
    this.finalScoreDisplay.textContent = this.score;

    // Hide pause menu, show game over
    pauseSection.style.display = 'none';
    gameOverSection.style.display = 'block';
    gameOverlay.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const gameArea = document.getElementById('gameArea');
  const nextBlockArea = document.getElementById('nextBlock');
  const linesDisplay = document.getElementById('linesCount');
  const scoreDisplay = document.getElementById('scoreCount');
  const comboDisplay = document.getElementById('comboDisplay');
  const finalLinesDisplay = document.getElementById('finalLinesCount');
  const finalScoreDisplay = document.getElementById('finalScoreCount');
  const gameOverlay = document.getElementById('gameOverlay');
  const restartBtn = document.getElementById('restartBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const startMenu = document.getElementById('startMenu');
  const startBtn = document.getElementById('startBtn');
  const gameContainer = document.getElementById('gameContainer');
  const pauseBtn = document.getElementById('pauseBtn');

  const tetris = new Tetris(
    gameArea, 
    nextBlockArea, 
    linesDisplay, 
    scoreDisplay, 
    comboDisplay,
    finalLinesDisplay,
    finalScoreDisplay
  );

  startBtn.addEventListener('click', () => {
    startMenu.style.display = 'none';
    gameContainer.style.display = 'flex';
    tetris.startGame();
  });

  restartBtn.addEventListener('click', () => {
    gameOverlay.style.display = 'none';
    tetris.startGame();
  });

  resumeBtn.addEventListener('click', () => {
    tetris.isPaused = false;
    const gameOverlay = document.getElementById('gameOverlay');
    const pauseSection = document.querySelector('.pause-menu');
    pauseSection.style.display = 'none';
    gameOverlay.style.display = 'none';
  });

  pauseBtn.addEventListener('click', () => {
    tetris.isPaused = !tetris.isPaused;
    const gameOverlay = document.getElementById('gameOverlay');
    const pauseSection = document.querySelector('.pause-menu');
    const gameOverSection = document.querySelector('.game-over');
    
    if (tetris.isPaused) {
      gameOverSection.style.display = 'none';
      pauseSection.style.display = 'block';
      gameOverlay.style.display = 'flex';
    } else {
      gameOverlay.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tetris.isPaused = !tetris.isPaused;
      const gameOverlay = document.getElementById('gameOverlay');
      const pauseSection = document.querySelector('.pause-menu');
      const gameOverSection = document.querySelector('.game-over');
      
      if (tetris.isPaused) {
        gameOverSection.style.display = 'none';
        pauseSection.style.display = 'block';
        gameOverlay.style.display = 'flex';
      } else {
        gameOverlay.style.display = 'none';
      }
    }
  });
});