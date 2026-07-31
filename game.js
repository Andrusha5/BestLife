// =========================================================
// BESTLIFE - HD VECTOR ISOMETRIC CITY ENGINE
// =========================================================

const GRID_SIZE = 16;
const TILE_WIDTH = 130;
const TILE_HEIGHT = 65;
const MAP_DATA = [];

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.55,
    minZoom: 0.35,
    maxZoom: 1.8,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

// Оранжевый дом игрока (сетка r: 6, c: 3)
const PLAYER_HOME = { r: 6, c: 3 };
let animTimer = 0;

// Живые объекты
const CARS = [];
const PEDESTRIANS = [];

// Генерация изометрического города
function generateCityMap() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            if (c === 9 || c === 10) {
                MAP_DATA[r][c] = { type: 'water' };
            } else if (r === 4 || r === 11 || c === 3 || c === 13) {
                MAP_DATA[r][c] = { type: 'road' };
            } else if (r === PLAYER_HOME.r && c === PLAYER_HOME.c) {
                MAP_DATA[r][c] = { type: 'player_home', height: 75, wallColor: '#ea580c', roofColor: '#c2410c' };
            } else {
                const seed = (r * 17 + c * 29) % 100;
                if (seed < 18) {
                    MAP_DATA[r][c] = { type: 'park' };
                } else if (seed < 48) {
                    MAP_DATA[r][c] = { type: 'house', height: 55, wallColor: '#e2e8f0', roofColor: '#b91c1c' };
                } else if (seed < 78) {
                    MAP_DATA[r][c] = { type: 'office', height: 100, wallColor: '#334155', roofColor: '#0284c7' };
                } else {
                    MAP_DATA[r][c] = { type: 'skyscraper', height: 160, wallColor: '#1e293b', roofColor: '#38bdf8' };
                }
            }
        }
    }

    initTrafficAndPeople();
}

// Полноценный спавн машин и пешеходов
function initTrafficAndPeople() {
    CARS.length = 0;
    PEDESTRIANS.length = 0;

    const carColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#f8fafc', '#475569', '#8b5cf6'];
    
    // Машинки едут строго по полосам дорог
    for (let i = 0; i < 12; i++) {
        const isHorizontal = i % 2 === 0;
        const r = isHorizontal ? (i < 6 ? 4 : 11) : Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        const c = !isHorizontal ? (i < 6 ? 3 : 13) : Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;

        CARS.push({
            r: r,
            c: c,
            progress: Math.random(),
            dir: isHorizontal ? 'C' : 'R',
            speed: 0.003 + Math.random() * 0.003,
            color: carColors[Math.floor(Math.random() * carColors.length)],
            type: Math.random() > 0.3 ? 'sedan' : 'bus'
        });
    }

    // Пешеходы на тротуарах
    for (let i = 0; i < 18; i++) {
        PEDESTRIANS.push({
            r: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
            c: Math.floor(Math.random() * (GRID_SIZE - 2)) + 1,
            offsetX: (Math.random() - 0.5) * 0.5,
            offsetY: (Math.random() - 0.5) * 0.5,
            dirX: (Math.random() - 0.5) * 0.006,
            dirY: (Math.random() - 0.5) * 0.006,
            shirt: carColors[Math.floor(Math.random() * carColors.length)],
            pants: '#1e293b',
            walkFrame: Math.random() * 10
        });
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

setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

document.getElementById('btn-play').addEventListener('click', () => {
    const savedGender = localStorage.getItem('bestlife_gender');
    if (!savedGender) genderModal.classList.remove('hidden');
    else launchGame();
});

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

document.getElementById('btn-exit-apartment').addEventListener('click', () => {
    apartmentScreen.classList.add('hidden');
});

function launchGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    generateCityMap();
    resizeCanvas();
    fitAndCenterMap();
    setupControls();
    
    requestAnimationFrame(renderLoop);
}

function getMapDimensions() {
    return { w: GRID_SIZE * TILE_WIDTH * camera.zoom, h: GRID_SIZE * TILE_HEIGHT * camera.zoom };
}

function fitAndCenterMap() {
    const fitZoomX = (canvas.width * 0.9) / (GRID_SIZE * TILE_WIDTH);
    const fitZoomY = (canvas.height * 0.9) / (GRID_SIZE * TILE_HEIGHT);
    
    camera.minZoom = Math.max(0.35, Math.min(fitZoomX, fitZoomY));
    camera.zoom = Math.min(Math.max(fitZoomX, fitZoomY), 0.55);
    
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
        animTimer += 0.04;
        updateEntities();
        render();
        requestAnimationFrame(renderLoop);
    }
}

