// =========================================================
// BESTLIFE - DISTRICT OVERLAY ENGINE (GAZON + ASSETS/RAYON1..4)
// =========================================================

// Камера
const camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    minZoom: 0.3,
    maxZoom: 1.8,
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

// Загрузка районов из папки assets/
const DISTRICTS = [
    { id: 'rayon1', src: 'assets/rayon1.png', img: new Image(), loaded: false, x: 0.01, y: 0.10, w: 0.29, h: 0.28 },
    { id: 'rayon2', src: 'assets/rayon2.png', img: new Image(), loaded: false, x: 0.13, y: 0.22, w: 0.37, h: 0.31 },
    { id: 'rayon3', src: 'assets/rayon3.png', img: new Image(), loaded: false, x: 0.01, y: 0.35, w: 0.32, h: 0.26 },
    { id: 'rayon4', src: 'assets/rayon4.png', img: new Image(), loaded: false, x: 0.31, y: 0.02, w: 0.50, h: 0.33 }
];

DISTRICTS.forEach(d => {
    d.img.src = d.src;
    d.img.onload = () => {
        d.loaded = true;
        render();
    };
});

// Живой трафик машин и пешеходов
const CARS = [];
const PEDESTRIANS = [];

function initTraffic() {
    CARS.length = 0;
    PEDESTRIANS.length = 0;
    const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ffffff', '#8b5cf6'];

    for (let i = 0; i < 14; i++) {
        CARS.push({
            rx: 0.1 + Math.random() * 0.8,
            ry: 0.1 + Math.random() * 0.8,
            speedX: (Math.random() - 0.5) * 0.0015,
            speedY: (Math.random() - 0.5) * 0.0015,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }

    for (let i = 0; i < 20; i++) {
        PEDESTRIANS.push({
            rx: 0.1 + Math.random() * 0.8,
            ry: 0.1 + Math.random() * 0.8,
            speedX: (Math.random() - 0.5) * 0.0006,
            speedY: (Math.random() - 0.5) * 0.0006,
            shirt: colors[Math.floor(Math.random() * colors.length)],
            walkFrame: Math.random() * 10
        });
    }
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
    initTraffic();
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
        car.rx += car.speedX;
        car.ry += car.speedY;
        if (car.rx < 0.05 || car.rx > 0.95) car.speedX *= -1;
        if (car.ry < 0.05 || car.ry > 0.95) car.speedY *= -1;
    });

    PEDESTRIANS.forEach(p => {
        p.rx += p.speedX;
        p.ry += p.speedY;
        p.walkFrame += 0.12;
        if (p.rx < 0.05 || p.rx > 0.95) p.speedX *= -1;
        if (p.ry < 0.05 || p.ry > 0.95) p.speedY *= -1;
    });
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // 2. Пешеходы
    drawPedestrians(mapLeft, mapTop, map.w, map.h);

    // 3. Машинки
    drawCars(mapLeft, mapTop, map.w, map.h);

    // 4. Наложенные районы (assets/rayon1.png, assets/rayon2.png, ...)
    DISTRICTS.forEach(d => {
        if (d.loaded) {
            const dx = mapLeft + d.x * map.w;
            const dy = mapTop + d.y * map.h;
            const dw = d.w * map.w;
            const dh = d.h * map.h;
            ctx.drawImage(d.img, dx, dy, dw, dh);
        }
    });

    // 5. Указатель над домом игрока
    drawHomePointer(mapLeft, mapTop, map.w, map.h);
}

function drawCars(mapLeft, mapTop, mapW, mapH) {
    CARS.forEach(car => {
        const cx = mapLeft + car.rx * mapW;
        const cy = mapTop + car.ry * mapH;
        const cw = 16 * camera.zoom;
        const ch = 9 * camera.zoom;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(cx - cw / 2, cy + ch / 2, cw, ch / 3);

        ctx.fillStyle = car.color;
        ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
        ctx.fillStyle = '#bfdbfe';
        ctx.fillRect(cx - cw / 4, cy - ch / 3, cw / 2, ch / 1.8);
    });
}

function drawPedestrians(mapLeft, mapTop, mapW, mapH) {
    PEDESTRIANS.forEach(p => {
        const px = mapLeft + p.rx * mapW;
        const py = mapTop + p.ry * mapH;
        const size = 3 * camera.zoom;

        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(px, py - size * 2.8, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.shirt;
        ctx.fillRect(px - size / 1.5, py - size * 1.8, size * 1.3, size * 1.8);
    });
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
