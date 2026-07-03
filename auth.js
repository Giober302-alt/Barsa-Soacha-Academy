/**
 * @file auth.js
 * @description Módulo de autenticación para Bara Soacha Academy.
 *              Gestiona login, logout, registro, estado de sesión y
 *              control de acceso basado en roles usando Firebase Auth
 *              + perfil de usuario en Firestore.
 * @module Auth
 */

import { auth, db, COLLECTIONS, ROLES } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// ─── Estado global de sesión ──────────────────────────────────────────────────
let _currentUser   = null;  // Firebase User
let _currentProfile = null; // Documento Firestore del usuario

// ─── Observador de sesión ─────────────────────────────────────────────────────

/**
 * Registra un callback que se ejecuta cuando cambia el estado de autenticación.
 * Envuelve onAuthStateChanged de Firebase y enriquece el usuario con su perfil.
 * @param {Function} callback - Recibe (firebaseUser, firestoreProfile) o (null, null)
 * @returns {Function} Unsubscribe function
 */
export const onSessionChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await fetchUserProfile(firebaseUser.uid);
      _currentUser    = firebaseUser;
      _currentProfile = profile;
      callback(firebaseUser, profile);
    } else {
      _currentUser    = null;
      _currentProfile = null;
      callback(null, null);
    }
  });
};

// ─── Login / Logout ───────────────────────────────────────────────────────────

/**
 * Inicia sesión con correo y contraseña.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ success: boolean, user?: Object, profile?: Object, error?: string }>}
 */
export const login = async (email, password) => {
  try {
    const cred    = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await fetchUserProfile(cred.user.uid);

    if (!profile) {
      await signOut(auth);
      return { success: false, error: 'Perfil de usuario no encontrado. Contacta al administrador.' };
    }

    if (profile.active === false) {
      await signOut(auth);
      return { success: false, error: 'Tu cuenta está desactivada. Contacta al administrador.' };
    }

    // Registrar último acceso
    await setDoc(
      doc(db, COLLECTIONS.USERS, cred.user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );

    return { success: true, user: cred.user, profile };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
};

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<void>}
 */
export const logout = async () => {
  await signOut(auth);
  _currentUser    = null;
  _currentProfile = null;
  window.location.href = getBasePath() + 'login.html';
};

/**
 * Envía un correo de restablecimiento de contraseña.
 * @param {string} email
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (err) {
    return { success: false, error: parseAuthError(err.code) };
  }
};

// ─── Perfil de usuario en Firestore ──────────────────────────────────────────

/**
 * Recupera el perfil de un usuario desde Firestore.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export const fetchUserProfile = async (uid) => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error('[Auth] Error al obtener perfil:', err);
    return null;
  }
};

/**
 * Crea el perfil de un nuevo usuario en Firestore.
 * Llamar después de crear el usuario en Firebase Auth.
 * @param {string} uid
 * @param {Object} profileData
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, profileData) => {
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...profileData,
    active:    true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// ─── Getters de sesión activa ─────────────────────────────────────────────────

/** @returns {import('firebase/auth').User|null} */
export const getCurrentUser    = () => _currentUser;

/** @returns {Object|null} Perfil de Firestore del usuario actual */
export const getCurrentProfile = () => _currentProfile;

/** @returns {string|null} Rol del usuario actual */
export const getCurrentRole    = () => _currentProfile?.role || null;

// ─── Control de acceso basado en roles ───────────────────────────────────────

/**
 * Verifica si el usuario actual tiene al menos el nivel de rol indicado.
 * @param {string} requiredRoleKey - Ej: 'admin', 'coordinator', 'coach'
 * @returns {boolean}
 */
export const hasRole = (requiredRoleKey) => {
  const profile = _currentProfile;
  if (!profile) return false;

  const currentLevel  = ROLES[profile.role?.toUpperCase()]?.level || 0;
  const requiredLevel = ROLES[requiredRoleKey?.toUpperCase()]?.level || 99;
  return currentLevel >= requiredLevel;
};

/**
 * Verifica si el usuario puede realizar una operación específica.
 * Tabla de permisos centralizada del sistema.
 * @param {string} operation - Ej: 'create:student', 'read:payments', 'delete:user'
 * @returns {boolean}
 */
export const can = (operation) => {
  const role = getCurrentRole();
  if (!role) return false;

  const permissions = {
    admin: ['*'],   // Acceso total
    coordinator: [
      'create:student', 'read:student', 'update:student',
      'create:attendance', 'read:attendance', 'update:attendance',
      'read:payments', 'create:payments', 'update:payments',
      'read:tournaments', 'create:tournaments',
      'read:schedules', 'create:schedules',
      'read:announcements', 'create:announcements',
      'read:coaches', 'read:categories',
      'read:reports'
    ],
    coach: [
      'create:attendance', 'read:attendance', 'update:attendance',
      'read:student', 'read:schedules', 'read:categories',
      'read:announcements'
    ],
    parent: [
      'read:attendance:own', 'read:payments:own',
      'read:schedules', 'read:announcements', 'read:tournaments'
    ]
  };

  const userPerms = permissions[role] || [];
  if (userPerms.includes('*')) return true;
  return userPerms.includes(operation) || userPerms.includes(operation.split(':')[0] + ':*');
};

/**
 * Protege una página: si no hay sesión activa, redirige al login.
 * Si se pasa `requiredRole`, valida también el permiso de rol.
 * @param {string} [requiredRole]
 * @returns {Promise<Object|false>} El perfil si tiene acceso, false si no.
 */
export const requireAuth = (requiredRole = null) => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();

      if (!firebaseUser) {
        window.location.href = getBasePath() + 'login.html';
        resolve(false);
        return;
      }

      const profile = await fetchUserProfile(firebaseUser.uid);
      if (!profile || profile.active === false) {
        await signOut(auth);
        window.location.href = getBasePath() + 'login.html';
        resolve(false);
        return;
      }

      _currentUser    = firebaseUser;
      _currentProfile = profile;

      if (requiredRole && !hasRole(requiredRole)) {
        window.location.href = getBasePath() + 'dashboard.html?error=unauthorized';
        resolve(false);
        return;
      }

      resolve(profile);
    });
  });
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Traduce los códigos de error de Firebase Auth a mensajes en español.
 * @param {string} code
 * @returns {string}
 */
const parseAuthError = (code) => {
  const errors = {
    'auth/user-not-found':       'No existe una cuenta con ese correo.',
    'auth/wrong-password':       'Contraseña incorrecta.',
    'auth/invalid-email':        'El formato del correo no es válido.',
    'auth/user-disabled':        'Esta cuenta ha sido deshabilitada.',
    'auth/too-many-requests':    'Demasiados intentos fallidos. Intenta más tarde.',
    'auth/network-request-failed':'Sin conexión a internet. Verifica tu red.',
    'auth/invalid-credential':   'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.'
  };
  return errors[code] || `Error de autenticación (${code}).`;
};

/**
 * Calcula la ruta base según la ubicación del HTML actual.
 * @returns {string}
 */
const getBasePath = () => {
  const path = window.location.pathname;
  return path.includes('/pages/') ? '../' : './';
};
