const STORAGE_KEY = 'nha-nho-2d-save-v1';
const DAY_DURATION_SECONDS = 48;
const HOURS_PER_SECOND = 24 / DAY_DURATION_SECONDS;
const BASE_RENT = 200_000;
const STARTING_MONEY = 100_000_000;
const CLEANER_FEE = 80_000;

const ROOM_BLUEPRINTS = [
  { id: 'room-a', name: 'Phòng Mộc', icon: '🛏', color: '#f1b785' },
  { id: 'room-b', name: 'Phòng Lá', icon: '🌿', color: '#a8c98d' },
];

const UPGRADES = [
  { id: 'bed', icon: '🛏️', name: 'Giường êm ái', price: 2_500_000, bonus: 50_000, copy: 'Tăng giá phòng 50.000 ₫.' },
  { id: 'bathroom', icon: '🚿', name: 'WC nâng cấp', price: 3_000_000, bonus: 60_000, copy: 'Tăng giá phòng 60.000 ₫.' },
  { id: 'wardrobe', icon: '🗄️', name: 'Tủ quần áo', price: 1_500_000, bonus: 20_000, copy: 'Tăng giá phòng 20.000 ₫.' },
  { id: 'dryer', icon: '💨', name: 'Máy sấy tóc', price: 2_000_000, bonus: 25_000, copy: 'Tăng giá phòng 25.000 ₫.' },
  { id: 'fan', icon: '🌀', name: 'Quạt mát', price: 800_000, bonus: 15_000, copy: 'Tăng giá phòng 15.000 ₫.' },
  { id: 'aircon', icon: '❄️', name: 'Máy lạnh', price: 5_000_000, bonus: 80_000, copy: 'Tăng giá phòng 80.000 ₫.' },
  { id: 'bathtub', icon: '🛁', name: 'Bồn tắm', price: 6_000_000, bonus: 100_000, copy: 'Tăng giá phòng 100.000 ₫.' },
];

const MARKETING = [
  { id: 'local', icon: '📍', name: 'Quảng cáo địa phương', price: 300_000, boost: .18, discount: 0, copy: '+18% cơ hội có khách.' },
  { id: 'featured', icon: '📣', name: 'Quảng cáo nổi bật', price: 1_000_000, boost: .38, discount: 0, copy: '+38% cơ hội có khách.' },
  { id: 'deal', icon: '🏷️', name: 'Gói ưu đãi 10%', price: 200_000, boost: .25, discount: .1, copy: '+25% cơ hội, giảm 10% giá thuê.' },
];

const GUESTS = [
  { name: 'Minh & An', group: '1 người', adults: 1, children: 0 },
  { name: 'Gia đình Lan', group: '2 người', adults: 2, children: 0 },
  { name: 'Huy và bạn', group: '2 người', adults: 2, children: 0 },
  { name: 'Nhóm Mộc', group: '2 người', adults: 2, children: 0 },
  { name: 'Trang & Linh', group: '2 người', adults: 2, children: 0 },
  { name: 'Khách Đồi Mây', group: 'Gia đình 2 lớn + 1 bé', adults: 2, children: 1 },
];

const ui = {
  canvas: document.querySelector('#game-canvas'),
  money: document.querySelector('#money-value'),
  day: document.querySelector('#day-value'),
  clock: document.querySelector('#clock-value'),
  phaseDot: document.querySelector('#phase-dot'),
  phaseLabel: document.querySelector('#phase-label'),
  phaseCopy: document.querySelector('#phase-copy'),
  controlCard: document.querySelector('.control-card'),
  panel: document.querySelector('#panel'),
  toast: document.querySelector('#toast'),
  tabs: [...document.querySelectorAll('.tab')],
  intro: document.querySelector('#intro-modal'),
  start: document.querySelector('#start-button'),
  reset: document.querySelector('#reset-button'),
  saveStatus: document.querySelector('#save-status'),
};

let state = loadState();
let activeTab = 'overview';
let mobilePanelOpen = false;
let timer = null;
let toastTimer = null;
let canvasScale = 1;
const sceneImage = new Image();
sceneImage.src = './assets/homestay-scene.png';
sceneImage.addEventListener('load', () => drawScene());
const portraitSceneImage = new Image();
portraitSceneImage.src = './assets/homestay-scene-portrait.png';
portraitSceneImage.addEventListener('load', () => drawScene());

