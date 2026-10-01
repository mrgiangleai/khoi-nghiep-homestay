import * as THREE from 'three';

const BASE_RENT = 200_000;
const DAY_HOURS = 24;
const INITIAL_MONEY = 100_000_000;

const UPGRADE_CATALOG = [
  { id: 'bed', icon: '🛏️', name: 'Giường êm ái', price: 2_500_000, bonus: 50_000, description: 'Giấc ngủ ngon, giá thuê +50.000 ₫' },
  { id: 'bathroom', icon: '🚿', name: 'WC nâng cấp', price: 3_000_000, bonus: 60_000, description: 'Tiện nghi sạch đẹp, giá thuê +60.000 ₫' },
  { id: 'wardrobe', icon: '🗄️', name: 'Tủ quần áo', price: 1_500_000, bonus: 20_000, description: 'Gọn gàng hơn, giá thuê +20.000 ₫' },
  { id: 'dryer', icon: '💨', name: 'Máy sấy tóc', price: 2_000_000, bonus: 25_000, description: 'Thêm tiện lợi, giá thuê +25.000 ₫' },
  { id: 'fan', icon: '🌀', name: 'Quạt mát', price: 800_000, bonus: 15_000, description: 'Mát mẻ cơ bản, giá thuê +15.000 ₫' },
  { id: 'aircon', icon: '❄️', name: 'Máy lạnh', price: 5_000_000, bonus: 80_000, description: 'Nâng tầm trải nghiệm, giá thuê +80.000 ₫' },
  { id: 'bathtub', icon: '🛁', name: 'Bồn tắm', price: 6_000_000, bonus: 100_000, description: 'Một kỳ nghỉ thư giãn, giá thuê +100.000 ₫' },
];

const CAMPAIGNS = [
  { id: 'local', icon: '📍', name: 'Quảng cáo địa phương', price: 300_000, boost: 0.18, discount: 0, description: 'Tăng 18% cơ hội có khách trong ngày tiếp theo.' },
  { id: 'featured', icon: '📣', name: 'Quảng cáo nổi bật', price: 1_000_000, boost: 0.38, discount: 0, description: 'Tăng 38% cơ hội có khách trong ngày tiếp theo.' },
  { id: 'deal', icon: '🏷️', name: 'Gói ưu đãi 10%', price: 200_000, boost: 0.25, discount: 0.1, description: 'Tăng 25% cơ hội có khách, giảm 10% giá phòng.' },
];

const GUEST_NAMES = ['Minh & An', 'Gia đình Lan', 'Huy và bạn', 'Nhóm Mộc', 'Trang & Linh', 'Khách Đồi Mây'];
const ROOM_POSITIONS = [-2.15, 2.15];

const ui = {
  money: document.querySelector('#money-value'),
  day: document.querySelector('#day-value'),
  clock: document.querySelector('#clock-value'),
  phaseDot: document.querySelector('#phase-dot'),
  phaseLabel: document.querySelector('#phase-label'),
  phaseDescription: document.querySelector('#phase-description'),
  marketingStatus: document.querySelector('#marketing-status'),
  panel: document.querySelector('#panel-content'),
  onboarding: document.querySelector('#onboarding'),
  startButton: document.querySelector('#start-game-button'),
  nextDayButton: document.querySelector('#next-day-button'),
  toast: document.querySelector('#toast'),
  scene: document.querySelector('#scene'),
};

const state = {
  money: INITIAL_MONEY,
  day: 1,
  hour: 0,
  phase: 'intro',
  running: false,
  activePanel: 'overview',
  selectedRoom: 'room-1',
  marketing: { name: '', boost: 0, discount: 0, daysLeft: 0 },
  ledger: [],
  rooms: [
    { id: 'room-1', name: 'Phòng Mây', status: 'clean', upgrades: [], guest: null, arrivalPlan: null, arrivalProcessed: false },
    { id: 'room-2', name: 'Phòng Nắng', status: 'clean', upgrades: [], guest: null, arrivalPlan: null, arrivalProcessed: false },
  ],
};

let toastTimer;

