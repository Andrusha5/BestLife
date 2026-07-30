// ==========================================
// BESTLIFE - ENGINE WITH HOME & GENDER SELECT
// ==========================================

const GRID_SIZE = 16;
const TILE_WIDTH = 100;
const TILE_HEIGHT = 50;
const MAP_DATA = [];

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.3,
    maxZoom: 2.5,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

// Координаты оранжевого дома игрока (r: 6, c: 2)
const PLAYER_HOME_TILE = { r: 6, c: 2 };
let triangleAngle = 0; // Угол вращения треугольника

// Текстура карты города city_map.png
const customMapImg = new Image();
let hasCustomImage = false;
customMapImg.src = 'city_map.png';
customMapImg.onload = () => {
    hasCustomImage = true;
    if (!gameScreen.classList.contains('hidden')) {
        fitAndCenterMap();
        render();
    }
};

// Генерация резервной карты
function generateMapData() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c === 7 || c === 8) {
                MAP_DATA[r][c] = { type: 'water' };
            } else if (r === 4 || r === 11 || c === 3 || c === 12) {
                MAP_DATA[r][c] = { type: 'road' };
            } else if (r === PLAYER_HOME_TILE.r && c === PLAYER_HOME_TILE.c) {
                MAP_DATA[r][c] = { type: 'player_home', height: 50, wallColor: '#ea580c', roofColor: '#f97316' };
            } else {
                const seed = (r * 13 + c * 29) % 100;
                if (seed < 20) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (seed < 55) {
                    MAP_DATA[r][c] = { type: 'house', height: 40, wallColor: '#e2e8f0', roofColor: '#ef4444' };
                } else {
                    MAP_DATA[r][c] = { type: 'office', height: 80, wallColor: '#334155', roofColor: '#3b82f6' };
                }
            }
        }
    }
}

// UI элементы
const introScreen = document.getElementById('intro-screen');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const genderModal = document.getElementById('gender-modal');
const apartmentScreen = document.getElementById('apartment-screen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const settingsModal = document.getElementById('settings-modal');

// Нитро -> Меню
setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

// Кнопка Играть
document.getElementById('btn-play').addEventListener('click', () => {
    const savedGender = localStorage.getItem('bestlife_gender');
    if (!savedGender) {
        // Показываем выбор пола при первом входе
        genderModal.classList.remove('hidden');
    } else {
        // Сразу запускаем игру
        launchGame();
    }
});

// Выбор пола
document.getElementById('gender-boy').addEventListener('click', () => selectGender('boy'));
document.getElementById('gender-girl').addEventListener('click', () => selectGender('girl'));

function selectGender(gender) {
    localStorage.setItem('bestlife_gender', gender);
    genderModal.classList.add('hidden');
    launchGame();
}

document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
document.getElementById('btn-menu-back').addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Кнопка стрелочка "Назад" из квартиры в город
document.getElementById('btn-exit-apartment').addEventListener('click', () => {
    apartmentScreen.classList.add('hidden');
});

function launchGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    generateMapData();
    resizeCanvas();
    fitAndCenterMap();
    setupControls();
    
    requestAnimationFrame(renderLoop);
}

function getMapDimensions() {
    if (hasCustomImage) {
        return { w: customMapImg.width * camera.zoom, h: customMapImg.height * camera.zoom };
    } else {
        return { w: GRID_SIZE * TILE_WIDTH * camera.zoom, h: GRID_SIZE * TILE_HEIGHT * camera.zoom };
    }
}

function fitAndCenterMap() {
    const dim = hasCustomImage 
        ? { w: customMapImg.width, h: customMapImg.height }
        : { w: GRID_SIZE * TILE_WIDTH, h: GRID_SIZE * TILE_HEIGHT };

    const fitZoomX = (canvas.width * 0.95) / dim.w;
    const fitZoomY = (canvas.height * 0.95) / dim.h;
    
    camera.minZoom = Math.min(fitZoomX, fitZoomY, 0.4);
    camera.zoom = Math.min(Math.max(fitZoomX, fitZoomY), 1.0);
    
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 2;
    
    clampCamera();
}

function clampCamera() {
    const map = getMapDimensions();
    const halfW = map.w / 2;
    const halfH = map.h / 2;

    if (map.w > canvas.width) {
        camera.x = Math.max(canvas.width - halfW, Math.min(halfW, camera.x));
    } else {
        camera.x = canvas.width / 2;
    }

    if (map.h > canvas.height) {
        camera.y = Math.max(canvas.height - halfH, Math.min(halfH, camera.y));
    } else {
        camera.y = canvas.height / 2;
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
    if (!gameScreen.classList.contains('hidden')) {
        resizeCanvas();
        clampCamera();
    }
});

function renderLoop() {
    if (!gameScreen.classList.contains('hidden')) {
        triangleAngle += 0.03; // Медленное вращение
        render();
        requestAnimationFrame(renderLoop);
    }
}

