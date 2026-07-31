// =========================================================
// BESTLIFE - HIGH-PRECISION DISTRICT ENGINE (FIXED POSITIONS)
// =========================================================

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    minZoom: 0.3,
    maxZoom: 2.2,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    touchPinchDist: 0
};

let animTimer = 0;

// Загрузка базовой карты gazon.png (в корне репозитория)
const gazonImg = new Image();
let isGazonLoaded = false;
gazonImg.src = 'gazon.png';
gazonImg.onload = () => {
    isGazonLoaded = true;
    if (!gameScreen.classList.contains('hidden')) {
        fitAndCenterMap();
        render();
    }
};

// Районы в папке assets/ с ТОЧНЫМИ координатами на газоне
// Координаты проверены и исправлены для идеального позиционирования
const DISTRICTS = [
    { 
        id: 'rayon1', 
        src: 'assets/rayon1.png', 
        img: new Image(), 
        loaded: false,
        // ТОЧНЫЕ координаты на газоне (в долях от ширины/высоты газона)
        anchorX: 0.048,  // Левая граница района
        anchorY: 0.205,  // Верхняя граница района
        // Размеры сохраняют пропорции, подогнаны под тротуары
        scaleW: 0.242,   // Ширина района в долях от ширины газона
        scaleH: 0.165    // Высота района в долях от высоты газона
    },
    { 
        id: 'rayon2', 
        src: 'assets/rayon2.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.010,
        anchorY: 0.355,
        scaleW: 0.282,
        scaleH: 0.168
    },
    { 
        id: 'rayon3', 
        src: 'assets/rayon3.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.010,
        anchorY: 0.520,
        scaleW: 0.332,
        scaleH: 0.168
    },
    { 
        id: 'rayon4', 
        src: 'assets/rayon4.png', 
        img: new Image(), 
        loaded: false,
        anchorX: 0.283,
        anchorY: 0.023,
        scaleW: 0.415,
        scaleH: 0.168
    }
];

DISTRICTS.forEach(d => {
    d.img.src = d.src;
    d.img.onload = () => {
        d.loaded = true;
        render();
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
    
    requestAnimationFrame(renderLoop);
}

function getMapDimensions() {
    const w = (isGazonLoaded ? gazonImg.width : 2000) * camera.zoom;
    const h = (isGazonLoaded ? gazonImg.height : 2000) * camera.zoom;
    return { w, h };
}

function fitAndCenterMap() {
    const mapW = isGazonLoaded ? gazonImg.width : 2000;
    const mapH = isGazonLoaded ? gazonImg.height : 2000;

    const fitZoomX = (canvas.width * 0.95) / mapW;
    const fitZoomY = (canvas.height * 0.95) / mapH;
    
    camera.minZoom = Math.max(0.25, Math.min(fitZoomX, fitZoomY));
    camera.zoom = Math.min(Math.max(fitZoomX, fitZoomY), 0.6);
    
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

// Высокое разрешение Canvas (HiDPI / Retina для максимальной четкости)
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
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
        render();
        requestAnimationFrame(renderLoop);
    }
}

// ------------------------------------------
// ВЫСОКОЧЁТКИЙ РЕНДЕР КАРТЫ С РАЙОНАМИ
// ------------------------------------------
function render() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Включаем максимально качественное сглаживание текстур
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const map = getMapDimensions();
    const mapLeft = camera.x - map.w / 2;
    const mapTop = camera.y - map.h / 2;

    // 1. Отрисовка базового gazon.png (из корня репозитория)
    if (isGazonLoaded) {
        ctx.drawImage(gazonImg, mapLeft, mapTop, map.w, map.h);
    } else {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(mapLeft, mapTop, map.w, map.h);
    }

    // 2. Отрисовка наложенных районов С СОХРАНЕНИЕМ ПРОПОРЦИЙ
    DISTRICTS.forEach(d => {
        if (d.loaded) {
            const dx = mapLeft + d.anchorX * map.w;
            const dy = mapTop + d.anchorY * map.h;
            
            // Используем сохранённые пропорции для ширины и высоты
            const dw = map.w * d.scaleW;
            const dh = map.h * d.scaleH;

            ctx.drawImage(d.img, dx, dy, dw, dh);
        }
    });

    // 3. Указатель над домом игрока (только указатель, без человечков и машин)
    drawHomePointer(mapLeft, mapTop, map.w, map.h);
}

function getHomePos(mapLeft, mapTop, mapW, mapH) {
    return {
        x: mapLeft + mapW * 0.16,
        y: mapTop + mapH * 0.22
    };
}

function drawHomePointer(mapLeft, mapTop, mapW, mapH) {
    const home = getHomePos(mapLeft, mapTop, mapW, mapH);
    const offsetY = Math.sin(animTimer * 1.5) * 8;
    
    const indX = home.x;
    const indY = home.y - 40 * camera.zoom + offsetY;

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