function money(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`;
}

function signedMoney(value) {
  return `${value >= 0 ? '+' : ''}${money(value)}`;
}

function roomRent(room) {
  return BASE_RENT + room.upgrades.reduce((total, upgradeId) => {
    const upgrade = UPGRADE_CATALOG.find((item) => item.id === upgradeId);
    return total + (upgrade?.bonus || 0);
  }, 0);
}

function getRoom(roomId) {
  return state.rooms.find((room) => room.id === roomId);
}

function getSelectedRoom() {
  return getRoom(state.selectedRoom) || state.rooms[0];
}

function addTransaction(amount, description) {
  state.money += amount;
  state.ledger.unshift({ amount, description, day: state.day });
  renderAll();
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function formatClock(hour) {
  const safeHour = Math.max(0, Math.min(DAY_HOURS, hour));
  const wholeHour = Math.min(23, Math.floor(safeHour));
  const minutes = safeHour >= DAY_HOURS ? 59 : Math.floor((safeHour - wholeHour) * 60);
  return `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roomStatusLabel(room) {
  if (room.status === 'occupied') return { label: 'Có khách', className: 'busy' };
  if (room.status === 'dirty') return { label: 'Cần dọn', className: 'dirty' };
  return { label: 'Sẵn sàng', className: 'clean' };
}

function phaseText() {
  if (state.phase === 'intro') return ['Chuẩn bị khai trương', 'Bạn đang có một căn nhà và hai phòng trống.', 'idle'];
  if (state.phase === 'running') return ['Homestay đang mở cửa', 'Khách có thể check-in sau 14:00 và check-out trước 12:00.', 'live'];
  return ['Thời gian chuẩn bị', 'Dọn phòng, mua vật phẩm hoặc chạy marketing trước ngày mới.', 'prepare'];
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.toggle('is-error', isError);
  ui.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => ui.toast.classList.remove('is-visible'), 3200);
}

function canSpend(amount) {
  if (state.money >= amount) return true;
  showToast('Ngân sách chưa đủ cho khoản đầu tư này.', true);
  return false;
}

function scheduleRoom(room) {
  if (room.guest || room.status !== 'clean') return;
  const chance = Math.min(0.98, 0.74 + state.marketing.boost);
  room.arrivalPlan = {
    day: state.day,
    hour: randomBetween(14, 21.5),
    shouldArrive: Math.random() < chance,
  };
  room.arrivalProcessed = false;
}

function scheduleDay() {
  state.rooms.forEach((room) => {
    if (!room.guest && room.status === 'clean') scheduleRoom(room);
  });
}

function checkIn(room) {
  const name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  const checkoutHour = randomBetween(6, 11.5);
  const baseRate = roomRent(room);
  const rate = Math.round(baseRate * (1 - state.marketing.discount));
  room.guest = {
    name,
    arrivalDay: state.day,
    checkoutDay: state.day + 1,
    checkoutHour,
    rate,
  };
  room.status = 'occupied';
  showToast(`${name} vừa check-in ${room.name}.`);
}

function checkOut(room) {
  const guest = room.guest;
  if (!guest) return;
  addTransaction(guest.rate, `${room.name}: tiền phòng của ${guest.name}`);
  room.guest = null;
  room.status = 'dirty';
  room.arrivalPlan = null;
  room.arrivalProcessed = true;
  renderAll();
  showToast(`${guest.name} đã check-out. Cần dọn ${room.name}.`);
}

function processRoomEvents() {
  state.rooms.forEach((room) => {
    if (room.guest && room.guest.checkoutDay === state.day && state.hour >= room.guest.checkoutHour) {
      checkOut(room);
    }

    if (!room.guest && room.arrivalPlan && !room.arrivalProcessed && state.hour >= room.arrivalPlan.hour) {
      room.arrivalProcessed = true;
      if (room.arrivalPlan.shouldArrive && room.status === 'clean') {
        checkIn(room);
      }
    }
  });
}

