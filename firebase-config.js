/**
 * @file firebase-config.js
 * @description Configuración central de Firebase para Bara Soacha Academy.
 *
 *  ╔══════════════════════════════════════════════════════════════════╗
 *  ║  INSTRUCCIONES DE CONFIGURACIÓN                                 ║
 *  ║  1. Crea un proyecto en https://console.firebase.google.com     ║
 *  ║  2. Activa Authentication > Email/Password                      ║
 *  ║  3. Activa Firestore Database (modo producción)                 ║
 *  ║  4. Activa Storage                                              ║
 *  ║  5. Ve a Configuración del proyecto > Tus apps > Web            ║
 *  ║  6. Reemplaza los valores de FIREBASE_CONFIG abajo              ║
 *  ╚══════════════════════════════════════════════════════════════════╝
 *
 * @module FirebaseConfig
 * @version 1.0.0
 */

import { initializeApp }        from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth }              from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore }         from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getStorage }           from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
import { getMessaging,
         isSupported }          from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js';

// ─── Credenciales del proyecto Firebase ──────────────────────────────────────
// ⚠  Reemplaza estos valores con los de tu proyecto Firebase.
// ⚠  Para producción, mueve estas credenciales a variables de entorno
//    o usa un archivo .env con un bundler (Vite/Webpack).
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAEvI3p3jP6Mgc4iCka1Wd_1FdhF9Bx7ZQ",
  authDomain: "barsa-soacha.firebaseapp.com",
  projectId: "barsa-soacha",
  storageBucket: "barsa-soacha.firebasestorage.app",
  messagingSenderId: "588228650490",
  appId: "1:588228650490:web:0e00c78acdbb8bc1d1b043"
};  

// ─── Inicialización de Firebase ───────────────────────────────────────────────
const firebaseApp = initializeApp(FIREBASE_CONFIG);

// ─── Servicios exportados ─────────────────────────────────────────────────────

/** Instancia de Firebase Authentication */
export const auth    = getAuth(firebaseApp);

/** Instancia de Cloud Firestore */
export const db      = getFirestore(firebaseApp);

/** Instancia de Firebase Storage */
export const storage = getStorage(firebaseApp);

/**
 * Instancia de Firebase Cloud Messaging.
 * Se inicializa de forma asíncrona porque requiere verificar soporte del navegador.
 * Preparado para notificaciones push en versiones futuras.
 * @type {Promise<import('firebase/messaging').Messaging|null>}
 */
export const messagingPromise = (async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('[FCM] Messaging no soportado en este navegador.');
      return null;
    }
    const { getMessaging: gm } = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js');
    return gm(firebaseApp);
  } catch (err) {
    console.warn('[FCM] No se pudo inicializar Messaging:', err);
    return null;
  }
})();

// ─── Colecciones de Firestore (nombres centralizados) ────────────────────────
/**
 * Mapa de nombres de colecciones de Firestore.
 * Centralizar aquí evita errores de tipeo y facilita refactoring.
 */
export const COLLECTIONS = {
  USERS:         'users',
  STUDENTS:      'students',
  PARENTS:       'parents',
  COACHES:       'coaches',
  CATEGORIES:    'categories',
  ATTENDANCE:    'attendance',
  PAYMENTS:      'payments',
  TOURNAMENTS:   'tournaments',
  SCHEDULES:     'schedules',
  NOTIFICATIONS: 'notifications',
  ANNOUNCEMENTS: 'announcements',
  REPORTS:       'reports',
  SETTINGS:      'settings'
};

// ─── Roles del sistema ────────────────────────────────────────────────────────
/**
 * Roles disponibles en la aplicación.
 * El campo `level` define la jerarquía de permisos (mayor = más privilegios).
 */
export const ROLES = {
  ADMIN:       { key: 'admin',       label: 'Administrador',   level: 4 },
  COORDINATOR: { key: 'coordinator', label: 'Coordinador',     level: 3 },
  COACH:       { key: 'coach',       label: 'Entrenador',      level: 2 },
  PARENT:      { key: 'parent',      label: 'Padre de familia',level: 1 }
};

export default firebaseApp;
