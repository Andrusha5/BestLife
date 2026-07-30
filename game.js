// ==========================================
// BESTLIFE - ENGINE (ЗУМ, ГРАНИЦЫ И КАРТА)
// ==========================================

const GRID_SIZE = 18;
const TILE_WIDTH = 80;
const TILE_HEIGHT = 40;

const MAP_DATA = [];

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.45, // Идеальный начальный зум (карта целиком на экране)
    minZoom: 0.35,
    maxZoom: 1.6,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

// Проверка пользовательской текстуры `city_map.png`
const customMapImg = new Image();
let hasCustomImage = false;
customMapImg.src = 'city_map.png';
customMapImg.onload = () => {
    hasCustomImage = true;
    render();
};

// Генерация карты по умолчанию
function generateMapData() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c === 8 || c === 9) {
                MAP_DATA[r][c] = { type: 'water' };
            } else if (r === 4 || r === 12 || c === 3 || c === 14) {
                MAP_DATA[r][c] = { type: 'road' };
            } else {
                const seed = (r * 11 + c * 23) % 100;
                if (seed < 20) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (seed < 50) {
                    MAP_DATA[r][c] = { type: 'house', height: 35, wallColor: '#e2e8f0', roofColor: '#ef4444' };
                } else if (seed < 80) {
                    MAP_DATA[r][c] = { type: 'office', height: 75, wallColor: '#334155', roofColor: '#3b82f6' };
                } else {
                    MAP_DATA[r][c] = { type: 'skyscraper', height: 120, wallColor: '#1e293b', roofColor: '#0284c7' };
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
    
    requestAnimationFrame(renderLoop);
}

function centerMap() {
    camera.zoom = window.innerWidth < 600 ? 0.45 : 0.65;
    // Центрируем камеру строго по центру карты
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 2 - (GRID_SIZE * TILE_HEIGHT * camera.zoom) / 2;
    clampCamera();
}

// Ограничение камеры, чтобы нельзя было уйти за пределы карты
function clampCamera() {
    const mapWidth = GRID_SIZE * TILE_WIDTH * camera.zoom;
    const mapHeight = GRID_SIZE * TILE_HEIGHT * camera.zoom;

    // Оставляем небольшой кусочек карты видимым на границах
    const marginX = canvas.width * 0.75;
    const marginY = canvas.height * 0.75;

    if (camera.x > canvas.width / 2 + mapWidth / 2 + marginX) camera.x = canvas.width / 2 + mapWidth / 2 + marginX;
    if (camera.x < canvas.width / 2 - mapWidth / 2 - marginX) camera.x = canvas.width / 2 - mapWidth / 2 - marginX;
    
    if (camera.y > canvas.height / 2 + mapHeight / 2 + marginY) camera.y = canvas.height / 2 + mapHeight / 2 + marginY;
    if (camera.y < canvas.height / 2 - mapHeight / 2 - marginY) camera.y = canvas.height / 2 - mapHeight / 2 - marginY;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden')) {
        resizeCanvas();
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

    if (hasCustomImage) {
        const w = customMapImg.width * camera.zoom;
        const h = customMapImg.height * camera.zoom;
        ctx.drawImage(customMapImg, camera.x - w / 2, camera.y - h / 2, w, h);
        return;
    }

    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const pos = isoToScreen(r, c);
            const tile = MAP_DATA[r][c];

            drawTileBase(pos.x, pos.y, w, h, tile);

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
        ctx.stroke();
    } else if (tile.type === 'water') {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
    } else if (tile.type === 'park') {
        ctx.fillStyle = '#10b981';
        ctx.fill();
    } else {
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

    // Правая стена
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -40);
    ctx.fill();

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.roofColor;
    ctx.fill();
}

function adjustColor(col, amt) {
    let num = parseInt(col.replace('#', ''), 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return "#" + (g | (b << 8) | (r << 16)).toString(16);
}

// ------------------------------------------
// ПЛАВНЫЙ ЗУМ К ЦЕНТРУ И УПРАВЛЕНИЕ КАРТОЙ
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
            clampCamera();
        }
    });

    window.addEventListener('mouseup', () => camera.isDragging = false);

    // Тач-управление (перемещение и плавный пинч-зум)
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
            clampCamera();
        } else if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = dist / camera.touchPinchDist;
            const newZoom = camera.zoom * factor;
            if (newZoom >= camera.minZoom && newZoom <= camera.maxZoom) {
                camera.zoom = newZoom;
                clampCamera();
                camera.touchPinchDist = dist;
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => camera.isDragging = false);

    // Прямолинейный и плавный зум колесиком мыши в центр экрана
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const factor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
        
        const newZoom = camera.zoom * factor;
        if (newZoom >= camera.minZoom && newZoom <= camera.maxZoom) {
            // Зум относительно центра экрана (прямолинейно без смещений вверх)
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            camera.x = cx - (cx - camera.x) * factor;
            camera.y = cy - (cy - camera.y) * factor;
            camera.zoom = newZoom;
            
            clampCamera();
        }
    }, { passive: false });
    }