function freshState() {
  return {
    money: STARTING_MONEY,
    day: 1,
    hour: 0,
    phase: 'intro',
    selectedRoom: 'room-a',
    running: false,
    marketing: { name: '', boost: 0, discount: 0, daysLeft: 0 },
    totalIncome: 0,
    totalGuests: 0,
    ledger: [],
    arrivalPlans: [],
    rooms: ROOM_BLUEPRINTS.map((room) => ({ ...room, status: 'clean', guest: null, upgrades: [] })),
  };
}

function normalizeState(saved) {
  const base = freshState();
  const rooms = saved.rooms.map((room, index) => ({
    ...ROOM_BLUEPRINTS[index],
    ...room,
    status: room.status === 'ready' ? 'clean' : room.status === 'booked' ? 'occupied' : room.status,
    upgrades: Array.isArray(room.upgrades) ? room.upgrades : [],
    guest: room.guest ? { ...room.guest } : null,
  }));
  const ledger = Array.isArray(saved.ledger) ? saved.ledger : [];
  const phase = saved.phase === 'intro' ? 'intro' : saved.phase === 'running' ? 'running' : 'prepare';
  const marketing = saved.marketing && saved.marketing.daysLeft > 0
    ? { ...base.marketing, ...saved.marketing }
    : { ...base.marketing };
  const totalIncome = Number.isFinite(saved.totalIncome)
    ? saved.totalIncome
    : ledger.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  return {
    ...base,
    ...saved,
    money: Number.isFinite(saved.money) ? saved.money : base.money,
    day: Number.isFinite(saved.day) ? saved.day : base.day,
    hour: Number.isFinite(saved.hour) ? Math.min(24, Math.max(0, saved.hour)) : base.hour,
    phase,
    running: phase === 'running',
    marketing,
    totalIncome,
    totalGuests: Number.isFinite(saved.totalGuests) ? saved.totalGuests : 0,
    ledger,
    arrivalPlans: Array.isArray(saved.arrivalPlans) ? saved.arrivalPlans : [],
    rooms,
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.rooms?.length === ROOM_BLUEPRINTS.length) return normalizeState(saved);
  } catch (error) {
    console.warn('Không thể đọc tiến trình 2D:', error);
  }
  return freshState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  ui.saveStatus.textContent = 'Đã lưu trên trình duyệt';
}