// Расчет экранных координат оранжевого дома
function getPlayerHomeScreenPos() {
    if (hasCustomImage) {
        const map = getMapDimensions();
        // Точная точка оранжевого дома на изображении city_map.png
        return {
            x: camera.x - map.w * 0.02,
            y: camera.y + map.h * 0.08
        };
    } else {
        const w = TILE_WIDTH * camera.zoom;
        const h = TILE_HEIGHT * camera.zoom;
        const map = getMapDimensions();
        const startX = camera.x;
        const startY = camera.y - map.h / 2;
        const r = PLAYER_HOME_TILE.r;
        const c = PLAYER_HOME_TILE.c;
        return {
            x: (c - r) * (w / 2) + startX,
            y: (c + r) * (h / 2) + startY - 40 * camera.zoom
        };
    }
}

// ------------------------------------------
// РЕНДЕР КАРТЫ И УКАЗАТЕЛЯ
// ------------------------------------------
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (hasCustomImage) {
        const map = getMapDimensions();
        ctx.drawImage(customMapImg, camera.x - map.w / 2, camera.y - map.h / 2, map.w, map.h);
    } else {
        const w = TILE_WIDTH * camera.zoom;
        const h = TILE_HEIGHT * camera.zoom;
        const map = getMapDimensions();
        const startX = camera.x;
        const startY = camera.y - map.h / 2;

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const posX = (c - r) * (w / 2) + startX;
                const posY = (c + r) * (h / 2) + startY;
                const tile = MAP_DATA[r][c];

                drawTileBase(posX, posY, w, h, tile);
                if (tile.height) {
                    drawBuilding(posX, posY, w, h, tile);
                }
            }
        }
    }

    // РИСУЕМ ВРАЩАЮЩИЙСЯ ТРЕУГОЛЬНИК НАД ДОМОМИГРОКА
    drawRotatingHomeIndicator();
}

function drawRotatingHomeIndicator() {
    const homePos = getPlayerHomeScreenPos();
    const bobbing = Math.sin(triangleAngle * 2) * 6; // Плавное покачивание вверх-вниз
    const indX = homePos.x;
    const indY = homePos.y - 45 * camera.zoom + bobbing;

    ctx.save();
    ctx.translate(indX, indY);
    ctx.rotate(triangleAngle);

    // Рисуем светящийся голубой треугольник
    const size = 14 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.lineTo(size, size);
    ctx.lineTo(-size, size);
    ctx.closePath();

    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * camera.zoom;
    ctx.stroke();

    ctx.restore();
}

function drawTileBase(x, y, w, h, tile) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath();

    if (tile.type === 'road') ctx.fillStyle = '#334155';
    else if (tile.type === 'water') ctx.fillStyle = '#0284c7';
    else if (tile.type === 'park') ctx.fillStyle = '#10b981';
    else ctx.fillStyle = '#22c55e';

    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();
}

function drawBuilding(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -20);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -40);
    ctx.fill();

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
// КЛИК ПО ДОМУ И УПРАВЛЕНИЕ КАРТОЙ
// ------------------------------------------
function setupControls() {
    let clickStartX = 0;
    let clickStartY = 0;

    canvas.addEventListener('mousedown', (e) => {
        camera.isDragging = true;
        camera.lastX = e.clientX;
        camera.lastY = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
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

    window.addEventListener('mouseup', (e) => {
        camera.isDragging = false;
        // Если это был клик (а не перетаскивание карты)
        if (Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY) < 10) {
            checkHomeClick(e.clientX, e.clientY);
        }
    });

    // Тач на мобильных устройствах
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            camera.isDragging = true;
            camera.lastX = e.touches[0].clientX;
            camera.lastY = e.touches[0].clientY;
            clickStartX = e.touches[0].clientX;
            clickStartY = e.touches[0].clientY;
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
            if (camera.touchPinchDist > 0) {
                const factor = dist / camera.touchPinchDist;
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                zoomToPoint(midX, midY, factor);
            }
            camera.touchPinchDist = dist;
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (camera.isDragging && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            if (Math.hypot(touch.clientX - clickStartX, touch.clientY - clickStartY) < 15) {
                checkHomeClick(touch.clientX, touch.clientY);
            }
        }
        camera.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.06 : 0.94;
        zoomToPoint(e.clientX, e.clientY, factor);
    }, { passive: false });
}

// Проверка клика по оранжевому дому / треугольнику
function checkHomeClick(clickX, clickY) {
    const homePos = getPlayerHomeScreenPos();
    const clickDist = Math.hypot(clickX - homePos.x, clickY - homePos.y);

    // Радиус клика с учетом масштаба
    if (clickDist < 60 * camera.zoom || clickDist < 45) {
        apartmentScreen.classList.remove('hidden');
    }
}

function zoomToPoint(focalX, focalY, factor) {
    const oldZoom = camera.zoom;
    let newZoom = camera.zoom * factor;

    newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));
    if (newZoom === oldZoom) return;

    const scale = newZoom / oldZoom;
    camera.x = focalX - (focalX - camera.x) * scale;
    camera.y = focalY - (focalY - camera.y) * scale;
    camera.zoom = newZoom;

    clampCamera();
        }
