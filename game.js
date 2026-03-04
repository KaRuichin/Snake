// 游戏配置
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const GAME_SPEED = 100;

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

// 画中画相关
let pipWindow = null;
let pipVideo = null;
let pipStream = null;

// DOM 元素
let canvas, ctx;
let scoreElement, highScoreElement;
let startBtn, pipBtn, pauseBtn;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    scoreElement = document.getElementById('score');
    highScoreElement = document.getElementById('highScore');
    startBtn = document.getElementById('startBtn');
    pipBtn = document.getElementById('pipBtn');
    pauseBtn = document.getElementById('pauseBtn');

    highScoreElement.textContent = highScore;

    // 绑定事件
    startBtn.addEventListener('click', startGame);
    pipBtn.addEventListener('click', togglePictureInPicture);
    pauseBtn.addEventListener('click', togglePause);
    document.addEventListener('keydown', handleKeyPress);

    // 绘制初始画面
    drawInitialScreen();
});

// 绘制初始画面
function drawInitialScreen() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#4ecca3';
    ctx.font = 'bold 24px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('按"开始游戏"开始', canvas.width / 2, canvas.height / 2);

    ctx.font = '16px Segoe UI';
    ctx.fillStyle = '#888';
    ctx.fillText('使用方向键控制蛇的移动', canvas.width / 2, canvas.height / 2 + 30);
}

// 开始游戏
function startGame() {
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
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格（可选，增加视觉效果）
    ctx.strokeStyle = 'rgba(78, 204, 163, 0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
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
            // 蛇头
            gradient.addColorStop(0, '#5ff5c8');
            gradient.addColorStop(1, '#4ecca3');
        } else {
            // 蛇身
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 36px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#fff';
    ctx.font = '20px Segoe UI';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 20);

    ctx.fillStyle = '#4ecca3';
    ctx.font = '16px Segoe UI';
    ctx.fillText('按"开始游戏"重新开始', canvas.width / 2, canvas.height / 2 + 60);
}

// 切换暂停
function togglePause() {
    if (isGameOver) return;

    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';

    if (isPaused) {
        // 绘制暂停画面
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 30px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
    } else {
        draw();
    }
}

