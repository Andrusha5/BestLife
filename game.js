// =========================================================
// BESTLIFE - FULL MAP VISIBLE + PRECISE DISTRICT POSITIONS
// =========================================================

// Камера - полностью переработана для видимости всей карты
const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    minZoom: 0.1,
    maxZoom: 4.0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

let animTimer = 0;
let isGameRunning = false;
let mapNaturalWidth = 2000;
let mapNaturalHeight = 2000;

// Загрузка базовой карты gazon.png
const gazonImg = new Image();
let isGazonLoaded = false;
gazonImg.src = 'gazon.png';
gazonImg.onload = () => {
    isGazonLoaded = true;
    mapNaturalWidth = gazonImg.width;
    mapNaturalHeight = gazonImg.height;
    if (isGameRunning) {
        fitAndCenterMap();
        render();
    }
};

// Районы - ИСПРАВЛЕННЫЕ КООРДИНАТЫ
const DISTRICTS = [
    { 
        id: 'rayon1', 
        src: 'assets/rayon1.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.045,
        anchorY: 0.200,
        scaleW: 0.250,
        scaleH: 0.170
    },
    { 
        id: 'rayon2', 
        src: 'assets/rayon2.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.008,
        anchorY: 0.350,
        scaleW: 0.290,
        scaleH: 0.175
    },
    { 
        id: 'rayon3', 
        src: 'assets/rayon3.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.008,
        anchorY: 0.515,
        scaleW: 0.340,
        scaleH: 0.175
    },
    { 
        id: 'rayon4', 
        src: 'assets/rayon4.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.280,
        anchorY: 0.020,
        scaleW: 0.425,
        scaleH: 0.175
    }
];

DISTRICTS.forEach(d => {
    d.img.src = d.src;
    d.img.onload = () => {
        d.loaded = true;
        if (isGameRunning) render();
    };
});

// DOM Элементы
const introScreen = document.getElementById('intro-screen');
const mainMenu = document.getElementById('main-menu');
const gameScreen = document.getElementById('game-screen');
const genderModal = document.getElementById('gender-modal');
const apartmentScreen = document.getElementById('apartment-screen');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const settingsModal = document.getElementById('settings-modal');

// Показываем интро, затем меню
setTimeout(() => {
    introScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
}, 4200);

// Кнопка "Играть"
document.getElementById('btn-play').addEventListener('click', () => {
    const savedGender = localStorage.getItem('bestlife_gender');
    if (!savedGender) {
        genderModal.classList.remove('hidden');
    } else {
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

// Настройки
document.getElementById('btn-settings').addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});
document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

// Выход в меню из игры
document.getElementById('btn-menu-back').addEventListener('click', () => {
    isGameRunning = false;
    gameScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Выход из квартиры
document.getElementById('btn-exit-apartment').addEventListener('click', () => {
    apartmentScreen.classList.add('hidden');
});

// =========================================================
// ЗАПУСК ИГРЫ
// =========================================================
function launchGame() {
    mainMenu.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    isGameRunning = true;
    
    resizeCanvas();
    fitAndCenterMap();
    setupControls();
    
    renderLoop();
}

// =========================================================
// РАЗМЕРЫ КАРТЫ
// =========================================================
function getMapDimensions() {
    const w = (isGazonLoaded && gazonImg.width > 0) ? gazonImg.width : 2000;
    const h = (isGazonLoaded && gazonImg.height > 0) ? gazonImg.height : 2000;
    return { w, h };
}

// =========================================================
// НАСТРОЙКА КАМЕРЫ - КАРТА ПОЛНОСТЬЮ ВИДНА
// =========================================================
function fitAndCenterMap() {
    const mapW = isGazonLoaded && gazonImg.width > 0 ? gazonImg.width : 2000;
    const mapH = isGazonLoaded && gazonImg.height > 0 ? gazonImg.height : 2000;

    // Вычисляем зум чтобы карта полностью помещалась с отступами
    const padding = 0.90;
    const fitZoomX = (canvas.width * padding) / mapW;
    const fitZoomY = (canvas.height * padding) / mapH;
    const fitZoom = Math.min(fitZoomX, fitZoomY);
    
    // Минимальный зум - можно отдалить еще больше
    camera.minZoom = fitZoom * 0.5;
    camera.zoom = fitZoom;
    
    // Центрируем карту по центру экрана
    camera.x = canvas.width / 2;
    camera.y = canvas.height / 2;
    
    clampCamera();
}

// =========================================================
// ОГРАНИЧЕНИЕ КАМЕРЫ - НЕ ДАЕМ КАРТЕ УХОДИТЬ ЗА ЭКРАН
// =========================================================
function clampCamera() {
    const map = getMapDimensions();
    const mapW = map.w * camera.zoom;
    const mapH = map.h * camera.zoom;
    
    const halfW = mapW / 2;
    const halfH = mapH / 2;

    // Если карта меньше экрана - центрируем
    if (mapW < canvas.width) {
        camera.x = canvas.width / 2;
    } else {
        // Иначе ограничиваем, чтобы края карты не выходили за экран
        const minX = canvas.width - halfW;
        const maxX = halfW;
        camera.x = Math.max(minX, Math.min(maxX, camera.x));
    }

    if (mapH < canvas.height) {
        camera.y = canvas.height / 2;
    } else {
        const minY = canvas.height - halfH;
        const maxY = halfH;
        camera.y = Math.max(minY, Math.min(maxY, camera.y));
    }
}

// =========================================================
// CANVAS - ВЫСОКОЕ РАЗРЕШЕНИЕ
// =========================================================
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}

window.addEventListener('resize', () => {
    if (isGameRunning) {
        resizeCanvas();
        fitAndCenterMap();
        render();
    }
});

// =========================================================
// ГЛАВНЫЙ ЦИКЛ РЕНДЕРА
// =========================================================
function renderLoop() {
    if (isGameRunning) {
        animTimer += 0.04;
        render();
        requestAnimationFrame(renderLoop);
    }
}

// =========================================================
// ОТРИСОВКА КАРТЫ
// =========================================================
function render() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const map = getMapDimensions();
    const mapW = map.w * camera.zoom;
    const mapH = map.h * camera.zoom;
    const mapLeft = camera.x - mapW / 2;
    const mapTop = camera.y - mapH / 2;

    // 1. Рисуем газон
    if (isGazonLoaded && gazonImg.width > 0) {
        ctx.drawImage(gazonImg, mapLeft, mapTop, mapW, mapH);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, cssWidth, cssHeight);
        gradient.addColorStop(0, '#1a3a1a');
        gradient.addColorStop(1, '#2d5a2d');
        ctx.fillStyle = gradient;
        ctx.fillRect(mapLeft, mapTop, mapW, mapH);
    }

    // 2. Рисуем районы
    DISTRICTS.forEach(d => {
        if (d.loaded && d.img.width > 0) {
            const dx = mapLeft + d.anchorX * mapW;
            const dy = mapTop + d.anchorY * mapH;
            const dw = mapW * d.scaleW;
            const dh = mapH * d.scaleH;

            ctx.drawImage(d.img, dx, dy, dw, dh);
        }
    });

    // 3. Рисуем указатель на дом
    drawHomePointer(mapLeft, mapTop, mapW, mapH);
}