function money(value) { return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`; }
function signedMoney(value) { return `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`; }
function selectedRoom() { return state.rooms.find((room) => room.id === state.selectedRoom) || state.rooms[0]; }
function roomRent(room) { return BASE_RENT + room.upgrades.reduce((total, id) => total + (UPGRADES.find((item) => item.id === id)?.bonus || 0), 0); }
function stayPrice(room) { return Math.round(roomRent(room) * (1 - (state.marketing?.discount || 0))); }
function roomStatus(room) {
  if (room.status === 'occupied') return { label: 'Có khách', className: 'booked' };
  if (room.status === 'dirty') return { label: 'Cần dọn', className: 'dirty' };
  return { label: 'Sẵn sàng', className: 'ready' };
}
function formatClock(hour) {
  if (hour >= 24) return '24:00';
  const safe = Math.max(0, Math.min(23.99, hour));
  const h = Math.floor(safe);
  const m = Math.floor((safe - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function showToast(message, error = false) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.toggle('error', error);
  ui.toast.classList.add('show');
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('show'), 2800);
}

function addLedger(amount, description) {
  state.money += amount;
  if (amount > 0) state.totalIncome += amount;
  state.ledger.unshift({ amount, description, day: state.day });
  state.ledger = state.ledger.slice(0, 12);
}

function canSpend(amount) {
  if (state.money >= amount) return true;
  showToast('Chưa đủ ngân sách cho khoản này.', true);
  return false;
}

function phaseCopy() {
  if (state.phase === 'intro') return ['Sẵn sàng mở cửa', 'Sắp xếp căn nhà nhỏ trước khi đón vị khách đầu tiên.', ''];
  if (state.phase === 'running') return ['Nhà Nắng đang hoạt động', 'Khách có thể đến từ 14:00. Hãy để phòng luôn sạch.', 'live'];
  return ['Thời gian chuẩn bị', 'Ngày mới đã khép lại. Dọn phòng, đầu tư rồi mở cửa lại.', 'prepare'];
}

function renderStats() {
  ui.money.textContent = money(state.money);
  ui.day.textContent = state.day;
  ui.clock.textContent = state.phase === 'intro' ? '00:00' : formatClock(state.hour);
  const [label, copy, tone] = phaseCopy();
  ui.phaseLabel.textContent = label;
  ui.phaseCopy.textContent = copy;
  ui.phaseDot.className = `phase-dot ${tone}`;
}

function renderOverview() {
  const ready = state.rooms.filter((room) => room.status === 'clean').length;
  const booked = state.rooms.filter((room) => room.status === 'occupied').length;
  const dirty = state.rooms.filter((room) => room.status === 'dirty').length;
  const occupancy = Math.round((booked / state.rooms.length) * 100);
  const marketing = state.marketing?.daysLeft > 0 ? `${state.marketing.name} · còn ${state.marketing.daysLeft} ngày` : 'Chưa chạy chiến dịch';
  const campaignButtons = state.marketing?.daysLeft > 0
    ? `<div class="info-box"><span>📣</span><p>Đang chạy <strong>${state.marketing.name}</strong> · còn ${state.marketing.daysLeft} ngày.</p></div>`
    : `<p class="section-label"><span>Thu hút khách</span><span>Chỉ mua khi đang chuẩn bị</span></p><div class="item-list">${MARKETING.map((campaign) => `<div class="item-card"><span class="item-icon">${campaign.icon}</span><span class="item-copy"><strong>${campaign.name}</strong><span>${campaign.copy}</span></span><button class="buy-button" data-action="run-marketing" data-campaign="${campaign.id}" type="button" ${state.phase !== 'prepare' ? 'disabled' : ''}>${money(campaign.price)}</button></div>`).join('')}</div>`;
  return `
    <div class="panel-heading"><div><p class="eyebrow">BẢNG ĐIỀU KHIỂN</p><h3>Nhà Nắng hôm nay</h3><p>Giữ trải nghiệm tốt để khách quay lại và giá phòng tăng dần.</p></div><span class="panel-icon">☀</span></div>
    <div class="metric-grid"><div class="metric"><span>Tỷ lệ lấp đầy</span><strong>${occupancy}%</strong><div class="progress"><span style="width:${occupancy}%"></span></div></div><div class="metric"><span>Khách đã đón</span><strong>${state.totalGuests}</strong></div><div class="metric"><span>Phòng sạch</span><strong>${ready}/${state.rooms.length}</strong></div><div class="metric"><span>Doanh thu</span><strong>${money(state.totalIncome)}</strong></div></div>
    <p class="section-label"><span>Tình trạng căn nhà</span><span>${marketing}</span></p>
    <div class="room-list">${state.rooms.map(roomCard).join('')}</div>
    <div class="info-box"><span>💡</span><p>${booked ? `${booked} nhóm khách đang lưu trú. Doanh thu sẽ ghi khi khách trả phòng.` : dirty ? `Có ${dirty} phòng cần dọn trước khi mở cửa ngày mới.` : 'Phòng sạch sẽ giúp tăng cơ hội nhận khách và giữ đánh giá tốt.'}</p></div>
    ${campaignButtons}
    <div class="action-row">${state.phase === 'running' ? '<button class="danger-button wide" data-action="close-day" type="button">Đóng cửa sớm</button>' : `<button class="primary-button wide" data-action="start-day" type="button">${state.phase === 'intro' ? 'Mở cửa ngày đầu tiên' : 'Bắt đầu ngày mới'}</button>`}</div>
  `;
}

function roomCard(room) {
  const status = roomStatus(room);
  const details = room.status === 'occupied' ? `${room.guest.name} · trả phòng ${formatClock(room.guest.checkoutHour || 10)}` : `${money(roomRent(room))}/đêm`;
  return `<button class="room-card" data-action="select-room" data-room="${room.id}" type="button"><span class="room-main"><span class="room-icon">${room.icon}</span><span><strong>${room.name}</strong><small>${details}</small></span></span><span class="status-label ${status.className}">${status.label}</span></button>`;
}

function renderRooms() {
  const room = selectedRoom();
  const action = room.status === 'dirty'
    ? '<div class="action-row"><button class="primary-button" data-action="clean-room" type="button">🧹 Tự dọn</button><button class="secondary-button" data-action="hire-cleaner" type="button">🧼 Thuê dọn · 80.000 ₫</button></div>'
    : room.status === 'clean'
      ? '<div class="action-row"><button class="secondary-button wide" disabled type="button">✓ Đã sẵn sàng</button></div>'
      : '<div class="action-row"><button class="secondary-button wide" disabled type="button">🔑 Đang có khách</button></div>';
  return `
    <div class="panel-heading"><div><p class="eyebrow">QUẢN LÝ PHÒNG</p><h3>${room.name}</h3><p>${room.status === 'occupied' ? `Đang đón ${room.guest.name}. Trả phòng lúc ${formatClock(room.guest.checkoutHour || 10)}.` : 'Chọn phòng để chăm chút từng chi tiết.'}</p></div><span class="panel-icon">${room.icon}</span></div>
    <div class="room-list">${state.rooms.map(roomCard).join('')}</div>
    <div class="info-box"><span>🧾</span><p>Giá hiện tại: <strong>${money(roomRent(room))}</strong> mỗi đêm. Nâng cấp sẽ áp dụng vĩnh viễn cho phòng này.</p></div>
    ${action}
  `;
}

function renderShop() {
  const room = selectedRoom();
  const owned = new Set(room.upgrades);
  return `
    <div class="panel-heading"><div><p class="eyebrow">GÓC ĐẦU TƯ</p><h3>Làm phòng đáng nhớ</h3><p>Chọn một phòng bên tab Phòng rồi nâng cấp tiện nghi.</p></div><span class="panel-icon">🛠</span></div>
    <p class="section-label"><span>Vật phẩm cho ${room.name}</span><span>${room.upgrades.length}/${UPGRADES.length} đã mua</span></p>
    <div class="item-list">${UPGRADES.map((item) => `<div class="item-card"><span class="item-icon">${item.icon}</span><span class="item-copy"><strong>${item.name}</strong><span>${item.copy}</span></span><button class="buy-button" data-action="buy-upgrade" data-item="${item.id}" type="button" ${owned.has(item.id) || room.status === 'occupied' || state.phase !== 'prepare' ? 'disabled' : ''}>${owned.has(item.id) ? 'Đã mua' : money(item.price)}</button></div>`).join('')}</div>
    <div class="info-box"><span>📣</span><p>Marketing nằm trong tab Tổng quan bằng cách chạy chiến dịch ngay trước ngày mở cửa.</p></div>
  `;
}

function renderLedger() {
  return `
    <div class="panel-heading"><div><p class="eyebrow">NHẬT KÝ KINH DOANH</p><h3>Dòng tiền</h3><p>Mọi khoản thu chi gần nhất của Nhà Nắng.</p></div><span class="panel-icon">₫</span></div>
    ${state.ledger.length ? `<div class="ledger-list">${state.ledger.map((entry) => `<div class="ledger-row"><span class="ledger-copy"><strong>${entry.description}</strong><span>Ngày ${entry.day}</span></span><span class="ledger-amount ${entry.amount >= 0 ? 'income' : 'cost'}">${signedMoney(entry.amount)}</span></div>`).join('')}</div>` : '<div class="empty">Chưa có giao dịch. Mở cửa để bắt đầu ghi nhận dòng tiền.</div>'}
    <div class="info-box"><span>💰</span><p>Doanh thu được ghi khi khách trả phòng. Tiền nâng cấp, marketing và thuê dọn hiện ngay trong Sổ sách.</p></div>
  `;
}

function renderPanel() {
  ui.tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.tab === activeTab));
  ui.controlCard.classList.toggle('is-mobile-open', mobilePanelOpen && window.matchMedia('(max-width: 600px)').matches);
  ui.panel.innerHTML = activeTab === 'overview' ? renderOverview() : activeTab === 'rooms' ? renderRooms() : activeTab === 'shop' ? renderShop() : renderLedger();
  ui.panel.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', handleAction));
}

function renderAll() {
  renderStats();
  renderPanel();
  drawScene();
  saveState();
}

function startTimer() {
  clearInterval(timer);
  timer = window.setInterval(() => {
    if (state.phase !== 'running' || !state.running) return;
    state.hour += HOURS_PER_SECOND;
    processRoomEvents();
    if (state.hour >= 24) finishDay();
    renderAll();
  }, 1000);
}

function startDay() {
  if (state.phase === 'running') return;
  if (state.phase === 'prepare' && state.hour >= 24) state.day += 1;
  state.phase = 'running';
  state.running = true;
  state.hour = 0;
  scheduleDay();
  showToast(`Ngày ${state.day} bắt đầu. Chúc bạn kinh doanh thuận lợi!`);
  startTimer();
  renderAll();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomGuestProfile() {
  return { ...GUESTS[Math.floor(Math.random() * GUESTS.length)] };
}

function getAvailableRoom() {
  return state.rooms.find((room) => room.status === 'clean' && !room.guest);
}

function scheduleDay() {
  const chance = Math.min(.98, .74 + (state.marketing?.boost || 0));
  state.arrivalPlans = Array.from({ length: 3 }, (_, index) => ({
    id: `arrival-${state.day}-${index}`,
    day: state.day,
    hour: randomBetween(14, 21.5),
    shouldArrive: Math.random() < chance,
    processed: false,
    guest: randomGuestProfile(),
  }));
}

function checkIn(room, plan) {
  const profile = plan.guest || randomGuestProfile();
  const checkoutHour = randomBetween(6, 11.5);
  room.guest = {
    ...profile,
    arrivalDay: state.day,
    checkoutDay: state.day + 1,
    checkoutHour,
    rate: stayPrice(room),
  };
  room.status = 'occupied';
  state.totalGuests += 1;
  showToast(`${profile.name} đã nhận ${room.name}. Doanh thu ghi khi trả phòng.`);
}

function checkOut(room) {
  const guest = room.guest;
  if (!guest) return;
  if (!guest.paid) addLedger(guest.rate || roomRent(room), `${room.name}: tiền phòng của ${guest.name}`);
  room.guest = null;
  room.status = 'dirty';
  showToast(`${guest.name} đã trả phòng. ${room.name} cần được dọn.`);
}

function processRoomEvents() {
  state.rooms.forEach((room) => {
    if (room.guest && room.guest.checkoutDay === state.day && state.hour >= room.guest.checkoutHour) checkOut(room);
  });
  state.arrivalPlans
    .filter((plan) => !plan.processed && plan.day === state.day && state.hour >= plan.hour)
    .forEach((plan) => {
      plan.processed = true;
      if (!plan.shouldArrive) return;
      const room = getAvailableRoom();
      if (room) checkIn(room, plan);
      else showToast('Có khách ghé nhưng hiện không còn phòng sạch.');
    });
}

function finishDay() {
  state.hour = 24;
  state.running = false;
  state.phase = 'prepare';
  if (state.marketing?.daysLeft > 0) {
    state.marketing.daysLeft -= 1;
    if (state.marketing.daysLeft <= 0) state.marketing = { name: '', boost: 0, discount: 0, daysLeft: 0 };
  }
  clearInterval(timer);
  showToast(`Ngày ${state.day} kết thúc. Dọn phòng và chuẩn bị cho ngày mới.`);
}

function closeDay() {
  state.hour = 24;
  finishDay();
  renderAll();
}

function cleanRoom(roomId = selectedRoom().id, hire = false) {
  const room = state.rooms.find((entry) => entry.id === roomId);
  if (!room || room.status !== 'dirty' || state.phase !== 'prepare') return;
  if (hire) {
    if (!canSpend(CLEANER_FEE)) return;
    addLedger(-CLEANER_FEE, `Thuê dọn phòng · ${room.name}`);
  }
  room.status = 'clean';
  showToast(`${room.name} đã sạch sẽ và sẵn sàng đón khách.`);
  renderAll();
}

function buyUpgrade(itemId) {
  const item = UPGRADES.find((entry) => entry.id === itemId);
  const room = selectedRoom();
  if (state.phase !== 'prepare' || !item || room.upgrades.includes(item.id) || room.status === 'occupied' || !canSpend(item.price)) return;
  addLedger(-item.price, `${item.name} · ${room.name}`);
  room.upgrades.push(item.id);
  showToast(`${item.name} đã được lắp đặt cho ${room.name}.`);
  renderAll();
}

function runMarketing(campaignId) {
  const campaign = MARKETING.find((entry) => entry.id === campaignId);
  if (!campaign || state.phase !== 'prepare' || !canSpend(campaign.price)) return;
  addLedger(-campaign.price, campaign.name);
  state.marketing = { ...campaign, daysLeft: 1 };
  showToast(`${campaign.name} đã lên sóng cho ngày mở cửa tiếp theo.`);
  renderAll();
}

function handleAction(event) {
  const { action, room, item, campaign } = event.currentTarget.dataset;
  if (action === 'select-room') { state.selectedRoom = room; activeTab = 'rooms'; renderAll(); return; }
  if (action === 'start-day') { startDay(); return; }
  if (action === 'close-day') { closeDay(); return; }
  if (action === 'clean-room') { cleanRoom(room); return; }
  if (action === 'hire-cleaner') { cleanRoom(room, true); return; }
  if (action === 'buy-upgrade') { buyUpgrade(item); return; }
  if (action === 'run-marketing') { runMarketing(campaign); }
}

function drawScene() {
  const canvas = ui.canvas;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(320, Math.floor(rect.width));
  const portraitMode = window.matchMedia('(max-width: 600px)').matches;
  const cssHeight = portraitMode ? Math.floor(cssWidth * (16 / 9)) : Math.max(430, Math.floor(cssWidth * .67));
  canvasScale = window.devicePixelRatio || 1;
  canvas.width = cssWidth * canvasScale;
  canvas.height = cssHeight * canvasScale;
  canvas.style.aspectRatio = `${cssWidth} / ${cssHeight}`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
  const activeImage = getActiveSceneImage();
  const hasIllustratedBackdrop = activeImage.complete && activeImage.naturalWidth > 0;
  if (hasIllustratedBackdrop) {
    drawIllustratedBackdrop(ctx, cssWidth, cssHeight, activeImage);
    drawRoomMarkers(ctx, cssWidth, cssHeight);
  } else {
    drawBackground(ctx, cssWidth, cssHeight);
    drawGarden(ctx, cssWidth, cssHeight);
    drawHouse(ctx, cssWidth, cssHeight);
  }
  drawGuests(ctx, cssWidth, cssHeight);
}

function getActiveSceneImage() {
  const portraitMode = window.matchMedia('(max-width: 600px)').matches;
  if (portraitMode && portraitSceneImage.complete && portraitSceneImage.naturalWidth > 0) return portraitSceneImage;
  return sceneImage;
}

function drawIllustratedBackdrop(ctx, w, h, image) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = w / h;
  let drawW = w;
  let drawH = h;
  let offsetX = 0;
  let offsetY = 0;
  if (imageRatio > canvasRatio) {
    drawW = h * imageRatio;
    offsetX = (w - drawW) / 2;
  } else {
    drawH = w / imageRatio;
    offsetY = (h - drawH) / 2;
  }
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);
  ctx.fillStyle = 'rgba(255, 250, 230, .08)';
  ctx.fillRect(0, 0, w, h);
}

function roomHitboxes(w, h) {
  const markerW = Math.max(58, Math.min(110, w * .14));
  const markerH = Math.max(38, Math.min(50, h * .09));
  const centers = window.matchMedia('(max-width: 600px)').matches
    ? [[w * .62, h * .52], [w * .79, h * .52]]
    : [[w * .67, h * .35], [w * .81, h * .35]];
  return centers.map(([centerX, centerY]) => ({ x: centerX - markerW / 2, y: centerY - markerH / 2, width: markerW, height: markerH }));
}

function drawRoomMarkers(ctx, w, h) {
  const boxes = roomHitboxes(w, h);
  const markerFont = Math.max(8, Math.min(11, w * .016));
  state.rooms.forEach((room, index) => {
    const box = boxes[index];
    const status = roomStatus(room);
    const selected = room.id === state.selectedRoom;
    ctx.save();
    ctx.shadowColor = 'rgba(56, 75, 58, .18)';
    ctx.shadowBlur = selected ? 12 : 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = selected ? 'rgba(255, 252, 241, .96)' : 'rgba(255, 252, 241, .88)';
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, 9);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = selected ? 2.5 : 1;
    ctx.strokeStyle = selected ? '#42644d' : 'rgba(255, 255, 255, .8)';
    ctx.stroke();
    ctx.fillStyle = status.className === 'booked' ? '#63886a' : status.className === 'dirty' ? '#bd7067' : '#c99c45';
    ctx.beginPath(); ctx.arc(box.x + 11, box.y + 14, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3632';
    ctx.font = `800 ${markerFont}px "Be Vietnam Pro", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(room.name, box.x + 20, box.y + 17);
    ctx.fillStyle = status.className === 'booked' ? '#42644d' : status.className === 'dirty' ? '#a35e58' : '#9b7831';
    ctx.font = `600 ${Math.max(7, markerFont - 2)}px "Be Vietnam Pro", sans-serif`;
    ctx.fillText(status.label, box.x + 20, box.y + 32);
    ctx.restore();
  });
}