function finishDay() {
  state.hour = DAY_HOURS;
  state.running = false;
  state.phase = 'prepare';
  if (state.marketing.daysLeft > 0) {
    state.marketing.daysLeft -= 1;
    if (state.marketing.daysLeft === 0) {
      state.marketing = { name: '', boost: 0, discount: 0, daysLeft: 0 };
    }
  }
  renderAll();
  showToast(`Ngày ${state.day} đã kết thúc. Hãy chuẩn bị cho ngày tiếp theo.`);
}

function startFirstDay() {
  state.phase = 'running';
  state.running = true;
  state.hour = 0;
  scheduleDay();
  ui.onboarding.classList.add('is-hidden');
  renderAll();
  showToast('Nhà Mây đã mở cửa. Chúc bạn kinh doanh thuận lợi!');
}

function startNextDay() {
  if (state.phase !== 'prepare') return;
  state.day += 1;
  state.hour = 0;
  state.phase = 'running';
  state.running = true;
  state.rooms.forEach((room) => {
    if (!room.guest) {
      room.arrivalPlan = null;
      room.arrivalProcessed = false;
    }
  });
  scheduleDay();
  renderAll();
  showToast(`Ngày ${state.day} bắt đầu. Đồng hồ đang chạy.`);
}

function buyUpgrade(upgradeId) {
  if (state.phase !== 'prepare') {
    showToast('Bạn có thể mua sắm trong thời gian chuẩn bị cuối ngày.', true);
    return;
  }
  const room = getSelectedRoom();
  const upgrade = UPGRADE_CATALOG.find((item) => item.id === upgradeId);
  if (!upgrade || room.upgrades.includes(upgrade.id)) return;
  if (!canSpend(upgrade.price)) return;
  room.upgrades.push(upgrade.id);
  addTransaction(-upgrade.price, `${room.name}: mua ${upgrade.name}`);
  showToast(`${upgrade.name} đã được lắp cho ${room.name}.`);
}

function cleanRoom(roomId, hire = false) {
  const room = getRoom(roomId);
  if (!room || room.status !== 'dirty') return;
  const cost = hire ? 80_000 : 0;
  if (cost && !canSpend(cost)) return;
  room.status = 'clean';
  room.arrivalPlan = null;
  room.arrivalProcessed = false;
  if (state.phase === 'running' && state.hour < 14) scheduleRoom(room);
  if (cost) addTransaction(-cost, `Thuê người dọn ${room.name}`);
  else renderAll();
  showToast(hire ? `${room.name} đã được nhân viên dọn sạch.` : `Bạn đã tự dọn sạch ${room.name}.`);
}

function buyCampaign(campaignId) {
  if (state.phase !== 'prepare') {
    showToast('Marketing được chuẩn bị trước khi bắt đầu ngày mới.', true);
    return;
  }
  const campaign = CAMPAIGNS.find((item) => item.id === campaignId);
  if (!campaign || !canSpend(campaign.price)) return;
  addTransaction(-campaign.price, `Marketing: ${campaign.name}`);
  state.marketing = { name: campaign.name, boost: campaign.boost, discount: campaign.discount, daysLeft: 1 };
  renderAll();
  showToast(`${campaign.name} đã được lên lịch cho ngày tiếp theo.`);
}

function renderHeader() {
  ui.money.textContent = money(state.money);
  ui.day.textContent = String(state.day);
  ui.clock.textContent = state.phase === 'prepare' ? '24:00' : formatClock(state.hour);
  const [label, description, dotClass] = phaseText();
  ui.phaseLabel.textContent = label;
  ui.phaseDescription.textContent = description;
  ui.phaseDot.className = `phase-dot is-${dotClass}`;
  ui.nextDayButton.hidden = state.phase !== 'prepare';
  ui.nextDayButton.textContent = `Bắt đầu ngày ${state.day + 1}`;
  if (state.marketing.daysLeft > 0) {
    const discount = state.marketing.discount ? ` · giảm ${state.marketing.discount * 100}%` : '';
    ui.marketingStatus.textContent = `${state.marketing.name} đang chạy${discount}`;
  } else {
    ui.marketingStatus.textContent = 'Chưa chạy marketing';
  }
}

