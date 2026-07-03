/**
 * @file app.js
 * @description Core de Bara Soacha Academy.
 *              Estado global, helpers de UI, inicialización de componentes
 *              comunes (sidebar, navbar, dark mode) y utilidades generales.
 * @module App
 */

import { logout, getCurrentProfile, getCurrentRole } from './auth.js';
import { db, COLLECTIONS, ROLES } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// ─── Estado global ─────────────────────────────────────────────────────────────
export const AppState = {
  theme:       localStorage.getItem('bara_theme') || 'light',
  sidebarOpen: true,
  loading:     false,
  page:        ''
};

// ─── Inicialización del Shell (sidebar + navbar) ───────────────────────────────

/**
 * Inicializa el shell de la aplicación (componentes comunes de layout).
 * Llamar al inicio de cada página protegida.
 */
export const initShell = () => {
  applyTheme(AppState.theme);
  bindSidebarToggle();
  bindDarkModeToggle();
  bindLogout();
  renderUserBadge();
  highlightActiveNav();
  bindSidebarLinks();
};

// ─── Tema ──────────────────────────────────────────────────────────────────────

/**
 * Aplica el tema (light/dark) al documento.
 * @param {'light'|'dark'} theme
 */
export const applyTheme = (theme) => {
  AppState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bara_theme', theme);

  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
};

const bindDarkModeToggle = () => {
  const btn = document.getElementById('darkModeBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    applyTheme(AppState.theme === 'dark' ? 'light' : 'dark');
  });
};

// ─── Sidebar ───────────────────────────────────────────────────────────────────

const bindSidebarToggle = () => {
  const btn     = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => toggleSidebar());
  overlay?.addEventListener('click', () => closeSidebar());

  // En móvil, cerrar sidebar por defecto
  if (window.innerWidth < 992) closeSidebar();
};

export const toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  const overlay = document.getElementById('sidebarOverlay');

  AppState.sidebarOpen = !AppState.sidebarOpen;
  sidebar?.classList.toggle('collapsed', !AppState.sidebarOpen);
  main?.classList.toggle('sidebar-collapsed', !AppState.sidebarOpen);
  overlay?.classList.toggle('active', AppState.sidebarOpen && window.innerWidth < 992);
};

const closeSidebar = () => {
  AppState.sidebarOpen = false;
  document.getElementById('sidebar')?.classList.add('collapsed');
  document.getElementById('mainContent')?.classList.add('sidebar-collapsed');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
};

/** Resalta el enlace activo en el sidebar según la URL actual. */
const highlightActiveNav = () => {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const page = link.getAttribute('data-page');
    link.classList.toggle('active', current === page || current === '' && page === 'dashboard.html');
  });
};

const bindSidebarLinks = () => {
  // Cerrar sidebar en móvil al navegar
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) closeSidebar();
    });
  });
};

// ─── Usuario badge ─────────────────────────────────────────────────────────────

/** Renderiza las iniciales y nombre del usuario en la navbar. */
const renderUserBadge = () => {
  const profile = getCurrentProfile();
  if (!profile) return;

  const nameEl   = document.getElementById('navUserName');
  const roleEl   = document.getElementById('navUserRole');
  const avatarEl = document.getElementById('navAvatar');

  if (nameEl)   nameEl.textContent   = profile.displayName || 'Usuario';
  if (roleEl)   roleEl.textContent   = ROLES[profile.role?.toUpperCase()]?.label || profile.role;
  if (avatarEl) {
    if (profile.photoURL) {
      avatarEl.innerHTML = `<img src="${profile.photoURL}" alt="Avatar" class="avatar-img">`;
    } else {
      avatarEl.textContent      = getInitials(profile.displayName || '');
      avatarEl.style.background = stringToColor(profile.displayName || '');
    }
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────

const bindLogout = () => {
  document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const ok = await showConfirm('¿Cerrar sesión?', 'Se cerrará tu sesión actual.');
    if (ok) {
      showLoader('Cerrando sesión…');
      await logout();
    }
  });
};

// ─── Loader global ────────────────────────────────────────────────────────────

/**
 * Muestra el loader global de pantalla completa.
 * @param {string} [message]
 */
export const showLoader = (message = 'Cargando…') => {
  const loader = document.getElementById('globalLoader');
  const msg    = document.getElementById('loaderMessage');
  if (loader) loader.classList.add('active');
  if (msg)    msg.textContent = message;
  AppState.loading = true;
};

/** Oculta el loader global. */
export const hideLoader = () => {
  document.getElementById('globalLoader')?.classList.remove('active');
  AppState.loading = false;
};

// ─── Notificaciones Toast (SweetAlert2) ───────────────────────────────────────

/**
 * Muestra un toast de notificación.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=3500]
 */
