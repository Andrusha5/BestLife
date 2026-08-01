// =========================================================
// BESTLIFE - FULL MAP ENGINE WITH REALISTIC LAYERED TRAFFIC
// =========================================================

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    minZoom: 0.25,
    maxZoom: 2.2,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

let animTimer = 0;

// Загрузка цельной картинки карты города
// Движок проверяет city_map.png, затем map.png, затем gazon.png
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

// --- ДОРОЖНЫЕ ТРАССЫ И СИСТЕМА СЛОЕВ МАШИН ---
// Дороги задаются точными линиями [startX, startY, endX, endY] в нормализованных координатах [0..1]
const ROAD_LANES = [
    // Главный проспект (слева-направо)
    { startX: 0.05, startY: 0.28, endX: 0.95, endY: 0.73, angle: 26, isBehindHouse: false },
    // Поперечная улица (сверху-вниз)
    { startX: 0.28, startY: 0.05, endX: 0.75, endY: 0.92, angle: -62, isBehindHouse: false },
    // Задняя улица (проходит ЗА домами - машины прячутся за фасадами)
    { startX: 0.15, startY: 0.12, endX: 0.85, endY: 0.48, angle: 26, isBehindHouse: true }
];

// Зоны домов (машины прячутся за ними)
const HOUSE_OCCLUSION_ZONES = [
    { x: 0.12, y: 0.38, w: 0.22, h: 0.25 },
    { x: 0.38, y: 0.18, w: 0.25, h: 0.22 },
    { x: 0.50, y: 0.42, w: 0.22, h: 0.22 }
];

const CARS = [];

function initCars() {
    CARS.length = 0;
    const carColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#f8fafc', '#8b5cf6', '#dc2626'];

    ROAD_LANES.forEach((lane, laneIdx) => {
        for (let i = 0; i < 3; i++) {
            CARS.push({
                laneIdx: laneIdx,
                progress: (i / 3) + Math.random() * 0.1,
                speed: 0.0015 + Math.random() * 0.001,
                color: carColors[Math.floor(Math.random() * carColors.length)],
                length: 18,
                width: 10
            });
        }
    });
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
    initCars();
    setupControls();
    
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

    const fitZoomX = (canvas.clientWidth * 0.95) / mapW;
    const fitZoomY = (canvas.clientHeight * 0.95) / mapH;
    
    camera.minZoom = Math.max(0.2, Math.min(fitZoomX, fitZoomY));
    camera.zoom = Math.min(Math.max(fitZoomX, fitZoomY), 0.6);
    
    camera.x = canvas.clientWidth / 2;
    camera.y = canvas.clientHeight / 2;
    clampCamera();
}

function clampCamera() {
    const map = getMapDimensions();
    const halfW = map.w / 2;
    const halfH = map.h / 2;

    const viewW = canvas.clientWidth;
    const viewH = canvas.clientHeight;

    if (map.w > viewW) {
        camera.x = Math.max(viewW - halfW, Math.min(halfW, camera.x));
    } else {
        camera.x = viewW / 2;
    }

    if (map.h > viewH) {
        camera.y = Math.max(viewH - halfH, Math.min(halfH, camera.y));
    } else {
        camera.y = viewH / 2;
    }
}

// Поддержка HiDPI / Retina для безупречной чёткости
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
        updateCars();
        render();
        requestAnimationFrame(renderLoop);
    }
}

function updateCars() {
    CARS.forEach(car => {
        car.progress += car.speed;
        if (car.progress > 1.0) {
            car.progress = 0.0;
        }
    });
}

// ------------------------------------------
// ПОСЛОЙНЫЙ РЕНДЕР КАРТЫ И МАТЕРИАЛОВ
// ------------------------------------------
function render() {
    const viewW = canvas.clientWidth;
    const viewH = canvas.clientHeight;
    ctx.clearRect(0, 0, viewW, viewH);

    // Включаем самое высокое качество фильтрации
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const map = getMapDimensions();
    const mapLeft = camera.x - map.w / 2;
    const mapTop = camera.y - map.h / 2;

    // СЛОЙ 1: Цельная карта города
    if (isMapLoaded) {
        ctx.drawImage(mapImg, mapLeft, mapTop, map.w, map.h);
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mapLeft, mapTop, map.w, map.h);
    }

    // СЛОЙ 2: Машинки, едущие по дорогам (с укрытием за домами)
    drawLayeredCars(mapLeft, mapTop, map.w, map.h);

    // СЛОЙ 3: Неоновый указатель над домом игрока
    drawHomePointer(mapLeft, mapTop, map.w, map.h);
}

// Рисование машин с укрытием за домами
function drawLayeredCars(mapLeft, mapTop, mapW, mapH) {
    CARS.forEach(car => {
        const lane = ROAD_LANES[car.laneIdx];
        
        const rx = lane.startX + (lane.endX - lane.startX) * car.progress;
        const ry = lane.startY + (lane.endY - lane.startY) * car.progress;

        let isHiddenBehindHouse = lane.isBehindHouse;
        
        if (!isHiddenBehindHouse) {
            HOUSE_OCCLUSION_ZONES.forEach(zone => {
                if (rx >= zone.x && rx <= zone.x + zone.w && ry >= zone.y && ry <= zone.y + zone.h) {
                    isHiddenBehindHouse = true;
                }
            });
        }

        // Если машина проезжает за домом — она прячется за фасадом
        if (isHiddenBehindHouse) return;

        const cx = mapLeft + rx * mapW;
        const cy = mapTop + ry * mapH;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((lane.angle * Math.PI) / 180);

        const cw = car.length * camera.zoom;
        const ch = car.width * camera.zoom;

        // Тень машины
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(-cw / 2, ch / 2 - 1, cw, ch / 2.5);

        // Кузов
        ctx.fillStyle = car.color;
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch);

        // Стекло
        ctx.fillStyle = '#bfdbfe';
        ctx.fillRect(cw / 6, -ch / 2 + 1, cw / 3, ch - 2);

        // Фары
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cw / 2 - 1, -ch / 2 + 1, 2 * camera.zoom, 2 * camera.zoom);
        ctx.fillRect(cw / 2 - 1, ch / 2 - 3, 2 * camera.zoom, 2 * camera.zoom);

        ctx.restore();
    });
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