function renderRoomSummary() {
  return state.rooms.map((room) => {
    const status = roomStatusLabel(room);
    const detail = room.guest ? `${room.guest.name} · ${money(room.guest.rate)}/đêm` : `${money(roomRent(room))}/ngày`;
    return `<div class="room-card">
      <div class="room-card-main"><span class="room-icon">🛏️</span><div><strong>${room.name}</strong><small>${detail}</small></div></div>
      <span class="room-status ${status.className}">${status.label}</span>
    </div>`;
  }).join('');
}

function renderOverview() {
  const occupied = state.rooms.filter((room) => room.status === 'occupied').length;
  const dirty = state.rooms.filter((room) => room.status === 'dirty').length;
  const income = state.ledger.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const costs = Math.abs(state.ledger.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0));
  return `<div class="panel-heading"><div><h2>Tổng quan</h2><p>Điều hành Nhà Mây theo từng ngày.</p></div><span class="panel-heading-icon">🏡</span></div>
    <div class="panel-body">
      <div class="metric-grid"><div class="metric-card"><span>Phòng có khách</span><strong>${occupied}/2</strong></div><div class="metric-card"><span>Phòng cần dọn</span><strong>${dirty}</strong></div><div class="metric-card"><span>Tổng thu nhập</span><strong>${money(income)}</strong></div><div class="metric-card"><span>Đã đầu tư</span><strong>${money(costs)}</strong></div></div>
      <p class="section-label"><span>Hai phòng của bạn</span><span>Giá thuê cơ bản 200.000 ₫</span></p>
      <div class="room-list">${renderRoomSummary()}</div>
      <div class="info-box"><span>💡</span><p>${state.phase === 'prepare' ? 'Đây là lúc tốt nhất để mua vật phẩm, dọn phòng và chạy marketing trước khi mở cửa ngày mới.' : 'Khách mới sẽ xuất hiện ngẫu nhiên sau 14:00. Hãy để ý trạng thái phòng và chuẩn bị dọn sau khi khách rời đi.'}</p></div>
    </div>`;
}

function renderShop() {
  return `<div class="panel-heading"><div><h2>Shop</h2><p>Mở rộng hệ thống homestay của bạn.</p></div><span class="panel-heading-icon">🛒</span></div>
    <div class="panel-body"><div class="coming-soon"><div class="coming-icon">🏘️</div><h3>Nhà mới đang xây dựng</h3><p>Thuê thêm căn nhà, mở thêm phòng và quản lý nhiều địa điểm sẽ xuất hiện trong bản cập nhật sau.</p><div style="margin-top: 15px"><span class="room-status clean">Coming Soon</span></div></div>
      <div class="info-box"><span>🧭</span><p>Trong phiên bản đầu, bạn tập trung tối ưu Nhà Mây với hai phòng cơ bản và tạo dòng tiền ổn định.</p></div>
    </div>`;
}

function renderItems() {
  const room = getSelectedRoom();
  const upgradeCards = UPGRADE_CATALOG.map((upgrade) => {
    const owned = room.upgrades.includes(upgrade.id);
    return `<div class="upgrade-card"><span class="item-icon">${upgrade.icon}</span><div class="item-copy"><strong>${upgrade.name}</strong><span>${upgrade.description}</span></div><button class="buy-button" data-action="buy-upgrade" data-id="${upgrade.id}" type="button" ${owned ? 'disabled' : ''}>${owned ? 'Đã mua' : money(upgrade.price)}</button></div>`;
  }).join('');
  return `<div class="panel-heading"><div><h2>Vật phẩm</h2><p>Nâng cấp phòng để tăng giá trị mỗi đêm.</p></div><span class="panel-heading-icon">🪑</span></div>
    <div class="panel-body panel-scroll"><p class="section-label"><span>Chọn phòng nâng cấp</span><span>${money(roomRent(room))}/ngày</span></p><div class="room-selector">${state.rooms.map((item) => `<button data-action="select-room" data-id="${item.id}" class="${item.id === room.id ? 'is-selected' : ''}" type="button">${item.name}</button>`).join('')}</div><div class="upgrade-list">${upgradeCards}</div><div class="info-box"><span>🧮</span><p>Giá thuê mới được cộng dồn từ các nâng cấp. Mỗi phòng có thể sở hữu mỗi vật phẩm một lần.</p></div></div>`;
}

