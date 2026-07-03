/**
 * @file dashboard.js
 * @description Dashboard de Bara Soacha Academy.
 *              Lee indicadores en tiempo real desde Firestore,
 *              renderiza stat-cards, gráficas Chart.js y widgets laterales.
 * @module Dashboard
 */

import { requireAuth, getCurrentProfile } from './auth.js';
import { db, COLLECTIONS }               from './firebase-config.js';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs, Timestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  initShell, toast, showSkeleton, hideLoader, showLoader,
  formatDate, formatCOP, getInitials, stringToColor, truncate, getGreeting
} from './app.js';

// ─── Instancias Chart.js ──────────────────────────────────────────────────────
let chartAttendance = null;
let chartPayments   = null;
let chartCategories = null;

// ─── Unsuscribers de Firestore ────────────────────────────────────────────────
const unsubs = [];

// ─── Entrada ──────────────────────────────────────────────────────────────────

/**
 * Inicializa el dashboard. Se llama desde dashboard.html.
 */
export const initDashboard = async () => {
  showLoader('Cargando panel…');

  const profile = await requireAuth();
  if (!profile) return;

  initShell();
  renderGreeting(profile);

  // Renderizar skeletons mientras cargan los datos
  showSkeleton('statsContainer', 6, 'stat');

  // Suscribir datos en tiempo real
  unsubs.push(
    subscribeStats(),
    subscribeSchedules(),
    subscribeAnnouncements()
  );

  // Gráficas (única carga, no tiempo real para no saturar lecturas)
  await loadCharts();

  hideLoader();
  startClock();
};

// ─── Saludo ────────────────────────────────────────────────────────────────────

const renderGreeting = (profile) => {
  const el = document.getElementById('dashGreeting');
  if (el) el.textContent = getGreeting(profile.displayName);

  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
};

// ─── Stats en tiempo real ─────────────────────────────────────────────────────

/**
 * Suscribe a las colecciones necesarias para calcular los indicadores del dashboard.
 * Usa onSnapshot para actualizaciones en tiempo real.
 * @returns {Function} unsubscribe
 */
const subscribeStats = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Snapshot de students activos
  const studQ = query(
    collection(db, COLLECTIONS.STUDENTS),
    where('active', '==', true)
  );

  return onSnapshot(studQ, async (studSnap) => {
    const totalStudents = studSnap.size;
    const birthdays     = studSnap.docs.filter(d => {
      const bd = d.data().birthDate;
      if (!bd) return false;
      const bDate = bd.toDate ? bd.toDate() : new Date(bd);
      return bDate.getMonth() === new Date().getMonth();
    }).length;

    // Asistencia de hoy
    const attQ    = query(collection(db, COLLECTIONS.ATTENDANCE), where('date', '==', todayStr));
    const attSnap = await getDocs(attQ);
    const arrived = attSnap.docs.filter(d =>
      ['arrived', 'late'].includes(d.data().status)
    ).length;
    const pct = totalStudents > 0 ? Math.round((arrived / totalStudents) * 100) : 0;

    // Pagos pendientes/vencidos
    const payQ    = query(
      collection(db, COLLECTIONS.PAYMENTS),
      where('status', 'in', ['pending', 'overdue'])
    );
    const paySnap = await getDocs(payQ);

    // Próximos torneos
    const now     = Timestamp.now();
    const torQ    = query(
      collection(db, COLLECTIONS.TOURNAMENTS),
      where('date', '>=', now),
      orderBy('date'),
      limit(3)
    );
    const torSnap = await getDocs(torQ);

    // Renderizar
    renderStats({
      totalStudents,
      arrived,
      pct,
      pendingPayments: paySnap.size,
      nextTournaments: torSnap.size,
      birthdays
    });
  }, (err) => {
    console.error('[Dashboard] Error en subscribeStats:', err);
    toast('Error al cargar indicadores', 'error');
  });
};

// ─── Render de stat cards ─────────────────────────────────────────────────────