export const toast = (message, type = 'info', duration = 3500) => {
  if (!window.Swal) { console.log(`[${type.toUpperCase()}] ${message}`); return; }
  Swal.fire({
    toast:              true,
    position:           'top-end',
    icon:               type,
    title:              message,
    showConfirmButton:  false,
    timer:              duration,
    timerProgressBar:   true,
    customClass:        { popup: 'bara-toast' }
  });
};

/**
 * Muestra un diálogo de confirmación.
 * @param {string} title
 * @param {string} text
 * @param {string} [confirmText='Confirmar']
 * @returns {Promise<boolean>}
 */
export const showConfirm = async (title, text, confirmText = 'Confirmar') => {
  if (!window.Swal) return confirm(`${title}\n${text}`);
  const result = await Swal.fire({
    title, text, icon: 'warning',
    showCancelButton:    true,
    confirmButtonColor:  '#8B0000',
    cancelButtonColor:   '#6c757d',
    confirmButtonText:   confirmText,
    cancelButtonText:    'Cancelar',
    reverseButtons:      true
  });
  return result.isConfirmed;
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

/**
 * Inserta skeletons de carga en un contenedor.
 * @param {string} containerId
 * @param {number} count
 * @param {'card'|'row'|'stat'} [type='card']
 */
export const showSkeleton = (containerId, count = 3, type = 'card') => {
  const el = document.getElementById(containerId);
  if (!el) return;
  const templates = {
    stat: `<div class="skeleton-stat"><div class="sk-icon"></div><div class="sk-text"><div class="sk-line w-50"></div><div class="sk-line w-75"></div></div></div>`,
    card: `<div class="skeleton-card"><div class="sk-line w-100"></div><div class="sk-line w-75"></div><div class="sk-line w-50"></div></div>`,
    row:  `<div class="skeleton-row"><div class="sk-circle"></div><div class="sk-text"><div class="sk-line w-60"></div><div class="sk-line w-40"></div></div></div>`
  };
  el.innerHTML = Array(count).fill(templates[type] || templates.card).join('');
};

// ─── Firestore Helpers ────────────────────────────────────────────────────────

/**
 * Obtiene todos los documentos de una colección como array.
 * @param {string} collectionName
 * @param {Array} [constraints] - Array de constraints de Firestore (where, orderBy…)
 * @returns {Promise<Array>}
 */
export const getCollection = async (collectionName, constraints = []) => {
  try {
    const q    = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`[App] Error al obtener colección ${collectionName}:`, err);
    return [];
  }
};

/**
 * Obtiene un documento por ID.
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<Object|null>}
 */
export const getDocument = async (collectionName, docId) => {
  try {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error(`[App] Error al obtener documento ${docId}:`, err);
    return null;
  }
};

/**
 * Crea un documento en Firestore.
 * @param {string} collectionName
 * @param {Object} data
 * @returns {Promise<string|null>} ID del documento creado
 */
export const createDocument = async (collectionName, data) => {
  try {
    const ref = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  } catch (err) {
    console.error(`[App] Error al crear documento en ${collectionName}:`, err);
    return null;
  }
};

/**
 * Actualiza un documento en Firestore.
 * @param {string} collectionName
 * @param {string} docId
 * @param {Object} data
 * @returns {Promise<boolean>}
 */
export const updateDocument = async (collectionName, docId, data) => {
  try {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (err) {
    console.error(`[App] Error al actualizar ${docId}:`, err);
    return false;
  }
};

/**
 * Elimina un documento de Firestore.
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<boolean>}
 */
export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (err) {
    console.error(`[App] Error al eliminar ${docId}:`, err);
    return false;
  }
};

/**
 * Suscribe a cambios en tiempo real de una colección.
 * @param {string} collectionName
 * @param {Function} callback - Recibe array de documentos
 * @param {Array} [constraints]
 * @returns {Function} Unsubscribe function
 */
export const subscribeCollection = (collectionName, callback, constraints = []) => {
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => {
    console.error(`[App] Error en snapshot de ${collectionName}:`, err);
  });
};

// ─── Utilidades generales ─────────────────────────────────────────────────────

export const formatDate  = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
};

export const formatCOP   = (v) =>
  new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(v);

export const getInitials = (name = '') => {
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : name.substring(0,2).toUpperCase();
};

export const stringToColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
};

export const truncate    = (text = '', max = 40) =>
  text.length > max ? text.substring(0, max) + '…' : text;

export const today = () => new Date().toISOString().split('T')[0];

/** Genera un saludo según la hora del día. */
export const getGreeting = (name = '') => {
  const h = new Date().getHours();
  const s = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return `${s}${name ? ', ' + name.split(' ')[0] : ''} 👋`;
};
