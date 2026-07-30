// ==========================================
// BESTLIFE - 2D LIFE SIMULATOR ENGINE
// ==========================================

// Состояние игры
const state = {
    money: 1000,
    energy: 100,
    food: 80,
    rotation: 0 // Угол поворота карты: 0, 1 (90°), 2 (180°), 3 (270°)
};

// Конфигурация карты
const GRID_SIZE = 16;
const TILE_WIDTH = 100;
const TILE_HEIGHT = 50;

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    isDragging: false,
    startX: 0,
    startY: 0
};

// Типы зданий и объектов
const MAP_DATA = [];

// Инициализация карты (размещение дорог, домов, небоскребов и реки)
function generateMap() {
    for (let r = 0; r < GRID_SIZE; r++) {
        MAP_DATA[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            // Река через карту
            if (c === 7 || c === 8) {
                MAP_DATA[r][c] = { type: 'water', name: 'Река' };
            } 
            // Дороги
            else if (r === 4 || r === 11 || c === 3 || c === 12) {
                MAP_DATA[r][c] = { type: 'road', name: 'Дорога' };
            } 
            // Дома и здания
            else if (r === 1 && c === 1) {
                MAP_DATA[r][c] = { type: 'home', name: 'Мой Дом', desc: 'Здесь можно отдохнуть и восстановить энергию.', color: '#4ba3e3', height: 40 };
            } else if (r === 2 && c === 5) {
                MAP_DATA[r][c] = { type: 'office', name: 'Бизнес-Центр', desc: 'Здесь вы работаете и зарабатываете деньги.', color: '#f39c12', height: 110 };
            } else if (r === 6 && c === 1) {
                MAP_DATA[r][c] = { type: 'cafe', name: 'Кафе / Ресторан', desc: 'Здесь можно вкусно поесть и восстановить сытость.', color: '#e74c3c', height: 55 };
            } else if (r === 9 && c === 14) {
                MAP_DATA[r][c] = { type: 'factory', name: 'Завод', desc: 'Производственный комплекс для работы.', color: '#9b59b6', height: 80 };
            } else if (r === 13 && c === 6) {
                MAP_DATA[r][c] = { type: 'skyscraper', name: 'Небоскреб', desc: 'Элитный жилой комплекс.', color: '#2ecc71', height: 140 };
            } else {
                // Трава / Парки
                MAP_DATA[r][c] = { type: 'grass', name: 'Газон' };
            }
        }
    }
}

// Элементы DOM
const introScreen = document.getElementById('intro-screen');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const settingsModal = document.getElementById('settings-modal');
const buildingModal = document.getElementById('building-modal');

// Запуск Нитро и переход в Меню
setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

// События меню
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btn-close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
document.getElementById('btn-close-building').addEventListener('click', () => buildingModal.classList.add('hidden'));

document.getElementById('btn-rotate').addEventListener('click', () => {
    state.rotation = (state.rotation + 1) % 4;
    render();
});

document.getElementById('btn-reset-cam').addEventListener('click', resetCamera);

function startGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    resizeCanvas();
    generateMap();
    resetCamera();
    setupControls();
    
    requestAnimationFrame(gameLoop);
}

function resetCamera() {
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 4;
    camera.zoom = 1;
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

// ------------------------------------------
// ИЗОМЕТРИЧЕСКИЙ РЕНДЕР КАРТЫ
// ------------------------------------------
function getRotatedCoords(r, c) {
    if (state.rotation === 0) return { r, c };
    if (state.rotation === 1) return { r: c, c: GRID_SIZE - 1 - r };
    if (state.rotation === 2) return { r: GRID_SIZE - 1 - r, c: GRID_SIZE - 1 - c };
    return { r: GRID_SIZE - 1 - c, c: r };
}

function isoToScreen(r, c) {
    const rot = getRotatedCoords(r, c);
    const x = (rot.c - rot.r) * (TILE_WIDTH / 2) * camera.zoom + camera.x;
    const y = (rot.c + rot.r) * (TILE_HEIGHT / 2) * camera.zoom + camera.y;
    return { x, y };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка плиток карты
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const pos = isoToScreen(r, c);
            const tile = MAP_DATA[r][c];

            drawIsoTile(pos.x, pos.y, tile);

            // Если есть здание — рисуем его объём
            if (tile.height) {
                drawBuilding(pos.x, pos.y, tile);
            }
        }
    }
}

// Отрисовка тайла земли/реки/дороги
function drawIsoTile(x, y, tile) {
    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath();

    if (tile.type === 'grass') ctx.fillStyle = '#55af3a';
    else if (tile.type === 'water') ctx.fillStyle = '#2980b9';
    else if (tile.type === 'road') ctx.fillStyle = '#4a5568';
    else ctx.fillStyle = '#38a169';

    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();
}