const renderStats = (stats) => {
  const container = document.getElementById('statsContainer');
  if (!container) return;

  const cards = [
    {
      id:      'statStudents',
      label:   'Total alumnos',
      value:   stats.totalStudents,
      icon:    'fas fa-users',
      color:   'var(--color-primary)',
      bg:      'var(--color-primary-10)',
      suffix:  '',
      trend:   null
    },
    {
      id:      'statAttendance',
      label:   'Asistencia hoy',
      value:   stats.arrived,
      icon:    'fas fa-clipboard-check',
      color:   '#198754',
      bg:      '#19875415',
      suffix:  `(${stats.pct}%)`,
      trend:   stats.pct >= 80 ? 'up' : 'down'
    },
    {
      id:      'statPending',
      label:   'Pagos pendientes',
      value:   stats.pendingPayments,
      icon:    'fas fa-exclamation-circle',
      color:   stats.pendingPayments > 5 ? '#dc3545' : '#ffc107',
      bg:      stats.pendingPayments > 5 ? '#dc354515' : '#ffc10715',
      suffix:  '',
      trend:   stats.pendingPayments > 5 ? 'down' : 'neutral'
    },
    {
      id:      'statTournaments',
      label:   'Próximos torneos',
      value:   stats.nextTournaments,
      icon:    'fas fa-trophy',
      color:   'var(--color-gold)',
      bg:      'var(--color-gold-10)',
      suffix:  '',
      trend:   null
    },
    {
      id:      'statBirthdays',
      label:   'Cumpleaños este mes',
      value:   stats.birthdays,
      icon:    'fas fa-birthday-cake',
      color:   '#9c27b0',
      bg:      '#9c27b015',
      suffix:  '',
      trend:   null
    }
  ];

  container.innerHTML = cards.map(card => `
    <div class="stat-card" id="${card.id}">
      <div class="stat-icon" style="background:${card.bg};color:${card.color}">
        <i class="${card.icon}"></i>
      </div>
      <div class="stat-body">
        <div class="stat-value" data-target="${card.value}">0</div>
        <div class="stat-label">${card.label}</div>
        ${card.suffix ? `<span class="stat-suffix">${card.suffix}</span>` : ''}
      </div>
      ${card.trend ? `
        <div class="stat-trend trend-${card.trend}">
          <i class="fas fa-arrow-${card.trend === 'up' ? 'up' : card.trend === 'down' ? 'down' : 'right'}"></i>
        </div>` : ''}
    </div>
  `).join('');

  // Animar contadores
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    animateCounter(el, parseInt(el.dataset.target));
  });

  // Animar entrada de cards
  document.querySelectorAll('.stat-card').forEach((card, i) => {
    card.style.cssText = 'opacity:0;transform:translateY(16px)';
    setTimeout(() => {
      card.style.cssText = 'transition:all 0.45s cubic-bezier(0.16,1,0.3,1);opacity:1;transform:translateY(0)';
    }, i * 70);
  });
};

/**
 * Anima el contador numérico de una stat card.
 * @param {HTMLElement} el
 * @param {number} target
 */
const animateCounter = (el, target) => {
  let current = 0;
  if (target === 0) { el.textContent = '0'; return; }
  const step  = Math.max(1, Math.ceil(target / 25));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 35);
};

// ─── Gráficas ─────────────────────────────────────────────────────────────────

const loadCharts = async () => {
  await Promise.all([
    renderAttendanceChart(),
    renderPaymentsChart(),
    renderCategoriesChart()
  ]);
};

/** Gráfica de barras: asistencia últimos 7 días */
const renderAttendanceChart = async () => {
  const canvas = document.getElementById('chartAttendance');
  if (!canvas || !window.Chart) return;
  if (chartAttendance) { chartAttendance.destroy(); chartAttendance = null; }

  const labels = [];
  const data   = [];
  const dias   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(dias[d.getDay()]);

    const q    = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('date', '==', dateStr),
      where('status', 'in', ['arrived','late'])
    );
    const snap = await getDocs(q);
    data.push(snap.size);
  }

  chartAttendance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Asistentes',
        data,
        backgroundColor: 'rgba(139,0,0,0.75)',
        borderColor:     '#8B0000',
        borderWidth:     2,
        borderRadius:    8,
        borderSkipped:   false
      }]
    },
    options: barChartOptions()
  });
};

/** Gráfica de dona: distribución de pagos */
const renderPaymentsChart = async () => {
  const canvas = document.getElementById('chartPayments');
  if (!canvas || !window.Chart) return;
  if (chartPayments) { chartPayments.destroy(); chartPayments = null; }

  const counts = { paid: 0, pending: 0, overdue: 0 };
  const snap   = await getDocs(collection(db, COLLECTIONS.PAYMENTS));
  snap.forEach(d => {
    const s = d.data().status;
    if (s in counts) counts[s]++;
  });

  chartPayments = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Pagado', 'Pendiente', 'Vencido'],
      datasets: [{
        data:            [counts.paid, counts.pending, counts.overdue],
        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
        borderWidth:     0,
        hoverOffset:     8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position:'bottom', labels: { color: cssVar('--text-secondary'), padding:16, font:{size:12} } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
      }
    }
  });
};

