const COLS = 13;
const ROWS = 22;
const BLOCK_SIZE = 20;
const NEXT_BLOCK_SIZE = 18;

// 方块形状定义 (I, O, T, L, J, S, Z)
const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[0, 0, 1], [1, 1, 1]], // L
  [[1, 0, 0], [1, 1, 1]], // J
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]] // Z
];

// 方块颜色
const COLORS = [
  '#00ffff', // cyan (I)
  '#ffff00', // yellow (O)
  '#aa00ff', // purple (T)
  '#ffaa00', // orange (L)
  '#0000ff', // blue (J)
  '#00ff00', // green (S)
  '#ff0000' // red (Z)
];

Page({
  data: {
    score: 0,
    level: 1,
    lines: 0,
    isPaused: false,
    showGameOver: false
  },

  onLoad() {
    this.initGame();
  },

  initGame() {
    // 初始化游戏状态
    this.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    this.currentShape = null;
    this.currentColor = null;
    this.currentX = 0;
    this.currentY = 0;
    this.nextShape = null;
    this.nextColor = null;
    this.gameInterval = null;
    this.dropSpeed = 1000; // 初始下落速度1秒
    this.touchStartX = 0;
    this.touchStartY = 0;

    // 获取画布上下文
    this.ctx = wx.createCanvasContext('gameCanvas');
    this.nextCtx = wx.createCanvasContext('nextCanvas');

    // 生成第一个和下一个方块
    this.spawnShape();
    this.spawnNextShape();

    // 开始游戏循环
    this.startGameLoop();

    // 重置UI状态
    this.setData({
      score: 0,
      level: 1,
      lines: 0,
      isPaused: false,
      showGameOver: false
    });
  },

  // 生成新的当前方块
  spawnShape() {
    if (this.nextShape) {
      this.currentShape = this.nextShape;
      this.currentColor = this.nextColor;
    } else {
      const randomIndex = Math.floor(Math.random() * SHAPES.length);
      this.currentShape = SHAPES[randomIndex];
      this.currentColor = COLORS[randomIndex];
    }

    // 初始位置居中
    this.currentX = Math.floor(COLS / 2) - Math.floor(this.currentShape[0].length / 2);
    this.currentY = 0;

    // 检查游戏是否结束
    if (this.checkCollision(this.currentShape, this.currentX, this.currentY)) {
      this.gameOver();
    }
  },

  // 生成下一个方块
  spawnNextShape() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    this.nextShape = SHAPES[randomIndex];
    this.nextColor = COLORS[randomIndex];
    this.drawNextShape();
  },

  // 检查碰撞
  checkCollision(shape, x, y) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          
          // 检查边界
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          
          // 检查是否和已有方块碰撞
          if (newY >= 0 && this.grid[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  },

  // 合并方块到网格
  mergeShape() {
    for (let row = 0; row < this.currentShape.length; row++) {
      for (let col = 0; col < this.currentShape[row].length; col++) {
        if (this.currentShape[row][col]) {
          const y = this.currentY + row;
          const x = this.currentX + col;
          if (y >= 0) {
            this.grid[y][x] = this.currentColor;
          }
        }
      }
    }
  },

  // 消除满行
  clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.grid[row].every(cell => cell !== 0)) {
        // 移除满行，顶部添加新行
        this.grid.splice(row, 1);
        this.grid.unshift(Array(COLS).fill(0));
        row++; // 重新检查当前行（现在是新下移的行）
        linesCleared++;
      }
    }

    if (linesCleared > 0) {
      // 更新得分
      const newScore = this.data.score + [0, 100, 300, 500, 800][linesCleared] * this.data.level;
      const newLines = this.data.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      this.setData({
        score: newScore,
        lines: newLines,
        level: newLevel
      });

      // 升级时加快速度
      if (newLevel > this.data.level) {
        this.dropSpeed = Math.max(100, 1000 - (newLevel - 1) * 100);
        this.startGameLoop(); // 重启循环更新速度
      }
    }
  },

  // 旋转方块
  rotate() {
    if (this.data.isPaused || this.data.showGameOver) return;

    // 旋转矩阵：转置然后反转每一行
    const rotated = this.currentShape[0].map((_, index) => 
      this.currentShape.map(row => row[index]).reverse()
    );

    if (!this.checkCollision(rotated, this.currentX, this.currentY)) {
      this.currentShape = rotated;
      this.drawGame();
    }
  },

  // 左移
  moveLeft() {
    if (this.data.isPaused || this.data.showGameOver) return;
    if (!this.checkCollision(this.currentShape, this.currentX - 1, this.currentY)) {
      this.currentX--;
      this.drawGame();
    }
  },

  // 右移
  moveRight() {
    if (this.data.isPaused || this.data.showGameOver) return;
    if (!this.checkCollision(this.currentShape, this.currentX + 1, this.currentY)) {
      this.currentX++;
      this.drawGame();
    }
  },

  // 下移一步
  moveDown() {
    if (this.data.isPaused || this.data.showGameOver) return;
    if (!this.checkCollision(this.currentShape, this.currentX, this.currentY + 1)) {
      this.currentY++;
      this.drawGame();
    } else {
      this.mergeShape();
      this.clearLines();
      this.spawnShape();
      this.spawnNextShape();
      this.drawGame();
    }
  },

  // 直接落到底部
  drop() {
    if (this.data.isPaused || this.data.showGameOver) return;
    while (!this.checkCollision(this.currentShape, this.currentX, this.currentY + 1)) {
      this.currentY++;
    }
    this.moveDown();
  },

  // 暂停/继续
  togglePause() {
    if (this.data.showGameOver) return;
    
    if (this.data.isPaused) {
      this.startGameLoop();
    } else {
      clearInterval(this.gameInterval);
    }

    this.setData({
      isPaused: !this.data.isPaused
    });
  },

  // 重新开始
  restart() {
    clearInterval(this.gameInterval);
    this.initGame();
  },

  // 游戏结束
  gameOver() {
    clearInterval(this.gameInterval);
    this.setData({
      showGameOver: true
    });
  },

  // 开始游戏循环
  startGameLoop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
    }
    this.gameInterval = setInterval(() => {
      this.moveDown();
    }, this.dropSpeed);
  },

  // 绘制游戏界面
  drawGame() {
    // 计算网格在canvas中的水平偏移，使其居中
    const canvasWidth = 240; // 480rpx = 240px (标准设备下1rpx=0.5px)
    const gridWidth = COLS * BLOCK_SIZE;
    const xOffset = 0; // 20px水平居中偏移

    // 清空画布
    this.ctx.clearRect(0, 0, canvasWidth, ROWS * BLOCK_SIZE);

    // 绘制网格背景
    this.ctx.setStrokeStyle('rgba(255, 255, 255, 0.1)');
    this.ctx.setLineWidth(1);
    for (let i = 0; i <= COLS; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(xOffset + i * BLOCK_SIZE, 0);
      this.ctx.lineTo(xOffset + i * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      this.ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(xOffset, i * BLOCK_SIZE);
      this.ctx.lineTo(xOffset + COLS * BLOCK_SIZE, i * BLOCK_SIZE);
      this.ctx.stroke();
    }

    // 绘制已落下的方块
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row][col]) {
          this.drawBlock(this.ctx, col, row, this.grid[row][col], BLOCK_SIZE, xOffset);
        }
      }
    }

    // 绘制当前方块
    for (let row = 0; row < this.currentShape.length; row++) {
      for (let col = 0; col < this.currentShape[row].length; col++) {
        if (this.currentShape[row][col]) {
          const x = this.currentX + col;
          const y = this.currentY + row;
          if (y >= 0) {
            this.drawBlock(this.ctx, x, y, this.currentColor, BLOCK_SIZE, xOffset);
          }
        }
      }
    }

    this.ctx.draw();
  },

  // 绘制下一个方块
  drawNextShape() {
    // 清空画布
    this.nextCtx.clearRect(0, 0, 4 * NEXT_BLOCK_SIZE, 4 * NEXT_BLOCK_SIZE);

    // 居中绘制
    const offsetX = (4 - this.nextShape[0].length) * NEXT_BLOCK_SIZE / 2;
    const offsetY = (4 - this.nextShape.length) * NEXT_BLOCK_SIZE / 2;

    for (let row = 0; row < this.nextShape.length; row++) {
      for (let col = 0; col < this.nextShape[row].length; col++) {
        if (this.nextShape[row][col]) {
          this.drawBlock(this.nextCtx, col, row, this.nextColor, NEXT_BLOCK_SIZE, offsetX, offsetY);
        }
      }
    }

    this.nextCtx.draw();
  },

  // 绘制单个方块
  drawBlock(ctx, x, y, color, size, offsetX = 0, offsetY = 0) {
    const posX = x * size + offsetX;
    const posY = y * size + offsetY;

    // 填充色
    ctx.setFillStyle(color);
    ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);

    // 高光
    ctx.setFillStyle('rgba(255, 255, 255, 0.3)');
    ctx.fillRect(posX + 1, posY + 1, size - 2, 3);
    ctx.fillRect(posX + 1, posY + 1, 3, size - 2);

    // 阴影
    ctx.setFillStyle('rgba(0, 0, 0, 0.3)');
    ctx.fillRect(posX + 1, posY + size - 4, size - 2, 3);
    ctx.fillRect(posX + size - 4, posY + 1, 3, size - 2);
  },

  // 触摸事件处理
  onTouchStart(e) {
    if (this.data.isPaused || this.data.showGameOver) return;
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  },

  onTouchMove(e) {
    if (this.data.isPaused || this.data.showGameOver) return;
    e.preventDefault();
  },

  onTouchEnd(e) {
    if (this.data.isPaused || this.data.showGameOver) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;

    // 判断滑动方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      if (deltaX > 30) {
        this.moveRight();
      } else if (deltaX < -30) {
        this.moveLeft();
      }
    } else {
      // 垂直滑动
      if (deltaY > 30) {
        this.moveDown();
      } else if (deltaY < -30) {
        this.rotate();
      }
    }

    // 短按/点击判断
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      this.rotate();
    }
  }
});