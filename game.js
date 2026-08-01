// =========================================================
// BESTLIFE - FULL MAP ENGINE WITH CLASH OF CLANS FOREST & TIME
// =========================================================

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    minZoom: 0.22,
    maxZoom: 2.2,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

let animTimer = 0;

// Загрузка цельной карты города (city_map.png, map.png или gazon.png)
const mapImg = new Image();
let isMapLoaded = false;

const possibleMapSources = ['city_map.png', 'map.png', 'gazon.png'];
let sourceIndex = 0;

function tryLoadNextMapSource() {
    if (sourceIndex >= possibleMapSources.length) return;
    mapImg.src = possibleMapSources[sourceIndex];
}

mapImg.onload = () => {
    isMapLoaded = true;
    if (!gameScreen.classList.contains('hidden')) {
        fitAndCenterMap();
        render();
    }
};

mapImg.onerror = () => {
    sourceIndex++;
    tryLoadNextMapSource();
};

tryLoadNextMapSource();

// --- 🕒 СИСТЕМА ИГРОВОГО ВРЕМЕНИ И ДАТЫ ---
// 10 реальных минут = 24 игровых часа (1 день).
// 10 минут = 600 секунд -> 1440 игровых минут за 600 сек -> 2.4 игр. мин/сек.
let gameMinutes = 0; 
let currentDay = 1;
let currentMonthIdx = 4; // Май (индекс 4)

const MONTH_NAMES = ['янв', 'февр', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];
const DAYS_IN_MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Загрузка сохраненного времени из localStorage
function loadSavedTime() {
    const saved = localStorage.getItem('bestlife_time_data');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            gameMinutes = parsed.minutes || 0;
            currentDay = parsed.day || 1;
            currentMonthIdx = parsed.monthIdx !== undefined ? parsed.monthIdx : 4;
        } catch(e) {}
    }
}

function saveTimeData() {
    localStorage.setItem('bestlife_time_data', JSON.stringify({
        minutes: gameMinutes,
        day: currentDay,
        monthIdx: currentMonthIdx
    }));
}

loadSavedTime();

let lastFrameTime = performance.now();

function updateGameClock() {
    const now = performance.now();
    const dt = (now - lastFrameTime) / 1000; // секунды
    lastFrameTime = now;

    if (!gameScreen.classList.contains('hidden')) {
        // За 1 секунду реальности проходит 2.4 игровых минуты
        gameMinutes += dt * 2.4;

        if (gameMinutes >= 1440) { // Прошел 1 день
            gameMinutes -= 1440;
            currentDay++;

            if (currentDay > DAYS_IN_MONTHS[currentMonthIdx]) {
                currentDay = 1;
                currentMonthIdx = (currentMonthIdx + 1) % 12;
            }
            saveTimeData();
        }

        updateClockUI();
    }
}

function updateClockUI() {
    const hours = Math.floor(gameMinutes / 60);
    const mins = Math.floor(gameMinutes % 60);

    const timeStr = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    const dateStr = currentDay + ' ' + MONTH_NAMES[currentMonthIdx];

    const dateElem = document.getElementById('hud-date-text');
    const clockElem = document.getElementById('hud-clock-text');

    if (dateElem && dateElem.textContent !== dateStr) dateElem.textContent = dateStr;
    if (clockElem && clockElem.textContent !== timeStr) clockElem.textContent = timeStr;
}

// DOM Элементы
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
    
    resizeCanvas();
    fitAndCenterMap();
    setupControls();
    
    lastFrameTime = performance.now();
    requestAnimationFrame(renderLoop);
}

function getMapDimensions() {
    const w = (isMapLoaded ? mapImg.naturalWidth || mapImg.width : 2000) * camera.zoom;
    const h = (isMapLoaded ? mapImg.naturalHeight || mapImg.height : 2000) * camera.zoom;
    return { w, h };
}

function fitAndCenterMap() {
    const mapW = isMapLoaded ? mapImg.naturalWidth || mapImg.width : 2000;
    const mapH = isMapLoaded ? mapImg.naturalHeight || mapImg.height : 2000;

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    const fitZoomX = (viewW * 0.92) / mapW;
    const fitZoomY = (viewH * 0.92) / mapH;
    
    camera.minZoom = Math.max(0.2, Math.min(fitZoomX, fitZoomY));
    camera.zoom = Math.min(Math.max(fitZoomX, fitZoomY), 0.55);
    
    camera.x = viewW / 2;
    camera.y = viewH / 2;
    clampCamera();
}

