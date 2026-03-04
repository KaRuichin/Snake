// 游戏配置
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const GAME_SPEED = 100;
const CANVAS_SIZE = 400;

// 游戏状态
let snake = [];
let food = {};
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;
let dpr = 1;

// 焦点相关
let pausedByBlur = false;
let resumeCountdown = null;
let countdownValue = 0;

// DOM 元素
let canvas, ctx;
let scoreElement, highScoreElement;
let startBtn, pauseBtn, autoResumeToggle, countdownSecondsInput;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    scoreElement = document.getElementById('score');
    highScoreElement = document.getElementById('highScore');
    startBtn = document.getElementById('startBtn');
    pauseBtn = document.getElementById('pauseBtn');
    autoResumeToggle = document.getElementById('autoResumeToggle');
    countdownSecondsInput = document.getElementById('countdownSeconds');

    // 设置高清 Canvas
    setupHiDPICanvas();

    highScoreElement.textContent = highScore;

    // 绑定事件
    startBtn.addEventListener('click', () => {
        startGame();
        startBtn.blur();
    });
    pauseBtn.addEventListener('click', () => {
        togglePause();
        pauseBtn.blur();
    });
    document.addEventListener('keydown', handleKeyPress);

    // 监听缩放变化
    window.addEventListener('resize', handleResize);

    // 监听窗口焦点变化
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 绘制初始画面
    drawInitialScreen();
});

// 设置高清 Canvas
function setupHiDPICanvas() {
    dpr = window.devicePixelRatio || 1;

    // 设置 canvas 的实际像素大小
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;

    // 设置 canvas 的 CSS 显示大小
    canvas.style.width = CANVAS_SIZE + 'px';
    canvas.style.height = CANVAS_SIZE + 'px';

    // 缩放绑定上下文
    ctx.scale(dpr, dpr);
}