function updateEntities() {
    CARS.forEach(car => {
        car.progress += car.speed;
        if (car.progress >= 1) {
            car.progress = 0;
            if (car.dir === 'C') car.r = (car.r + 1) % GRID_SIZE;
            else car.c = (car.c + 1) % GRID_SIZE;
        }
    });

    PEDESTRIANS.forEach(p => {
        p.offsetX += p.dirX;
        p.offsetY += p.dirY;
        p.walkFrame += 0.12;

        if (Math.abs(p.offsetX) > 0.6 || Math.abs(p.offsetY) > 0.6) {
            p.dirX *= -1;
            p.dirY *= -1;
        }
    });
}

function isoToScreen(r, c) {
    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;
    const map = getMapDimensions();
    const startX = camera.x;
    const startY = camera.y - map.h / 2;

    return {
        x: (c - r) * (w / 2) + startX,
        y: (c + r) * (h / 2) + startY
    };
}

// ------------------------------------------
// ВЕКТОРНЫЙ ОТРИСОВЩИК ДВИЖКА (HD HD)
// ------------------------------------------
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const pos = isoToScreen(r, c);
            const tile = MAP_DATA[r][c];

            // 1. Поверхность (Дорога, Газон, Вода)
            drawTileBase(pos.x, pos.y, w, h, tile);

            // 2. Пешеходы
            drawPedestriansOnTile(r, c, pos.x, pos.y, w, h);

            // 3. Настоящие 3D Машинки
            drawCarsOnTile(r, c, w, h);

            // 4. Текстурные дома
            if (tile.height) {
                if (tile.type === 'player_home') {
                    drawPlayerOrangeHome(pos.x, pos.y, w, h, tile);
                } else {
                    drawDetailedBuilding(pos.x, pos.y, w, h, tile);
                }
            }
        }
    }

    // 5. Стрелка над оранжевым домом
    drawHomePointer();
}

function drawTileBase(x, y, w, h, tile) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath();

    if (tile.type === 'road') {
        // Темный качественный асфальт
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Белая сплошная / двойная прерывистая разметка
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5 * camera.zoom;
        ctx.setLineDash([5 * camera.zoom, 5 * camera.zoom]);
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y + h / 4);
        ctx.lineTo(x + w / 4, y + h * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (tile.type === 'water') {
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
    } else if (tile.type === 'park') {
        ctx.fillStyle = '#10b981';
        ctx.fill();
        // Объемное дерево с несколькими слоями листвы
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(x, y + h / 2 - 4 * camera.zoom, 9 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(x - 2 * camera.zoom, y + h / 2 - 6 * camera.zoom, 6 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Зеленый насыщенный газон
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// ОРАНЖЕВЫЙ ДОМ ИГРОКА (ТОЧНАЯ КОПИЯ СО СКРИНШОТА)
function drawPlayerOrangeHome(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    // Левая фасадная стена (Оранжевая)
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.strokeStyle = '#9a3412';
    ctx.stroke();

    // Правая стена
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = '#c2410c';
    ctx.fill();
    ctx.stroke();

    // Белые балкончики и окна
    const floors = 4;
    for (let f = 1; f <= floors; f++) {
        const wy = (y + h * 0.8) - f * (13 * camera.zoom);
        
        // Балконы с поручнями
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w / 3, wy, 10 * camera.zoom, 6 * camera.zoom);
        ctx.fillRect(x + w / 8, wy, 10 * camera.zoom, 6 * camera.zoom);

        // Окна
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x - w / 3 + 2 * camera.zoom, wy + 1 * camera.zoom, 6 * camera.zoom, 4 * camera.zoom);
        ctx.fillRect(x + w / 8 + 2 * camera.zoom, wy + 1 * camera.zoom, 6 * camera.zoom, 4 * camera.zoom);
    }

    // Входная группа (Дверь и козырек)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 4 * camera.zoom, y + h - 10 * camera.zoom, 8 * camera.zoom, 9 * camera.zoom);

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2 * camera.zoom;
    ctx.stroke();
}

// Обычные красивейшие дома
function drawDetailedBuilding(x, y, w, h, tile) {
    const bh = tile.height * camera.zoom;

    // Левая грань
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -10);
    ctx.fill();

    // Правая грань
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.wallColor, -30);
    ctx.fill();

    // Окна со светящимся градиентом
    drawWindows(x, y, w, h, bh);

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.roofColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1 * camera.zoom;
    ctx.stroke();
}