function renderCleaning() {
  const rows = state.rooms.map((room) => {
    if (room.status === 'dirty') {
      return `<div class="cleaning-row"><span class="room-icon">🧹</span><div class="cleaning-copy"><strong>${room.name}</strong><span>Khách đã rời đi, cần làm sạch trước khi đón khách mới.</span></div><div class="clean-actions"><button class="ghost-button" data-action="clean-room" data-id="${room.id}" type="button">Tự dọn</button><button class="danger-button" data-action="hire-cleaner" data-id="${room.id}" type="button">80k</button></div></div>`;
    }
    const label = room.status === 'occupied' ? `Đang có ${room.guest.name}` : 'Phòng đang sạch';
    return `<div class="cleaning-row"><span class="room-icon">${room.status === 'occupied' ? '🧳' : '✨'}</span><div class="cleaning-copy"><strong>${room.name}</strong><span>${label}</span></div><span class="room-status ${room.status === 'occupied' ? 'busy' : 'clean'}">${room.status === 'occupied' ? 'Có khách' : 'Sạch'}</span></div>`;
  }).join('');
  return `<div class="panel-heading"><div><h2>Dọn dẹp</h2><p>Phòng sạch là điều kiện để nhận lượt khách mới.</p></div><span class="panel-heading-icon">🧹</span></div><div class="panel-body"><div class="cleaning-list">${rows}</div><div class="info-box"><span>🧼</span><p>Tự dọn không tốn tiền. Nếu thuê người dọn, chi phí là 80.000 ₫ mỗi phòng.</p></div></div>`;
}

function renderMarketing() {
  const cards = CAMPAIGNS.map((campaign) => `<div class="campaign-card"><span class="item-icon">${campaign.icon}</span><div class="item-copy"><strong>${campaign.name}</strong><span>${campaign.description}</span></div><button class="buy-button" data-action="buy-marketing" data-id="${campaign.id}" type="button" ${state.phase !== 'prepare' ? 'disabled' : ''}>${money(campaign.price)}</button></div>`).join('');
  const note = state.phase !== 'prepare' ? 'Marketing sẽ mở lại trong thời gian chuẩn bị cuối ngày.' : 'Chiến dịch được áp dụng cho ngày tiếp theo.';
  return `<div class="panel-heading"><div><h2>Marketing</h2><p>Thu hút thêm khách về Nhà Mây.</p></div><span class="panel-heading-icon">📣</span></div><div class="panel-body"><div class="campaign-list">${cards}</div><div class="info-box"><span>📊</span><p>${note} Mỗi chiến dịch kéo dài một ngày.</p></div></div>`;
}

function renderRevenue() {
  const income = state.ledger.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const costs = Math.abs(state.ledger.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0));
  const ledger = state.ledger.slice(0, 10).map((item) => `<div class="ledger-row"><div class="ledger-copy"><strong>${item.description}</strong><span>Ngày ${item.day}</span></div><span class="ledger-amount ${item.amount >= 0 ? 'income' : 'cost'}">${signedMoney(item.amount)}</span></div>`).join('');
  return `<div class="panel-heading"><div><h2>Doanh thu</h2><p>Theo dõi dòng tiền của homestay.</p></div><span class="panel-heading-icon">📈</span></div><div class="panel-body panel-scroll"><div class="metric-grid"><div class="metric-card"><span>Tổng thu</span><strong>${money(income)}</strong></div><div class="metric-card"><span>Tổng chi</span><strong>${money(costs)}</strong></div><div class="metric-card"><span>Lợi nhuận</span><strong>${money(income - costs)}</strong></div><div class="metric-card"><span>Số giao dịch</span><strong>${state.ledger.length}</strong></div></div><p class="section-label"><span>Sổ giao dịch</span><span>${state.ledger.length} khoản</span></p><div class="ledger-list">${ledger || '<div class="empty-state">Chưa có giao dịch. Khi khách checkout, doanh thu sẽ được ghi nhận tại đây.</div>'}</div></div>`;
}