// 处理窗口缩放
function handleResize() {
    const newDpr = window.devicePixelRatio || 1;
    if (newDpr !== dpr) {
        setupHiDPICanvas();
        // 重绘当前画面
        if (gameLoop && !isPaused && !isGameOver) {
            draw();
        } else if (isPaused) {
            draw();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('已暂停', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        } else if (isGameOver) {
            draw();
            gameOverScreen();
        } else {
            drawInitialScreen();
        }
    }
}

// 游戏结束画面
function gameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 36px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20);

    ctx.fillStyle = '#fff';
    ctx.font = '20px Segoe UI';
    ctx.fillText(`得分: ${score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);

    ctx.fillStyle = '#4ecca3';
    ctx.font = '16px Segoe UI';
    ctx.fillText('按"开始游戏"重新开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
}

// 绘制初始画面
function drawInitialScreen() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 24px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('按"开始游戏"开始', CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    ctx.font = '16px Segoe UI';
    ctx.fillStyle = '#888';
    ctx.fillText('使用方向键控制蛇的移动', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30);
}

// 开始游戏
function startGame() {
    // 取消自动恢复倒计时（如果有）
    cancelAutoResume();
    pausedByBlur = false;

    // 重置游戏状态
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    isPaused = false;
    isGameOver = false;

    scoreElement.textContent = score;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '暂停';

    // 生成食物
    generateFood();

    // 清除旧的游戏循环
    if (gameLoop) {
        clearInterval(gameLoop);
    }

    // 开始游戏循环
    gameLoop = setInterval(gameUpdate, GAME_SPEED);
}

// 生成食物
function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

// 游戏更新
function gameUpdate() {
    if (isPaused || isGameOver) return;

    direction = nextDirection;

    // 计算新的头部位置
    const head = { ...snake[0] };

    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    // 检测碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }

    // 添加新头部
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;

        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }

        generateFood();
    } else {
        snake.pop();
    }

    // 绘制游戏
    draw();
}

// 检测碰撞
function checkCollision(head) {
    // 撞墙
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        return true;
    }

    // 撞自己
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制网格
    ctx.strokeStyle = 'rgba(78, 204, 163, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
        ctx.stroke();
    }

    // 绘制蛇
    snake.forEach((segment, index) => {
        const gradient = ctx.createRadialGradient(
            segment.x * CELL_SIZE + CELL_SIZE / 2,
            segment.y * CELL_SIZE + CELL_SIZE / 2,
            0,
            segment.x * CELL_SIZE + CELL_SIZE / 2,
            segment.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 2
        );

        if (index === 0) {
            gradient.addColorStop(0, '#5ff5c8');
            gradient.addColorStop(1, '#4ecca3');
        } else {
            const alpha = 1 - (index / snake.length) * 0.5;
            gradient.addColorStop(0, `rgba(78, 204, 163, ${alpha})`);
            gradient.addColorStop(1, `rgba(56, 165, 131, ${alpha})`);
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
            4
        );
        ctx.fill();

        // 绘制蛇眼睛
        if (index === 0) {
            ctx.fillStyle = '#0f0f23';
            const eyeSize = 3;
            const eyeOffset = 5;

            let eye1X, eye1Y, eye2X, eye2Y;
            const centerX = segment.x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = segment.y * CELL_SIZE + CELL_SIZE / 2;

            switch (direction) {
                case 'up':
                    eye1X = centerX - eyeOffset;
                    eye1Y = centerY - eyeOffset;
                    eye2X = centerX + eyeOffset;
                    eye2Y = centerY - eyeOffset;
                    break;
                case 'down':
                    eye1X = centerX - eyeOffset;
                    eye1Y = centerY + eyeOffset;
                    eye2X = centerX + eyeOffset;
                    eye2Y = centerY + eyeOffset;
                    break;
                case 'left':
                    eye1X = centerX - eyeOffset;
                    eye1Y = centerY - eyeOffset;
                    eye2X = centerX - eyeOffset;
                    eye2Y = centerY + eyeOffset;
                    break;
                case 'right':
                    eye1X = centerX + eyeOffset;
                    eye1Y = centerY - eyeOffset;
                    eye2X = centerX + eyeOffset;
                    eye2Y = centerY + eyeOffset;
                    break;
            }

            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 绘制食物
    const foodGradient = ctx.createRadialGradient(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
    );
    foodGradient.addColorStop(0, '#ff6b6b');
    foodGradient.addColorStop(1, '#ee5253');

    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 食物光晕效果
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
}

// 游戏结束
function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    gameLoop = null;
    pauseBtn.disabled = true;

    // 绘制游戏结束画面
    gameOverScreen();
}

// 切换暂停
function togglePause() {
    if (isGameOver) return;

    // 如果正在倒计时，取消并立即恢复
    if (resumeCountdown) {
        cancelAutoResume();
        pausedByBlur = false;
        isPaused = false;
        pauseBtn.textContent = '暂停';
        draw();
        return;
    }

    // 如果是因失焦暂停的，手动恢复
    if (pausedByBlur) {
        pausedByBlur = false;
        isPaused = false;
        pauseBtn.textContent = '暂停';
        draw();
        return;
    }

    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    } else {
        draw();
    }
}

// 键盘控制
function handleKeyPress(e) {
    const key = e.code || e.key;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(key)) {
        e.preventDefault();
    }

    // 空格键：开始游戏 / 重新开始 / 暂停继续
    if (key === 'Space') {
        if (!gameLoop || isGameOver) {
            // 游戏未开始或已结束，开始/重新开始游戏
            startGame();
        } else {
            // 游戏进行中，切换暂停
            togglePause();
        }
        return;
    }

    if (isPaused || isGameOver || !gameLoop) return;

    switch (key) {
        case 'ArrowUp':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'ArrowDown':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'ArrowLeft':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'ArrowRight':
            if (direction !== 'left') nextDirection = 'right';
            break;
    }
}

// 窗口失去焦点
function handleWindowBlur() {
    if (gameLoop && !isPaused && !isGameOver) {
        pausedByBlur = true;
        isPaused = true;
        pauseBtn.textContent = '继续';
        cancelAutoResume();
        drawPausedScreen('窗口失去焦点 - 已暂停');
    }
}

// 窗口获得焦点
function handleWindowFocus() {
    if (pausedByBlur && isPaused && !isGameOver) {
        if (autoResumeToggle && autoResumeToggle.checked) {
            startAutoResume();
        }
    }
}

// 页面可见性变化
function handleVisibilityChange() {
    if (document.hidden) {
        handleWindowBlur();
    } else {
        handleWindowFocus();
    }
}

// 获取用户设置的倒计时秒数
function getCountdownSeconds() {
    if (countdownSecondsInput) {
        const val = parseInt(countdownSecondsInput.value, 10);
        if (val >= 1 && val <= 10) {
            return val;
        }
    }
    return 3; // 默认3秒
}

// 开始自动恢复倒计时
function startAutoResume() {
    cancelAutoResume();
    countdownValue = getCountdownSeconds();
    drawCountdown();

    resumeCountdown = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            drawCountdown();
        } else {
            cancelAutoResume();
            resumeFromBlur();
        }
    }, 1000);
}

// 取消自动恢复
function cancelAutoResume() {
    if (resumeCountdown) {
        clearInterval(resumeCountdown);
        resumeCountdown = null;
    }
    countdownValue = 0;
}

// 从失焦暂停中恢复
function resumeFromBlur() {
    if (pausedByBlur && isPaused) {
        pausedByBlur = false;
        isPaused = false;
        pauseBtn.textContent = '暂停';
        draw();
    }
}

// 绘制暂停画面（带自定义消息）
function drawPausedScreen(message) {
    draw();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(message || '已暂停', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20);

    if (autoResumeToggle && autoResumeToggle.checked) {
        ctx.font = '16px Segoe UI';
        ctx.fillStyle = '#4ecca3';
        ctx.fillText(`焦点恢复后 ${getCountdownSeconds()} 秒自动继续`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 15);
    } else {
        ctx.font = '16px Segoe UI';
        ctx.fillStyle = '#888';
        ctx.fillText('按空格或点击继续按钮恢复', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 15);
    }
}

// 绘制倒计时
function drawCountdown() {
    draw();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 72px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(countdownValue, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20);

    ctx.font = '18px Segoe UI';
    ctx.fillStyle = '#fff';
    ctx.fillText('即将继续...', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60);
}
