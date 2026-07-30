// ==========================================
// BESTLIFE - ENGINE (ГАРАНТИРОВАННАЯ КАРТА)
// ==========================================

const GRID_SIZE = 18;
const TILE_WIDTH = 90;
const TILE_HEIGHT = 45;

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

// Загрузка пользовательской картинки города (если она есть)
const customMapImg = new Image();
let hasCustomImage = false;
customMapImg.src = 'city_map.png';
customMapImg.onload = () => {
    hasCustomImage = true;
    render();
};

// Генерация карты города по умолчанию
function generateMapData() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            // Река
            if (c === 8 || c === 9) {
                MAP_DATA[r][c] = { type: 'water' };
            }
            // Дорожная сеть
            else if (r === 4 || r === 12 || c === 3 || c === 14) {
                MAP_DATA[r][c] = { type: 'road' };
            }
            // Здания и парки
            else {
                const seed = (r * 11 + c * 23) % 100;
                if (seed < 20) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (seed < 50) {
                    MAP_DATA[r][c] = { type: 'house', height: 40, wallColor: '#e2e8f0', roofColor: '#ef4444' };
                } else if (seed < 80) {
                    MAP_DATA[r][c] = { type: 'office', height: 80, wallColor: '#334155', roofColor: '#3b82f6' };
                } else {
                    MAP_DATA[r][c] = { type: 'skyscraper', height: 130, wallColor: '#1e293b', roofColor: '#0284c7' };
                }
            }
        }
    }
}

// Элементы UI
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
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

function startGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    generateMapData();
    resizeCanvas();
    centerMap();
    setupControls();
    
    // Постоянный цикл отрисовки
    requestAnimationFrame(renderLoop);
}

function centerMap() {
    camera.zoom = window.innerWidth < 600 ? 0.7 : 1.0;
    camera.x = canvas.width / 2;
    camera.y = canvas.height * 0.25;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden')) {
        resizeCanvas();
        centerMap();
    }
});

function renderLoop() {
    if (!gameScreen.classList.contains('hidden')) {
        render();
        requestAnimationFrame(renderLoop);
    }
}

// ------------------------------------------
// РЕНДЕР КАРТЫ
// ------------------------------------------
function isoToScreen(r, c) {
    const x = (c - r) * (TILE_WIDTH / 2) * camera.zoom + camera.x;
    const y = (c + r) * (TILE_HEIGHT / 2) * camera.zoom + camera.y;
    return { x, y };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если загружена картинка `city_map.png`, отображаем её!
    if (hasCustomImage) {
        const w = customMapImg.width * camera.zoom;
        const h = customMapImg.height * camera.zoom;
        ctx.drawImage(customMapImg, camera.x - w / 2, camera.y, w, h);
        return;
    }

    // Иначе генерируем яркий изометрический город
    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const pos = isoToScreen(r, c);
            const tile = MAP_DATA[r][c];

            // 1. Зеленая трава / Дороги / Река
            drawTileBase(pos.x, pos.y, w, h, tile);

            // 2. 3D Дома
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
        ctx.fillStyle = '#3b4252';
        ctx.fill();
        ctx.strokeStyle = '#2e3440';
        ctx.stroke();

        // Белая полоса
        ctx.strokeStyle = '#eceff4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y + h / 4);
        ctx.lineTo(x + w / 4, y + h * 0.75);
        ctx.stroke();
    } else if (tile.type === 'water') {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
    } else if (tile.type === 'park') {
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(x, y + h / 2, 6 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Яркая зеленая трава
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#16a34a';
        ctx.stroke();
    }
}

function drawBuilding(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    // Левая стена
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -20);
    ctx.fill();
    ctx.stroke();

    // Правая стена
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -40);
    ctx.fill();
    ctx.stroke();

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.roofColor;
    ctx.fill();
    ctx.stroke();
}

function adjustColor(col, amt) {
    let num = parseInt(col.replace('#', ''), 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return "#" + (g | (b << 8) | (r << 16)).toString(16);
}

// ------------------------------------------
// СДВИГ КАРТЫ ПАЛЬЦЕМ ИЛИ МЫШЬЮ
// ------------------------------------------
function setupControls() {
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

    // Касание пальцем
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
            camera.x += e.touches[0].clientX - camera.lastX;
            camera.y += e.touches[0].clientY - camera.lastY;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / camera.touchPinchDist;
            if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 2.0) {
                camera.zoom *= factor;
                camera.touchPinchDist = dist;
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => camera.isDragging = false);

    // Масштаб колесиком
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        if (camera.zoom * factor >= 0.4 && camera.zoom * factor <= 2.0) {
            camera.zoom *= factor;
        }
    }, { passive: false });
                             }