// Ограничение камеры в стиле Clash of Clans (видны только загородные леса)
function clampCamera() {
    const map = getMapDimensions();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Расширенные границы, позволяющие видеть пышный лес вокруг города
    const maxOffsetW = map.w * 0.35;
    const maxOffsetH = map.h * 0.35;

    camera.x = Math.max(viewW / 2 - maxOffsetW, Math.min(viewW / 2 + maxOffsetW, camera.x));
    camera.y = Math.max(viewH / 2 - maxOffsetH, Math.min(viewH / 2 + maxOffsetH, camera.y));
}

// Поддержка HiDPI / Retina для максимальной чёткости
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.resetTransform();
    ctx.scale(dpr, dpr);
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
        updateGameClock();
        render();
        requestAnimationFrame(renderLoop);
    }
}

// ------------------------------------------
// РЕНДЕР КАРТЫ И ОКУТАЮЩИХ ЛЕСОВ (CLASH OF CLANS)
// ------------------------------------------
function render() {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    ctx.clearRect(0, 0, viewW, viewH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const map = getMapDimensions();
    const mapLeft = camera.x - map.w / 2;
    const mapTop = camera.y - map.h / 2;

    // СЛОЙ 0: Густой лесной покров вокруг карты (в стиле Clash of Clans)
    drawClashForestBackground(viewW, viewH, mapLeft, mapTop, map.w, map.h);

    // СЛОЙ 1: Цельная карта города
    if (isMapLoaded) {
        ctx.drawImage(mapImg, mapLeft, mapTop, map.w, map.h);
    }

    // СЛОЙ 2: Плавная тень/граница перехода к лесу
    drawMapForestBorderShadow(mapLeft, mapTop, map.w, map.h);

    // СЛОЙ 3: Неоновый указатель над домом игрока
    drawHomePointer(mapLeft, mapTop, map.w, map.h);
}

// Отрисовка загородного бесконечного леса в стиле Clash of Clans
function drawClashForestBackground(viewW, viewH, mapLeft, mapTop, mapW, mapH) {
    // Базовый сочный травосборник
    ctx.fillStyle = '#143317';
    ctx.fillRect(0, 0, viewW, viewH);

    // Рисуем кроны густых вечнозеленых деревьев по всему фону за пределами города
    const treeRadius = Math.max(16, 22 * camera.zoom);
    const step = treeRadius * 1.5;

    ctx.fillStyle = '#112913'; // Теневой слой леса
    for (let x = -step; x < viewW + step; x += step) {
        for (let y = -step; y < viewH + step; y += step) {
            // Рисуем деревья только вокруг города
            if (x < mapLeft - 10 || x > mapLeft + mapW + 10 || y < mapTop - 10 || y > mapTop + mapH + 10) {
                ctx.beginPath();
                ctx.arc(x, y, treeRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.fillStyle = '#19421c'; // Верхний светлый слой крон
    for (let x = -step + 5; x < viewW + step; x += step) {
        for (let y = -step + 5; y < viewH + step; y += step) {
            if (x < mapLeft - 10 || x > mapLeft + mapW + 10 || y < mapTop - 10 || y > mapTop + mapH + 10) {
                ctx.beginPath();
                ctx.arc(x - 3, y - 3, treeRadius * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// Тень по краям карты для бесшовного объединения с лесом
function drawMapForestBorderShadow(mapLeft, mapTop, mapW, mapH) {
    ctx.strokeStyle = '#0e210f';
    ctx.lineWidth = Math.max(6, 12 * camera.zoom);
    ctx.strokeRect(mapLeft, mapTop, mapW, mapH);
}

function getHomePos(mapLeft, mapTop, mapW, mapH) {
    return {
        x: mapLeft + mapW * 0.18,
        y: mapTop + mapH * 0.28
    };
}

function drawHomePointer(mapLeft, mapTop, mapW, mapH) {
    const home = getHomePos(mapLeft, mapTop, mapW, mapH);
    const offsetY = Math.sin(animTimer * 1.5) * 8;
    
    const indX = home.x;
    const indY = home.y - 45 * camera.zoom + offsetY;

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
    const map = getMapDimensions();
    const mapLeft = camera.x - map.w / 2;
    const mapTop = camera.y - map.h / 2;
    const home = getHomePos(mapLeft, mapTop, map.w, map.h);

    const clickDist = Math.hypot(clickX - home.x, clickY - home.y);

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