// 键盘控制
function handleKeyPress(e) {
    // 防止方向键滚动页面
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }

    // 空格键暂停
    if (e.code === 'Space' && !isGameOver && gameLoop) {
        togglePause();
        return;
    }

    if (isPaused || isGameOver) return;

    // 方向控制（防止反方向移动）
    switch (e.code) {
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

// 画中画模式
async function togglePictureInPicture() {
    // 直接使用 Video PiP + 浮动控制面板
    if (!document.pictureInPictureEnabled) {
        alert('您的浏览器不支持画中画模式。');
        return;
    }
    await toggleVideoPiP();
}

// Document Picture-in-Picture（支持键盘控制）
async function toggleDocumentPiP() {
    try {
        // 如果已经有画中画窗口，关闭它
        if (pipWindow && !pipWindow.closed) {
            pipWindow.close();
            pipWindow = null;
            pipBtn.textContent = '🖼️ 画中画模式';
            return;
        }

        // 打开画中画窗口
        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 500,
            height: 580
        });

        pipBtn.textContent = '❌ 关闭画中画';

        // 添加样式
        const style = pipWindow.document.createElement('style');
        style.textContent = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: #0f0f23;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-family: 'Segoe UI', sans-serif;
                color: #fff;
                padding: 10px;
            }
            .game-info {
                display: flex;
                gap: 20px;
                margin-bottom: 10px;
                font-size: 14px;
            }
            .game-info span {
                background: rgba(255,255,255,0.1);
                padding: 5px 15px;
                border-radius: 15px;
            }
            canvas {
                border: 2px solid #4ecca3;
                border-radius: 8px;
            }
            .controls {
                display: grid;
                grid-template-columns: repeat(3, 50px);
                grid-template-rows: repeat(2, 50px);
                gap: 5px;
                margin-top: 15px;
            }
            .ctrl-btn {
                width: 50px;
                height: 50px;
                border: none;
                border-radius: 8px;
                background: rgba(78,204,163,0.3);
                color: #4ecca3;
                font-size: 20px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ctrl-btn:hover {
                background: rgba(78,204,163,0.5);
            }
            .ctrl-btn:active {
                background: #4ecca3;
                color: #0f0f23;
            }
            .hint {
                margin-top: 10px;
                font-size: 12px;
                color: #888;
            }
        `;
        pipWindow.document.head.appendChild(style);

        // 创建内容
        const container = pipWindow.document.createElement('div');
        container.innerHTML = `
            <div class="game-info">
                <span>得分: <span id="pip-score">${score}</span></span>
                <span>最高分: <span id="pip-highScore">${highScore}</span></span>
            </div>
            <canvas id="pip-canvas" width="400" height="400"></canvas>
            <div class="controls">
                <div></div>
                <button class="ctrl-btn" data-dir="up">↑</button>
                <div></div>
                <button class="ctrl-btn" data-dir="left">←</button>
                <button class="ctrl-btn" data-dir="down">↓</button>
                <button class="ctrl-btn" data-dir="right">→</button>
            </div>
            <div class="hint">点击按钮或按方向键控制 | 空格暂停</div>
        `;
        pipWindow.document.body.appendChild(container);

        // 获取元素
        const pipCanvas = pipWindow.document.getElementById('pip-canvas');
        const pipCtx = pipCanvas.getContext('2d');
        const pipScoreEl = pipWindow.document.getElementById('pip-score');
        const pipHighScoreEl = pipWindow.document.getElementById('pip-highScore');

        // 点击按钮控制
        pipWindow.document.querySelectorAll('.ctrl-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.dir;
                if (dir === 'up' && direction !== 'down') nextDirection = 'up';
                if (dir === 'down' && direction !== 'up') nextDirection = 'down';
                if (dir === 'left' && direction !== 'right') nextDirection = 'left';
                if (dir === 'right' && direction !== 'left') nextDirection = 'right';
            });
        });

        // 键盘控制
        pipWindow.document.addEventListener('keydown', handleKeyPress);

        // 同步绘制
        const syncInterval = setInterval(() => {
            if (pipWindow.closed) {
                clearInterval(syncInterval);
                pipWindow = null;
                pipBtn.textContent = '🖼️ 画中画模式';
                return;
            }
            pipCtx.drawImage(canvas, 0, 0);
            pipScoreEl.textContent = score;
            pipHighScoreEl.textContent = highScore;
        }, 16);

        pipWindow.addEventListener('pagehide', () => {
            clearInterval(syncInterval);
            pipWindow = null;
            pipBtn.textContent = '🖼️ 画中画模式';
        });

    } catch (error) {
        console.error('Document PiP 失败:', error);
        // 回退到 Video PiP
        if (document.pictureInPictureEnabled) {
            await toggleVideoPiP();
        } else {
            alert('画中画模式启动失败: ' + error.message);
        }
    }
}

// Video Picture-in-Picture（带虚拟按钮控制面板）
async function toggleVideoPiP() {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            pipBtn.textContent = '🖼️ 画中画模式';
            hideControlPanel();
            clearMediaSession();
            return;
        }

        if (!gameLoop) {
            drawInitialScreen();
        }

        if (!pipVideo) {
            pipVideo = document.createElement('video');
            pipVideo.style.position = 'absolute';
            pipVideo.style.left = '-9999px';
            pipVideo.style.width = '400px';
            pipVideo.style.height = '400px';
            pipVideo.muted = true;
            pipVideo.playsInline = true;
            document.body.appendChild(pipVideo);

            pipVideo.addEventListener('leavepictureinpicture', () => {
                pipBtn.textContent = '🖼️ 画中画模式';
                hideControlPanel();
                clearMediaSession();
            });
        }

        pipStream = canvas.captureStream(30);
        pipVideo.srcObject = pipStream;

        try {
            await pipVideo.play();
        } catch (e) { }

        await new Promise(resolve => requestAnimationFrame(resolve));
        await pipVideo.requestPictureInPicture();

        pipBtn.textContent = '❌ 关闭画中画';
        showControlPanel();
        setupMediaSession();

    } catch (error) {
        console.error('Video PiP 失败:', error);
        alert('画中画模式启动失败: ' + error.message);
    }
}

// 设置 Media Session API（画中画窗口内的控制按钮）
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    // 设置媒体元数据
    navigator.mediaSession.metadata = new MediaMetadata({
        title: '贪吃蛇',
        artist: `得分: ${score}`,
        album: '← 左 | ↑ 上 | 播放暂停 | ↓ 下 | → 右'
    });

    // 使用媒体控制按钮来控制方向
    // previoustrack = 左, nexttrack = 右
    // seekbackward = 上, seekforward = 下
    // play/pause = 暂停/继续

    navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (direction !== 'right') nextDirection = 'left';
        updateMediaSessionMetadata();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (direction !== 'left') nextDirection = 'right';
        updateMediaSessionMetadata();
    });

    navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (direction !== 'down') nextDirection = 'up';
        updateMediaSessionMetadata();
    });

    navigator.mediaSession.setActionHandler('seekforward', () => {
        if (direction !== 'up') nextDirection = 'down';
        updateMediaSessionMetadata();
    });

    navigator.mediaSession.setActionHandler('play', () => {
        if (isPaused) togglePause();
        else if (isGameOver || !gameLoop) startGame();
        navigator.mediaSession.playbackState = 'playing';
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        if (!isPaused && gameLoop) togglePause();
        navigator.mediaSession.playbackState = 'paused';
    });

    navigator.mediaSession.playbackState = 'playing';

    // 定期更新分数显示
    window.mediaSessionUpdateInterval = setInterval(updateMediaSessionMetadata, 500);
}

function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: `贪吃蛇 - 得分: ${score}`,
        artist: `最高分: ${highScore}`,
        album: '⏮左 ⏪上 ⏯暂停 ⏩下 ⏭右'
    });
}

function clearMediaSession() {
    if (window.mediaSessionUpdateInterval) {
        clearInterval(window.mediaSessionUpdateInterval);
    }
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
    }
}

// 显示控制面板（用于 Video PiP 模式）
function showControlPanel() {
    if (document.getElementById('control-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
        <style>
            #control-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(15, 15, 35, 0.98);
                border: 2px solid #4ecca3;
                border-radius: 15px;
                padding: 15px;
                z-index: 10000;
                box-shadow: 0 0 30px rgba(78, 204, 163, 0.3);
                cursor: move;
                user-select: none;
            }
            #control-panel .title {
                color: #4ecca3;
                text-align: center;
                margin-bottom: 10px;
                font-size: 14px;
            }
            #control-panel .score-info {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 10px;
                font-size: 12px;
                color: #fff;
            }
            #control-panel .grid {
                display: grid;
                grid-template-columns: repeat(3, 55px);
                grid-template-rows: repeat(2, 55px);
                gap: 5px;
            }
            #control-panel button {
                width: 55px;
                height: 55px;
                border: none;
                border-radius: 8px;
                background: rgba(78,204,163,0.3);
                color: #4ecca3;
                font-size: 28px;
                cursor: pointer;
                transition: all 0.1s;
            }
            #control-panel button:hover {
                background: rgba(78,204,163,0.5);
                transform: scale(1.05);
            }
            #control-panel button:active {
                background: #4ecca3;
                color: #0f0f23;
                transform: scale(0.95);
            }
            #control-panel .actions {
                display: flex;
                gap: 5px;
                margin-top: 10px;
            }
            #control-panel .action-btn {
                flex: 1;
                height: 35px;
                font-size: 14px;
            }
            #control-panel .hint {
                text-align: center;
                font-size: 11px;
                color: #666;
                margin-top: 8px;
            }
        </style>
        <div class="title">🎮 画中画控制</div>
        <div class="score-info">
            <span>得分: <span id="panel-score">0</span></span>
            <span>最高: <span id="panel-high">0</span></span>
        </div>
        <div class="grid">
            <div></div>
            <button data-dir="up">↑</button>
            <div></div>
            <button data-dir="left">←</button>
            <button data-dir="down">↓</button>
            <button data-dir="right">→</button>
        </div>
        <div class="actions">
            <button class="action-btn" id="panel-start">开始</button>
            <button class="action-btn" id="panel-pause">暂停</button>
        </div>
        <div class="hint">可拖动此面板</div>
    `;
    document.body.appendChild(panel);

    // 方向按钮控制
    panel.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dir = btn.dataset.dir;
            if (dir === 'up' && direction !== 'down') nextDirection = 'up';
            if (dir === 'down' && direction !== 'up') nextDirection = 'down';
            if (dir === 'left' && direction !== 'right') nextDirection = 'left';
            if (dir === 'right' && direction !== 'left') nextDirection = 'right';
        });
    });

    // 开始和暂停按钮
    document.getElementById('panel-start').addEventListener('click', (e) => {
        e.stopPropagation();
        startGame();
    });
    document.getElementById('panel-pause').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePause();
    });

    // 实时更新分数
    const updateScoreInterval = setInterval(() => {
        const panelScore = document.getElementById('panel-score');
        const panelHigh = document.getElementById('panel-high');
        if (panelScore && panelHigh) {
            panelScore.textContent = score;
            panelHigh.textContent = highScore;
        } else {
            clearInterval(updateScoreInterval);
        }
    }, 100);

    // 拖动功能
    let isDragging = false;
    let offsetX, offsetY;

    panel.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        // 边界限制
        x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
        y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.style.cursor = 'move';
    });
}

function hideControlPanel() {
    const panel = document.getElementById('control-panel');
    if (panel) panel.remove();
}