function renderPanel() {
  const panels = { overview: renderOverview, shop: renderShop, items: renderItems, cleaning: renderCleaning, marketing: renderMarketing, revenue: renderRevenue };
  ui.panel.innerHTML = panels[state.activePanel]();
  document.querySelectorAll('.dock-button').forEach((button) => button.classList.toggle('is-active', button.dataset.panel === state.activePanel));
}

function renderAll() {
  renderHeader();
  renderPanel();
  updateRoomMarkers();
}

function resetDemo() {
  window.location.reload();
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'open-panel') {
    state.activePanel = button.dataset.panel;
    renderPanel();
  } else if (action === 'select-room') {
    state.selectedRoom = button.dataset.id;
    renderPanel();
  } else if (action === 'buy-upgrade') {
    buyUpgrade(button.dataset.id);
  } else if (action === 'clean-room') {
    cleanRoom(button.dataset.id, false);
  } else if (action === 'hire-cleaner') {
    cleanRoom(button.dataset.id, true);
  } else if (action === 'buy-marketing') {
    buyCampaign(button.dataset.id);
  } else if (action === 'reset-demo') {
    resetDemo();
  }
});

ui.startButton.addEventListener('click', startFirstDay);
ui.nextDayButton.addEventListener('click', startNextDay);

let lastFrame = performance.now();
function tick(now) {
  const deltaSeconds = Math.min(0.2, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state.running && state.phase === 'running') {
    state.hour += deltaSeconds;
    processRoomEvents();
    if (state.hour >= DAY_HOURS) finishDay();
    renderHeader();
    updateRoomMarkers();
  }
  animateScene(now / 1000);
  requestAnimationFrame(tick);
}

// ----- Three.js 2.5D scene -----

const threeScene = new THREE.Scene();
threeScene.fog = new THREE.Fog(0xd6e9df, 16, 34);
const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 100);
camera.position.set(11, 9, 13);
camera.lookAt(0, 1.4, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
ui.scene.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xfff8e7, 0x6d8d82, 2.4);
threeScene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xfff4db, 3.3);
sun.position.set(-5, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
threeScene.add(sun);

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0xc8ddc9, roughness: 1 }),
  path: new THREE.MeshStandardMaterial({ color: 0xe8d4b9, roughness: 1 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf4e5c9, roughness: .9 }),
  roof: new THREE.MeshStandardMaterial({ color: 0xb8745f, roughness: .95 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x6e8f72, roughness: .8 }),
  door: new THREE.MeshStandardMaterial({ color: 0x8b5e4e, roughness: .85 }),
  window: new THREE.MeshStandardMaterial({ color: 0x99c9c1, roughness: .45, metalness: .05 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x3f5149, roughness: .9 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf0b78e, roughness: .85 }),
  dress: new THREE.MeshStandardMaterial({ color: 0xd8895e, roughness: .85 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x4d3a32, roughness: .95 }),
};

function addMesh(geometry, material, position, parent = threeScene) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

addMesh(new THREE.PlaneGeometry(28, 20), materials.ground, [0, -0.12, 0]).rotation.x = -Math.PI / 2;
addMesh(new THREE.PlaneGeometry(4, 14), materials.path, [0, -0.02, 5]).rotation.x = -Math.PI / 2;