function drawBackground(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#c8e2d4'); sky.addColorStop(.62, '#e8e4c9'); sky.addColorStop(1, '#e2bb8f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 248, 210, .72)'; ctx.beginPath(); ctx.arc(w * .82, h * .16, Math.min(w, h) * .085, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, .62)';
  [[.16, .18, 42], [.34, .11, 30], [.67, .26, 37]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(w * x, h * y, r, r * .38, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(w * x + r * .45, h * y - 5, r * .65, r * .48, 0, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#a9c9a3'; ctx.beginPath(); ctx.moveTo(0, h * .51); ctx.quadraticCurveTo(w * .22, h * .35, w * .44, h * .52); ctx.quadraticCurveTo(w * .7, h * .31, w, h * .5); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  ctx.fillStyle = '#91b68e'; ctx.beginPath(); ctx.moveTo(0, h * .67); ctx.quadraticCurveTo(w * .28, h * .54, w * .58, h * .7); ctx.quadraticCurveTo(w * .8, h * .57, w, h * .69); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
}

function drawGarden(ctx, w, h) {
  ctx.strokeStyle = 'rgba(76, 107, 74, .48)'; ctx.lineWidth = 3;
  for (let i = 0; i < 8; i += 1) { const x = 25 + i * (w / 8); const y = h * .77 + (i % 2) * 7; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x - 5, y); ctx.moveTo(x, y + 20); ctx.lineTo(x + 5, y - 1); ctx.stroke(); }
  drawTree(ctx, w * .12, h * .58, 1.1); drawTree(ctx, w * .87, h * .58, .9);
  ctx.fillStyle = '#d3a87e'; ctx.beginPath(); ctx.moveTo(w * .06, h * .82); ctx.quadraticCurveTo(w * .5, h * .67, w * .95, h * .82); ctx.lineTo(w * .95, h); ctx.lineTo(w * .06, h); ctx.fill();
}

function drawTree(ctx, x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = '#806b53'; ctx.fillRect(-5, 22, 10, 56); ctx.fillStyle = '#6f9b70'; [[0, 6, 30], [-19, 19, 22], [19, 20, 23], [0, 31, 27]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(-10, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawHouse(ctx, w, h) {
  const houseX = w * .18; const houseY = h * .34; const houseW = w * .64; const houseH = h * .37;
  ctx.fillStyle = 'rgba(67, 83, 65, .18)'; ctx.beginPath(); ctx.ellipse(w * .5, houseY + houseH + 34, w * .36, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b85e4d'; ctx.beginPath(); ctx.moveTo(houseX - 18, houseY + 13); ctx.lineTo(w * .5, houseY - 80); ctx.lineTo(houseX + houseW + 18, houseY + 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d98068'; ctx.beginPath(); ctx.moveTo(houseX - 4, houseY + 14); ctx.lineTo(w * .5, houseY - 64); ctx.lineTo(houseX + houseW + 4, houseY + 14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f8ead2'; ctx.fillRect(houseX, houseY + 8, houseW, houseH);
  ctx.fillStyle = 'rgba(255,255,255,.64)'; ctx.fillRect(houseX + houseW * .48, houseY + 8, 4, houseH);
  const gap = houseW * .07; const roomW = (houseW - gap * 3) / 2; const roomY = houseY + houseH * .25; const roomH = houseH * .56;
  state.rooms.forEach((room, index) => { const x = houseX + gap + index * (roomW + gap); drawRoom(ctx, room, x, roomY, roomW, roomH); });
  ctx.fillStyle = '#80664f'; ctx.fillRect(w * .46, houseY + houseH * .68, w * .08, houseH * .32); ctx.fillStyle = '#d9a456'; ctx.beginPath(); ctx.arc(w * .535, houseY + houseH * .84, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7c9f78'; ctx.fillRect(houseX + 15, houseY + 1, houseW - 30, 6);
  ctx.fillStyle = '#537a59'; ctx.font = '700 12px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NHÀ NẮNG', w * .5, houseY - 11);
}

function drawRoom(ctx, room, x, y, w, h) {
  const selected = room.id === state.selectedRoom;
  ctx.fillStyle = room.status === 'occupied' ? '#c8e0bf' : room.status === 'dirty' ? '#f1c8bd' : '#f4c895'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = selected ? '#42644d' : 'rgba(102, 91, 70, .3)'; ctx.lineWidth = selected ? 3 : 1; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#fff8e8'; ctx.fillRect(x + w * .16, y + h * .2, w * .68, h * .35); ctx.fillStyle = '#9fc2cf'; ctx.fillRect(x + w * .2, y + h * .23, w * .6, h * .28);
  ctx.fillStyle = '#d9a67f'; ctx.fillRect(x + w * .2, y + h * .66, w * .56, h * .16);
  ctx.fillStyle = room.status === 'occupied' ? '#5f8a65' : room.status === 'dirty' ? '#b96e63' : '#c99c45'; ctx.beginPath(); ctx.arc(x + w * .83, y + h * .15, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c3632'; ctx.font = '700 10px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(room.name, x + w / 2, y + h + 16);
  if (room.status === 'occupied') { ctx.font = '16px sans-serif'; ctx.fillText('☻', x + w / 2, y + h * .58); }
  if (room.status === 'dirty') { ctx.font = '15px sans-serif'; ctx.fillText('✦', x + w / 2, y + h * .58); }
}

function drawGuests(ctx, w, h) {
  const guests = state.rooms.filter((room) => room.status === 'occupied').length;
  if (!guests) return;
  ctx.fillStyle = '#42644d'; ctx.font = '700 10px "Be Vietnam Pro", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`● ${guests} nhóm khách đang nghỉ`, 17, h - 18);
}

function hitRoom(event) {
  const rect = ui.canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const w = rect.width; const h = rect.height;
  if (getActiveSceneImage().complete && getActiveSceneImage().naturalWidth > 0) {
    const boxes = roomHitboxes(w, h);
    const hitIndex = boxes.findIndex((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
    return hitIndex >= 0 ? state.rooms[hitIndex] : null;
  }
  const houseX = w * .18; const houseY = h * .34; const houseW = w * .64; const houseH = h * .37; const gap = houseW * .07; const roomW = (houseW - gap * 3) / 2; const roomY = houseY + houseH * .25; const roomH = houseH * .56;
  for (let index = 0; index < state.rooms.length; index += 1) { const roomX = houseX + gap + index * (roomW + gap); if (x >= roomX && x <= roomX + roomW && y >= roomY && y <= roomY + roomH) return state.rooms[index]; }
  return null;
}

ui.canvas.addEventListener('click', (event) => {
  const room = hitRoom(event);
  if (!room) return;
  state.selectedRoom = room.id;
  activeTab = 'rooms';
  renderAll();
  showToast(`${room.name}: ${roomStatus(room).label}.`);
});

ui.tabs.forEach((tab) => tab.addEventListener('click', () => {
  const nextTab = tab.dataset.tab;
  if (window.matchMedia('(max-width: 600px)').matches) {
    if (activeTab === nextTab) mobilePanelOpen = !mobilePanelOpen;
    else { activeTab = nextTab; mobilePanelOpen = true; }
  } else {
    activeTab = nextTab;
  }
  renderPanel();
}));
ui.start.addEventListener('click', () => { ui.intro.classList.add('hidden'); state.phase = 'prepare'; activeTab = 'overview'; renderAll(); });
ui.reset.addEventListener('click', () => { if (!window.confirm('Xóa tiến trình Nhà Nhỏ 2D và chơi lại?')) return; state = freshState(); activeTab = 'overview'; mobilePanelOpen = false; clearInterval(timer); ui.intro.classList.remove('hidden'); renderAll(); });
window.addEventListener('resize', drawScene);

if (state.phase === 'intro') {
  ui.intro.classList.remove('hidden');
} else {
  ui.intro.classList.add('hidden');
  startTimer();
}
renderAll();