/** Gráfica horizontal: alumnos por categoría */
const renderCategoriesChart = async () => {
  const canvas = document.getElementById('chartCategories');
  if (!canvas || !window.Chart) return;
  if (chartCategories) { chartCategories.destroy(); chartCategories = null; }

  const [catsSnap, studsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
    getDocs(query(collection(db, COLLECTIONS.STUDENTS), where('active', '==', true)))
  ]);

  const cats   = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const studs  = studsSnap.docs.map(d => d.data());
  const labels = cats.map(c => c.name);
  const data   = cats.map(c => studs.filter(s => s.categoryId === c.id).length);
  const colors = cats.map(c => c.color || '#8B0000');

  chartCategories = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alumnos',
        data,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor:     colors,
        borderWidth:     2,
        borderRadius:    8
      }]
    },
    options: { ...barChartOptions(), indexAxis: 'y' }
  });
};

/** Opciones base para gráficas de barras */
const barChartOptions = () => ({
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(13,27,62,0.95)',
      titleColor:      '#F0C040',
      bodyColor:       '#ffffff',
      borderColor:     '#8B0000',
      borderWidth:     1,
      padding:         10
    }
  },
  scales: {
    x: {
      grid:  { color: cssVar('--border-color') + '33', drawBorder: false },
      ticks: { color: cssVar('--text-secondary'), font: { size: 11 } }
    },
    y: {
      grid:  { color: cssVar('--border-color') + '33', drawBorder: false },
      ticks: { color: cssVar('--text-secondary'), font: { size: 11 } },
      beginAtZero: true
    }
  }
});

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ─── Widgets laterales ────────────────────────────────────────────────────────

/** Suscribe a los próximos eventos del calendario */
const subscribeSchedules = () => {
  const now = Timestamp.now();
  const q   = query(
    collection(db, COLLECTIONS.SCHEDULES),
    where('startTime', '>=', now),
    orderBy('startTime'),
    limit(5)
  );

  return onSnapshot(q, (snap) => {
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUpcomingEvents(events);
  });
};

const renderUpcomingEvents = (events) => {
  const el = document.getElementById('upcomingEvents');
  if (!el) return;

  if (events.length === 0) {
    el.innerHTML = `<div class="empty-widget"><i class="fas fa-calendar-times"></i><p>Sin eventos próximos</p></div>`;
    return;
  }

  const dias  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  el.innerHTML = events.map(ev => {
    const d = ev.startTime?.toDate ? ev.startTime.toDate() : new Date(ev.startTime);
    return `
      <div class="event-item">
        <div class="event-date-badge">
          <span class="ev-dow">${dias[d.getDay()]}</span>
          <span class="ev-day">${d.getDate()}</span>
          <span class="ev-mon">${meses[d.getMonth()]}</span>
        </div>
        <div class="event-details">
          <p class="ev-title">${ev.title}</p>
          <span class="ev-meta">
            <i class="fas fa-clock"></i>
            ${d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}
            · ${truncate(ev.location || '', 22)}
          </span>
        </div>
        <span class="ev-type-badge type-${(ev.type || 'training').toLowerCase()}">${ev.type || 'Entrenamiento'}</span>
      </div>`;
  }).join('');
};

/** Suscribe a comunicados recientes */
const subscribeAnnouncements = () => {
  const q = query(
    collection(db, COLLECTIONS.ANNOUNCEMENTS),
    orderBy('createdAt', 'desc'),
    limit(4)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAnnouncements(items);
  });
};

const renderAnnouncements = (items) => {
  const el = document.getElementById('recentAnnouncements');
  if (!el) return;

  if (items.length === 0) {
    el.innerHTML = `<div class="empty-widget"><i class="fas fa-bullhorn"></i><p>Sin comunicados</p></div>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="announcement-item ${item.pinned ? 'pinned' : ''}">
      <div class="ann-icon"><i class="fas fa-bullhorn"></i></div>
      <div class="ann-content">
        <p class="ann-title">${truncate(item.title, 40)}</p>
        <span class="ann-date">${formatDate(item.createdAt)}</span>
      </div>
    </div>`).join('');
};

// ─── Reloj digital ────────────────────────────────────────────────────────────

const startClock = () => {
  const tick = () => {
    const el = document.getElementById('liveClock');
    if (!el) return;
    const n = new Date();
    el.textContent = n.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };
  tick();
  setInterval(tick, 1000);
};

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/** Cancela todas las suscripciones activas de Firestore. */
export const destroyDashboard = () => {
  unsubs.forEach(fn => typeof fn === 'function' && fn());
  [chartAttendance, chartPayments, chartCategories].forEach(c => c?.destroy());
};

// Auto-inicializar si el script se carga en dashboard.html
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