// =========================================================
// ПОЗИЦИЯ ДОМА ИГРОКА
// =========================================================
function getHomePos(mapLeft, mapTop, mapW, mapH) {
    return {
        x: mapLeft + mapW * 0.16,
        y: mapTop + mapH * 0.22
    };
}

// =========================================================
// УКАЗАТЕЛЬ НАД ДОМОМ
// =========================================================
function drawHomePointer(mapLeft, mapTop, mapW, mapH) {
    const home = getHomePos(mapLeft, mapTop, mapW, mapH);
    const offsetY = Math.sin(animTimer * 1.5) * 8;
    
    const indX = home.x;
    const indY = home.y - 40 * camera.zoom + offsetY;

    ctx.save();
    const width = Math.max(20, 26 * camera.zoom);
    const height = Math.max(24, 30 * camera.zoom);

    // Свечение
    const gradient = ctx.createRadialGradient(indX, indY - height/2, 0, indX, indY - height/2, 40 * camera.zoom);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(indX - 40 * camera.zoom, indY - 50 * camera.zoom, 80 * camera.zoom, 80 * camera.zoom);

    // Указатель
    ctx.beginPath();
    ctx.moveTo(indX, indY + height / 2);
    ctx.lineTo(indX - width / 2, indY - height / 2);
    ctx.lineTo(indX + width / 2, indY - height / 2);
    ctx.closePath();

    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, 2.5 * camera.zoom);
    ctx.stroke();

    ctx.restore();
}

// =========================================================
// УПРАВЛЕНИЕ
// =========================================================
function setupControls() {
    let clickStartX = 0;
    let clickStartY = 0;

    // MOUSE
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
        const wasDragging = camera.isDragging;
        camera.isDragging = false;
        const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
        if (dist < 8) {
            checkHomeClick(e.clientX, e.clientY);
        }
    });

    // TOUCH
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
        camera.isDragging = false;
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const dist = Math.hypot(touch.clientX - clickStartX, touch.clientY - clickStartY);
            if (dist < 15) {
                checkHomeClick(touch.clientX, touch.clientY);
            }
        }
    }, { passive: true });

    // КОЛЕСИКО МЫШИ
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        zoomToPoint(e.clientX, e.clientY, factor);
    }, { passive: false });
}

// =========================================================
// ПРОВЕРКА КЛИКА ПО ДОМУ
// =========================================================
function checkHomeClick(clickX, clickY) {
    const map = getMapDimensions();
    const mapW = map.w * camera.zoom;
    const mapH = map.h * camera.zoom;
    const mapLeft = camera.x - mapW / 2;
    const mapTop = camera.y - mapH / 2;
    const home = getHomePos(mapLeft, mapTop, mapW, mapH);

    const clickDist = Math.hypot(clickX - home.x, clickY - home.y);
    const threshold = Math.max(35, 50 * camera.zoom);

    if (clickDist < threshold) {
        apartmentScreen.classList.remove('hidden');
    }
}

// =========================================================
// ЗУМ В ТОЧКЕ
// =========================================================
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