const cabin = new THREE.Group();
threeScene.add(cabin);
addMesh(new THREE.BoxGeometry(8, .42, 5), materials.trim, [0, .2, 0], cabin);
addMesh(new THREE.BoxGeometry(7.8, 3.35, 4.85), materials.wall, [0, 2.05, 0], cabin);
const roof = addMesh(new THREE.ConeGeometry(5.55, 2.7, 4), materials.roof, [0, 5.1, 0], cabin);
roof.rotation.y = Math.PI / 4;
addMesh(new THREE.BoxGeometry(1.35, 2.05, .16), materials.door, [0, 1.2, 2.5], cabin);
addMesh(new THREE.BoxGeometry(.13, .13, .13), materials.yellow || materials.trim, [.42, 1.2, 2.62], cabin);
[-2.3, 2.3].forEach((x) => {
  addMesh(new THREE.BoxGeometry(1.35, 1.15, .14), materials.trim, [x, 2.2, 2.51], cabin);
  addMesh(new THREE.BoxGeometry(1.05, .85, .16), materials.window, [x, 2.2, 2.61], cabin);
  addMesh(new THREE.BoxGeometry(.08, 1.0, .18), materials.trim, [x, 2.2, 2.7], cabin);
  addMesh(new THREE.BoxGeometry(1.2, .08, .18), materials.trim, [x, 2.2, 2.7], cabin);
});
addMesh(new THREE.BoxGeometry(3.2, .22, 1.2), materials.trim, [0, .52, 3.05], cabin);

const markerMaterials = [new THREE.MeshStandardMaterial({ color: 0xe6b85c, emissive: 0x3a2b13, emissiveIntensity: .1 }), new THREE.MeshStandardMaterial({ color: 0xe6b85c, emissive: 0x3a2b13, emissiveIntensity: .1 })];
const roomMarkers = state.rooms.map((room, index) => {
  const marker = addMesh(new THREE.SphereGeometry(.17, 16, 10), markerMaterials[index], [ROOM_POSITIONS[index], 3.52, 2.7]);
  marker.userData.roomId = room.id;
  return marker;
});

function createTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  threeScene.add(tree);
  addMesh(new THREE.CylinderGeometry(.16, .23, 1.8, 7), materials.door, [0, .85, 0], tree);
  const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: 0x769d79, roughness: 1 }));
  leaves.position.y = 2.15;
  leaves.castShadow = true;
  tree.add(leaves);
}
createTree(-6, -1, 1.2);
createTree(6, -1.5, 1.05);
createTree(-5.1, 5, .72);
createTree(5, 5, .8);

const girl = new THREE.Group();
girl.position.set(0, 0, 4.6);
threeScene.add(girl);
addMesh(new THREE.CylinderGeometry(.42, .58, 1.35, 8), materials.dress, [0, 1.35, 0], girl);
addMesh(new THREE.SphereGeometry(.45, 18, 12), materials.skin, [0, 2.35, 0], girl);
addMesh(new THREE.SphereGeometry(.47, 18, 12), materials.hair, [0, 2.57, -.04], girl);
addMesh(new THREE.BoxGeometry(.12, .75, .12), materials.skin, [-.48, 1.45, 0], girl).rotation.z = -.35;
addMesh(new THREE.BoxGeometry(.12, .75, .12), materials.skin, [.48, 1.45, 0], girl).rotation.z = .35;
addMesh(new THREE.CylinderGeometry(.11, .12, .7, 7), materials.dark, [-.19, .35, 0], girl);
addMesh(new THREE.CylinderGeometry(.11, .12, .7, 7), materials.dark, [.19, .35, 0], girl);

function updateRoomMarkers() {
  roomMarkers.forEach((marker, index) => {
    const room = state.rooms[index];
    const color = room.status === 'occupied' ? 0x688e73 : room.status === 'dirty' ? 0xbd6c62 : 0xe6b85c;
    marker.material.color.setHex(color);
    marker.material.emissive.setHex(color);
    marker.position.y = 3.52 + Math.sin(performance.now() / 450 + index) * .035;
  });
}

function animateScene(time) {
  girl.position.y = Math.sin(time * 2.1) * .025;
  girl.rotation.y = Math.sin(time * .55) * .025;
  renderer.render(threeScene, camera);
}

function resizeScene() {
  const width = Math.max(1, ui.scene.clientWidth);
  const height = Math.max(1, ui.scene.clientHeight);
  const aspect = width / height;
  const viewHeight = 11.3;
  camera.left = -viewHeight * aspect / 2;
  camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

window.addEventListener('resize', resizeScene);
resizeScene();
renderAll();
requestAnimationFrame(tick);