// Отрисовка 3D Здания
function drawBuilding(x, y, tile) {
    const w = TILE_WIDTH * camera.zoom;
    const h = TILE_HEIGHT * camera.zoom;
    const bh = tile.height * camera.zoom;

    // Левая грань
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.color, -20);
    ctx.fill();
    ctx.stroke();

    // Правая грань
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.closePath();
    ctx.fillStyle = adjustColor(tile.color, -40);
    ctx.fill();
    ctx.stroke();

    // Крыша
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x + w / 2, y + h / 2 - bh);
    ctx.lineTo(x, y + h - bh);
    ctx.lineTo(x - w / 2, y + h / 2 - bh);
    ctx.closePath();
    ctx.fillStyle = tile.color;
    ctx.fill();
    ctx.stroke();
}

// Помощник регулировки цвета граней
function adjustColor(col, amt) {
    let usePound = false;
    if (col[0] == "#") { col = col.slice(1); usePound = true; }
    let num = parseInt(col, 16);
    let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
}

// ------------------------------------------
// УПРАВЛЕНИЕ: ДВИЖЕНИЕ КАРТЫ И КЛИКИ
// ------------------------------------------
function setupControls() {
    canvas.addEventListener('mousedown', (e) => {
        camera.isDragging = true;
        camera.startX = e.clientX - camera.x;
        camera.startY = e.clientY - camera.y;
    });

    window.addEventListener('mousemove', (e) => {
        if (camera.isDragging) {
            camera.x = e.clientX - camera.startX;
            camera.y = e.clientY - camera.startY;
            render();
        }
    });

    window.addEventListener('mouseup', () => {
        camera.isDragging = false;
    });

    // Масштабирование колесиком мыши
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        if (camera.zoom * zoomFactor >= 0.5 && camera.zoom * zoomFactor <= 2.2) {
            camera.zoom *= zoomFactor;
            render();
        }
    });

    // Клик по зданиям
    canvas.addEventListener('click', (e) => {
        // Простая проверка выборки клика по зданиям
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tile = MAP_DATA[r][c];
                if (tile.height) {
                    const pos = isoToScreen(r, c);
                    const dist = Math.hypot(e.clientX - pos.x, e.clientY - (pos.y - tile.height / 2));
                    if (dist < 35 * camera.zoom) {
                        openBuildingMenu(tile);
                        return;
                    }
                }
            }
        }
    });
}

// Открытие модального окна здания
function openBuildingMenu(tile) {
    document.getElementById('b-title').innerText = tile.name;
    document.getElementById('b-desc').innerText = tile.desc;

    const actionsBox = document.getElementById('b-actions');
    actionsBox.innerHTML = '';

    if (tile.type === 'home') {
        actionsBox.innerHTML = `<button class="act-btn" onclick="doAction('rest')">💤 Отдохнуть (+30 Энергии)</button>`;
    } else if (tile.type === 'office' || tile.type === 'factory') {
        actionsBox.innerHTML = `<button class="act-btn" onclick="doAction('work')">💼 Работать (+250$, -20 Энергии)</button>`;
    } else if (tile.type === 'cafe') {
        actionsBox.innerHTML = `<button class="act-btn" onclick="doAction('eat')">🍕 Покушать (-50$, +40 Сытости)</button>`;
    } else {
        actionsBox.innerHTML = `<button class="act-btn" onclick="doAction('visit')">Осмотреть здание</button>`;
    }

    buildingModal.classList.remove('hidden');
}

// Действия персонажа
window.doAction = function(act) {
    if (act === 'work') {
        if (state.energy >= 20) {
            state.money += 250;
            state.energy -= 20;
            alert('Вы поработали и заработали 250$!');
        } else {
            alert('Недостаточно энергии! Сходите домой отдохнуть.');
        }
    } else if (act === 'rest') {
        state.energy = Math.min(100, state.energy + 30);
        alert('Вы хорошо отдохнули!');
    } else if (act === 'eat') {
        if (state.money >= 50) {
            state.money -= 50;
            state.food = Math.min(100, state.food + 40);
            alert('Вы вкусно покушали!');
        } else {
            alert('Не хватает денег на еду!');
        }
    }

    updateHUD();
    buildingModal.classList.add('hidden');
};

function updateHUD() {
    document.getElementById('val-money').innerText = state.money.toLocaleString();
    document.getElementById('val-energy').innerText = state.energy;
    document.getElementById('val-food').innerText = state.food;
}

function gameLoop() {
    render();
                }
