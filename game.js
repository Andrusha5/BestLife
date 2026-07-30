// ==========================================
// BESTLIFE - ENGINE & GRAPHICS
// ==========================================

// Конфигурация большой карты
const GRID_SIZE = 28;
const TILE_WIDTH = 90;
const TILE_HEIGHT = 45;

const MAP_DATA = [];

// Камера и управление
const camera = {
    x: 0,
    y: 0,
    zoom: 0.8,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

// Генерация разветвленного города
function generateCity() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            // Река
            if (c === 13 || c === 14) {
                MAP_DATA[r][c] = { type: 'water' };
            }
            // Дороги (сеть улиц)
            else if (r % 6 === 0 || c % 6 === 0) {
                MAP_DATA[r][c] = { type: 'road' };
            }
            // Здания и парки
            else {
                const seed = (r * 17 + c * 31) % 100;
                if (seed < 15) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (seed < 35) {
                    MAP_DATA[r][c] = { type: 'house', height: 40, wallColor: '#e2e8f0', roofColor: '#c0392b' };
                } else if (seed < 60) {
                    MAP_DATA[r][c] = { type: 'office', height: 85, wallColor: '#334155', roofColor: '#0ea5e9' };
                } else if (seed < 85) {
                    MAP_DATA[r][c] = { type: 'skyscraper', height: 150, wallColor: '#1e293b', roofColor: '#38bdf8' };
                } else {
                    MAP_DATA[r][c] = { type: 'factory', height: 60, wallColor: '#78350f', roofColor: '#f59e0b' };
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

// Нитро -> Меню
setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
document.getElementById('btn-reset-cam').addEventListener('click', centerCamera);
document.getElementById('btn-menu-back').addEventListener('click', () => {
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
    render();
}

function centerCamera() {
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 5;
    camera.zoom = window.innerWidth < 600 ? 0.65 : 0.9;
    render();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    render();
}

window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden')) {
        resizeCanvas();
    }
});

// ------------------------------------------
// ИЗОМЕТРИЧЕСКИЙ РЕНДЕР С ТЕКСТУРАМИ
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

            // Оптимизация (не рисовать то, что за пределами экрана)
            if (pos.x < -w * 2 || pos.x > canvas.width + w * 2 || pos.y < -h * 4 || pos.y > canvas.height + h * 4) {
                continue;
            }

            const tile = MAP_DATA[r][c];

            // 1. Отрисовка Земли / Дорог / Реки
            drawTileBase(pos.x, pos.y, w, h, tile, r, c);

            // 2. Отрисовка Текстурного Здания
            if (tile.height) {
                drawDetailedBuilding(pos.x, pos.y, w, h, tile);
            }
        }
    }
}

// Отрисовка поверхности
function drawTileBase(x, y, w, h, tile, r, c) {
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
        ctx.stroke();

        // Разметка дорог и перекрестков
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3 * camera.zoom, 3 * camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y + h / 4);
        ctx.lineTo(x + w / 4, y + h * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (tile.type === 'water') {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        // Блик воды
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w / 6, y + h / 2);
        ctx.lineTo(x + w / 6, y + h / 2);
        ctx.stroke();
    } else if (tile.type === 'park') {
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        // Деревья в парке
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(x, y + h / 2, 6 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.stroke();
    }
}

// Детализированные текстурные дома
function drawDetailedBuilding(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    // Левая стена
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -25);
    ctx.fill();

    // Окна на левой стене
    drawWindows(x - w / 4, y + h * 0.75, bh, w, h, -1);

    // Правая стена
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -45);
    ctx.fill();

    // Окна на правой стене
    drawWindows(x + w / 4, y + h * 0.75, bh, w, h, 1);

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.roofColor;
    ctx.fill();

    // Вертолетная площадка H на небоскребах
    if (tile.type === 'skyscraper') {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 12 * camera.zoom)}px Montserrat`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', x, y + h / 2 - bh);
    }
}

// Рисование светящихся окон
function drawWindows(centerX, bottomY, bh, w, h, side) {
    const layers = Math.floor(bh / (14 * camera.zoom));
    ctx.fillStyle = '#fef08a';

    for (let i = 1; i < layers; i++) {
        const wy = bottomY - i * (12 * camera.zoom);
        const wx = centerX;
        ctx.fillRect(wx - 2 * camera.zoom, wy - 2 * camera.zoom, 4 * camera.zoom, 4 * camera.zoom);
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
// СЕНСОРНОЕ УПРАВЛЕНИЕ (TOUCH & MOUSE DRAG)
// ------------------------------------------
function setupControls() {
    // Движение мышью
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
            render();
        }
    });

    window.addEventListener('mouseup', () => camera.isDragging = false);

    // Движение пальцами на телефоне
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
            render();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / camera.touchPinchDist;
            if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 1.8) {
                camera.zoom *= factor;
                camera.touchPinchDist = dist;
                render();
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => camera.isDragging = false);

    // Масштаб колесиком
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 1.8) {
            camera.zoom *= factor;
            render();
        }
    }, { passive: false });
                   }
