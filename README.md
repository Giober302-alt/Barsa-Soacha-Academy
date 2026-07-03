# ⚽ Bara Soacha Academy

> Sistema de gestión profesional para academias de fútbol. Open Source, Firebase + Vanilla JS.

[![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/Firebase-11.x-orange?logo=firebase)](https://firebase.google.com)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?logo=bootstrap)](https://getbootstrap.com)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?logo=github)](https://pages.github.com)

---

## 📋 Descripción

**Bara Soacha Academy** es una aplicación web de código abierto para la administración integral de academias de fútbol. Desarrollada con tecnologías 100% frontend que consumen Firebase, funciona directamente desde GitHub Pages sin necesidad de servidor propio.

Diseñada para escalar: la arquitectura actual permite migrar fácilmente a una API REST + backend en versiones futuras.

---

## ✨ Funcionalidades (Fase 1)

| Módulo | Estado |
|---|---|
| 🔐 Autenticación (Firebase Auth) | ✅ Implementado |
| 📊 Dashboard con indicadores en tiempo real | ✅ Implementado |
| 👥 Gestión de alumnos | 🔄 Fase 2 |
| 📋 Control de asistencia | 🔄 Fase 2 |
| 💰 Gestión de pagos | 🔄 Fase 2 |
| 🏆 Torneos | 🔄 Fase 3 |
| 📅 Agenda | 🔄 Fase 3 |
| 📢 Comunicados | 🔄 Fase 3 |
| 👪 Portal de padres | 🔄 Fase 4 |
| 📈 Reportes | 🔄 Fase 4 |

---

## 🛠 Tecnologías

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6+** (módulos nativos)
- **Bootstrap 5.3** — layout responsive
- **Font Awesome 6** — íconos
- **Chart.js 4** — gráficas interactivas
- **SweetAlert2** — notificaciones y diálogos

### Backend (Firebase Spark — gratuito)
- **Firebase Authentication** — inicio de sesión con email/contraseña
- **Cloud Firestore** — base de datos en tiempo real
- **Firebase Storage** — almacenamiento de fotos y archivos
- **Firebase Cloud Messaging** — notificaciones push (preparado)
- **Firebase Hosting** — despliegue opcional

---

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/bara-soacha-academy.git
cd bara-soacha-academy
```

### 2. Crear proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto (nombre sugerido: `bara-soacha`)
3. En **Authentication** → Método de inicio de sesión → activa **Correo/Contraseña**
4. En **Firestore Database** → Crear base de datos → **Modo producción**
5. En **Storage** → Comenzar
6. Ve a **Configuración del proyecto** → **Tus apps** → Agregar app **Web** → copia la configuración

### 3. Configurar credenciales

Abre `js/firebase-config.js` y reemplaza los valores de `FIREBASE_CONFIG`:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID"
};
```

### 4. Aplicar reglas de seguridad

En la consola de Firebase:

**Firestore** → Reglas → copia el contenido de `firestore.rules`

**Storage** → Reglas → copia el contenido de `storage.rules`

### 5. Crear el primer usuario administrador

En **Firebase Authentication** → Agregar usuario:
- Email: `admin@barasoacha.co`
- Contraseña: (la que quieras)

Luego en **Firestore** → Colección `users` → Nuevo documento con ID = UID del usuario:

```json
{
  "displayName": "Administrador",
  "email": "admin@barasoacha.co",
  "role": "admin",
  "active": true,
  "photoURL": null,
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

### 6. Abrir la aplicación

Puedes abrirla directamente:
```
Abrir index.html en tu navegador
```

O usar un servidor local (recomendado para evitar problemas con módulos ES):
```bash
# Con Python
python -m http.server 5500

# Con Node.js (npx)
npx serve .

# Con VS Code: instala la extensión "Live Server"
```

Accede en: `http://localhost:5500`

---

## 🌐 Despliegue en GitHub Pages

### Opción A: GitHub Pages (automático)

1. Sube el proyecto a tu repositorio de GitHub
2. Ve a **Settings** → **Pages**
3. Source: **Deploy from a branch** → `main` → `/root`
4. Guarda. En ~2 minutos la URL estará disponible.

> ⚠️ **Importante:** Asegúrate de agregar el dominio de GitHub Pages en Firebase:
> **Authentication** → **Configuración** → **Dominios autorizados** → Agregar `tu-usuario.github.io`

### Opción B: Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 📁 Estructura del proyecto

```
bara-soacha-academy/
│
├── index.html              ← Splash / redirect de entrada
├── login.html              ← Página de inicio de sesión
├── dashboard.html          ← Panel principal
│
├── css/
│   ├── style.css           ← Sistema de diseño (tokens, componentes)
│   └── responsive.css      ← Estilos responsive y breakpoints
│
├── js/
│   ├── firebase-config.js  ← Configuración Firebase (REEMPLAZAR credenciales)
│   ├── auth.js             ← Módulo de autenticación y roles
│   ├── app.js              ← Core: shell, helpers, Firestore CRUD
│   ├── dashboard.js        ← Módulo del dashboard
│   ├── alumnos.js          ← Gestión de alumnos (Fase 2)
│   ├── asistencia.js       ← Control de asistencia (Fase 2)
│   ├── pagos.js            ← Gestión de pagos (Fase 2)
│   ├── torneos.js          ← Torneos (Fase 3)
│   └── reportes.js         ← Reportes (Fase 4)
│
├── img/                    ← Imágenes estáticas
├── icons/                  ← Íconos personalizados
│
├── firestore.rules         ← Reglas de seguridad de Firestore
├── storage.rules           ← Reglas de seguridad de Storage
├── firestore-schema.md     ← Documentación de la estructura de datos
├── firebase.json           ← Configuración de Firebase Hosting
├── .gitignore
└── README.md
```

---

## 🔐 Roles del sistema

| Rol | Descripción | Permisos |
|---|---|---|
| `admin` | Administrador total | Acceso completo a todo el sistema |
| `coordinator` | Coordinador académico | Gestión de alumnos, pagos, asistencia y comunicados |
| `coach` | Entrenador | Pasar asistencia, consultar alumnos y agenda |
| `parent` | Padre de familia | Solo sus hijos: asistencia, pagos, comunicados |

---

## 🗺️ Próximas versiones

### Fase 2
- [ ] Módulo completo de alumnos (CRUD + foto)
- [ ] Control de asistencia (individual y masivo)
- [ ] Gestión de pagos con gráficas

### Fase 3
- [ ] Torneos y convocatorias
- [ ] Agenda con vista de calendario
- [ ] Comunicados con archivos adjuntos

### Fase 4
- [ ] Portal de padres (vista independiente)
- [ ] Reportes exportables (PDF / Excel)
- [ ] Notificaciones push con FCM

### Fase 5 (Enterprise)
- [ ] Código QR para asistencia
- [ ] API REST con Firebase Functions
- [ ] App móvil (PWA / Capacitor)
- [ ] WhatsApp Business API
- [ ] Panel de administración en la nube

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas!

1. Fork el repositorio
2. Crea tu rama: `git checkout -b feat/nombre-feature`
3. Commit tus cambios: `git commit -m "feat: descripción"`
4. Push: `git push origin feat/nombre-feature`
5. Abre un Pull Request

Por favor, sigue la [Guía de Contribución](CONTRIBUTING.md) y el estilo de código existente.

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT**. Ver [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Bara Soacha** — Formando campeones desde el barrio, Soacha, Cundinamarca.

---

*¿Preguntas? Abre un [Issue](https://github.com/tu-usuario/bara-soacha-academy/issues).*
