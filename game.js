// ==========================================
// BESTLIFE - ENGINE & GRAPHICS
// ==========================================

const GRID_SIZE = 24;
const TILE_WIDTH = 80;
const TILE_HEIGHT = 40;

const MAP_DATA = [];

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.8,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

let isGameRunning = false;

// Генерация разветвленного города
function generateCity() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            // Река
            if (c === 11 || c === 12) {
                MAP_DATA[r][c] = { type: 'water' };
            }
            // Дорожная сеть
            else if (r % 5 === 0 || c % 5 === 0) {
                MAP_DATA[r][c] = { type: 'road' };
            }
            // Здания и зеленые зоны
            else {
                const val = (r * 13 + c * 29) % 100;
                if (val < 18) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (val < 45) {
                    MAP_DATA[r][c] = { type: 'house', height: 35, wallColor: '#cbd5e1', roofColor: '#e11d48' };
                } else if (val < 75) {
                    MAP_DATA[r][c] = { type: 'office', height: 70, wallColor: '#334155', roofColor: '#0284c7' };
                } else {
                    MAP_DATA[r][c] = { type: 'skyscraper', height: 120, wallColor: '#1e293b', roofColor: '#38bdf8' };
                }
            }
        }
    }
}

// Элементы
const introScreen = document.getElementById('intro-screen');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const settingsModal = document.getElementById('settings-modal');

// Показ меню после Интро
setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
document.getElementById('btn-menu-back').addEventListener('click', () => {
    isGameRunning = false;
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

function startGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    resizeCanvas();
    generateCity();
    centerCamera();
    setupControls();
    
    isGameRunning = true;
    requestAnimationFrame(gameLoop);
}

// Идеальный расчет центра карты на экране
function centerCamera() {
    camera.zoom = window.innerWidth < 600 ? 0.75 : 1.0;
    camera.x = canvas.width / 2;
    camera.y = (canvas.height / 2) - ((GRID_SIZE * TILE_HEIGHT / 2) * camera.zoom);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden')) {
        resizeCanvas();
        centerCamera();
    }
});

function gameLoop() {
    if (isGameRunning) {
        render();
        requestAnimationFrame(gameLoop);
    }
}

// ------------------------------------------
// ИЗОМЕТРИЧЕСКИЙ РЕНДЕР
// ------------------------------------------
function isoToScreen(r, c) {
    const x = (c - r) * (TILE_WIDTH / 2) * camera.zoom + camera.x;
    const y = (c + r) * (TILE_HEIGHT / 2) * camera.zoom + camera.y;
    return { x, y };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const pos = isoToScreen(r, c);

            // Не рисуем плитки за рамками видимости
            if (pos.x < -w * 2 || pos.x > canvas.width + w * 2 || pos.y < -h * 4 || pos.y > canvas.height + h * 4) {
                continue;
            }

            const tile = MAP_DATA[r][c];

            // 1. Поверхность (дороги, трава, река)
            drawTileBase(pos.x, pos.y, w, h, tile);

            // 2. Здания
            if (tile.height) {
                drawBuilding(pos.x, pos.y, w, h, tile);
            }
        }
    }
}

function drawTileBase(x, y, w, h, tile) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath();

    if (tile.type === 'road') {
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Разметка полосы
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([2 * camera.zoom, 2 * camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y + h / 4);
        ctx.lineTo(x + w / 4, y + h * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (tile.type === 'water') {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y + h / 2);
        ctx.lineTo(x + w / 4, y + h / 2);
        ctx.stroke();
    } else if (tile.type === 'park') {
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        // Дерево
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(x, y + h / 2, 5 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawBuilding(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    // Левая грань
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -20);
    ctx.fill();

    // Окна
    drawWindows(x - w / 4, y + h * 0.75, bh);

    // Правая грань
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -40);
    ctx.fill();

    // Окна
    drawWindows(x + w / 4, y + h * 0.75, bh);

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.roofColor;
    ctx.fill();

    // Буква H для вертолетной площадки
    if (tile.type === 'skyscraper') {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(9, 11 * camera.zoom)}px Montserrat`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', x, y + h / 2 - bh);
    }
}

function drawWindows(centerX, bottomY, bh) {
    const layers = Math.floor(bh / (12 * camera.zoom));
    ctx.fillStyle = '#fef08a';

    for (let i = 1; i < layers; i++) {
        const wy = bottomY - i * (10 * camera.zoom);
        ctx.fillRect(centerX - 2 * camera.zoom, wy - 2 * camera.zoom, 4 * camera.zoom, 4 * camera.zoom);
    }
}

function adjustColor(col, amt) {
    let num = parseInt(col.replace('#', ''), 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return "#" + (g | (b << 8) | (r << 16)).toString(16);
}

// ------------------------------------------
// ТАЧ И МЫШЬ: СДВИГ КАРТЫ ВВЕРХ/ВНИЗ/ВЛЕВО/ВПРАВО
// ------------------------------------------
function setupControls() {
    // Мышь
    canvas.addEventListener('mousedown', (e) => {
        camera.isDragging = true;
        camera.lastX = e.clientX;
        camera.lastY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (camera.isDragging) {
            camera.x += e.clientX - camera.lastX;
            camera.y += e.clientY - camera.lastY;
            camera.lastX = e.clientX;
            camera.lastY = e.clientY;
        }
    });

    window.addEventListener('mouseup', () => camera.isDragging = false);

    // Палец на смартфоне
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            camera.isDragging = true;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            camera.isDragging = false;
            camera.touchPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (camera.isDragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - camera.lastX;
            const dy = e.touches[0].clientY - camera.lastY;
            camera.x += dx;
            camera.y += dy;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / camera.touchPinchDist;
            if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 1.8) {
                camera.zoom *= factor;
                camera.touchPinchDist = dist;
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => camera.isDragging = false);

    // Колесико мыши (Масштаб)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 1.8) {
            camera.zoom *= factor;
        }
    }, { passive: false });
}