function drawWindows(x, y, w, h, bh) {
    if (bh < 35 * camera.zoom) return;
    const floors = Math.floor(bh / (15 * camera.zoom));

    for (let f = 1; f < floors; f++) {
        const wy = (y + h * 0.75) - f * (13 * camera.zoom) - bh + (12 * camera.zoom);
        
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(x - w / 3, wy, 7 * camera.zoom, 5 * camera.zoom);
        ctx.fillRect(x + w / 6, wy, 7 * camera.zoom, 5 * camera.zoom);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8 * camera.zoom;
        ctx.strokeRect(x - w / 3, wy, 7 * camera.zoom, 5 * camera.zoom);
        ctx.strokeRect(x + w / 6, wy, 7 * camera.zoom, 5 * camera.zoom);
    }
}

// 3D ИЗОМЕТРИЧЕСКИЕ МАШИНЫС ФАРАМИ И КОЛЕСАМИ
function drawCarsOnTile(r, c, w, h) {
    CARS.forEach(car => {
        if (Math.floor(car.r) === r && Math.floor(car.c) === c) {
            const pos = isoToScreen(car.r + (car.dir === 'R' ? car.progress : 0), car.c + (car.dir === 'C' ? car.progress : 0));
            const cw = 18 * camera.zoom;
            const ch = 10 * camera.zoom;
            const cx = pos.x;
            const cy = pos.y + h / 2 - 2 * camera.zoom;

            // Тень под машиной
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + ch / 2, cw / 1.8, ch / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Кузов автомобиля
            ctx.fillStyle = car.color;
            ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);

            // Лобовое стекло
            ctx.fillStyle = '#bfdbfe';
            ctx.fillRect(cx - cw / 4, cy - ch / 3, cw / 2, ch / 1.8);

            // Светящиеся фары
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx + cw / 2 - 2 * camera.zoom, cy - ch / 3, 2 * camera.zoom, 3 * camera.zoom);

            // Колеса
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - cw / 2.2, cy + ch / 2.5, 3 * camera.zoom, 2 * camera.zoom);
            ctx.fillRect(cx + cw / 3, cy + ch / 2.5, 3 * camera.zoom, 2 * camera.zoom);
        }
    });
}

// ПЕШЕХОДЫ НА ТРОТУАРАХ
function drawPedestriansOnTile(r, c, baseX, baseY, w, h) {
    PEDESTRIANS.forEach(p => {
        if (p.r === r && p.c === c) {
            const px = baseX + p.offsetX * (w / 2);
            const py = baseY + h / 2 + p.offsetY * (h / 2);
            const size = 3 * camera.zoom;

            // Тень
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.arc(px, py + size, size, 0, Math.PI * 2);
            ctx.fill();

            // Голова
            ctx.fillStyle = '#ffdbac';
            ctx.beginPath();
            ctx.arc(px, py - size * 2.8, size, 0, Math.PI * 2);
            ctx.fill();

            // Одежда
            ctx.fillStyle = p.shirt;
            ctx.fillRect(px - size / 1.5, py - size * 1.8, size * 1.3, size * 1.8);

            // Ноги
            ctx.fillStyle = p.pants;
            const legShift = Math.sin(p.walkFrame) * (1.5 * camera.zoom);
            ctx.fillRect(px - size / 2 + legShift, py, size / 2, size * 1.2);
            ctx.fillRect(px + legShift / 2, py, size / 2, size * 1.2);
        }
    });
}

// Крупный неоновый указатель над оранжевым домом
function drawHomePointer() {
    const homePos = isoToScreen(PLAYER_HOME.r, PLAYER_HOME.c);
    const offsetY = Math.sin(animTimer * 1.5) * 8;
    
    const indX = homePos.x;
    const indY = homePos.y - 55 * camera.zoom + offsetY;

    ctx.save();

    const width = Math.max(22, 28 * camera.zoom);
    const height = Math.max(26, 32 * camera.zoom);

    ctx.beginPath();
    ctx.moveTo(indX, indY + height / 2);
    ctx.lineTo(indX - width / 2, indY - height / 2);
    ctx.lineTo(indX + width / 2, indY - height / 2);
    ctx.closePath();

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2.5, 3 * camera.zoom);
    ctx.stroke();

    ctx.restore();
}

function adjustColor(col, amt) {
    let num = parseInt(col.replace('#', ''), 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return "#" + (g | (b << 8) | (r << 16)).toString(16);
}

// УПРАВЛЕНИЕ КАРТОЙ И КЛИКИ
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
        if (Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY) < 10) {
            checkHomeClick(e.clientX, e.clientY);
        }
    });

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

function checkHomeClick(clickX, clickY) {
    const homePos = isoToScreen(PLAYER_HOME.r, PLAYER_HOME.c);
    const clickDist = Math.hypot(clickX - homePos.x, clickY - homePos.y);

    if (clickDist < 65 * camera.zoom || clickDist < 45) {
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
