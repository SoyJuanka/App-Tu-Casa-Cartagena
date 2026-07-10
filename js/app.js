/* =========================================================
   TU CASA CARTAGENA — app.js
   Lógica de navegación, formularios, calculadora y citas.
   Todo se guarda en localStorage (no hay backend todavía).
   ========================================================= */
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from './firebase-config.js';

(() => {
  'use strict';

  /* ---------- Helpers generales ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const STORAGE_KEYS = {
    citas: 'tcc_citas'
  };

  const NAV_VIEWS = ['view-home', 'view-calculadora', 'view-calculadora-resultado', 'view-citas', 'view-crear-cita'];

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(msg, ms = 2200) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ms);
  }

  /* ---------- Router de vistas ---------- */
  function showView(viewId) {
    $$('.view').forEach(v => v.classList.remove('is-active'));
    const target = document.getElementById(viewId);
    if (!target) return;
    target.classList.add('is-active');
    window.scrollTo(0, 0);

    if (NAV_VIEWS.includes(viewId)) {
      updateBottomNav(viewId);
    }

    if (viewId === 'view-citas' || viewId === 'view-home') {
      renderCitas();
    }
  }

  // Botones con data-goto="viewSuffix" -> "view-<suffix>"
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-goto]');
    if (btn) {
      showView('view-' + btn.dataset.goto);
    }
  });

  /* ---------- Bottom nav (se clona desde el <template>) ---------- */
  function buildBottomNavs() {
    const tpl = $('#tpl-bottom-nav');
    $$('.bottom-nav[data-nav-for]').forEach(nav => {
      nav.appendChild(tpl.content.cloneNode(true));
    });
  }

  function updateBottomNav(activeViewId) {
    // La vista de resultado de la calculadora comparte el tab "Calculadora"
    const highlightId = activeViewId === 'view-calculadora-resultado' ? 'view-calculadora' : activeViewId;
    $$('.nav-item').forEach(item => {
      item.classList.toggle('is-active', item.dataset.view === highlightId);
    });
  }

  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-item');
    if (!navBtn) return;
    const view = navBtn.dataset.view;
    if (view === 'view-captacion') {
      window.open('https://soyjuanka.github.io/Ficha-de-captacion/', '_blank', 'noopener');
      return;
    }
    showView(view);
  });

     /* =========================================================
   AUTENTICACIÓN (Firebase Authentication — real)
   ========================================================= */
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email': 'El correo no tiene un formato válido.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta registrada con ese correo.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
    'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
    'auth/operation-not-allowed': 'El acceso con correo/contraseña no está habilitado en Firebase.'
  };
  return map[code] || 'Ocurrió un error. Intenta de nuevo.';
}

const formLogin = $('#form-login');
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const pass = $('#login-pass').value;
  let ok = true;

  if (!isValidEmail(email)) {
    $('#login-email-error').classList.add('is-visible');
    $('#login-email-pill').classList.add('has-error');
    ok = false;
  } else {
    $('#login-email-error').classList.remove('is-visible');
    $('#login-email-pill').classList.remove('has-error');
  }

  if (pass.length < 6) {
    $('#login-pass-error').classList.add('is-visible');
    $('#login-pass-pill').classList.add('has-error');
    ok = false;
  } else {
    $('#login-pass-error').classList.remove('is-visible');
    $('#login-pass-pill').classList.remove('has-error');
  }

  if (!ok) return;

  const submitBtn = formLogin.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast('¡Bienvenido de nuevo!');
    showView('view-home');
  } catch (err) {
    showToast(friendlyAuthError(err.code));
  } finally {
    submitBtn.disabled = false;
  }
});

$('#btn-forgot').addEventListener('click', async () => {
  const email = $('#login-email').value.trim();
  if (!isValidEmail(email)) {
    showToast('Escribe tu correo arriba y vuelve a intentar');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Te enviamos un enlace de recuperación a tu correo');
  } catch (err) {
    showToast(friendlyAuthError(err.code));
  }
});

const formSignup = $('#form-signup');
formSignup.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#signup-name').value.trim();
  const email = $('#signup-email').value.trim();
  const pass = $('#signup-pass').value;

  if (!name || !isValidEmail(email) || pass.length < 6) {
    showToast('Revisa los datos (la contraseña debe tener mínimo 6 caracteres)');
    return;
  }

  const submitBtn = formSignup.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(credential.user, { displayName: name });
    $('#home-greeting').textContent = `¡Hola ${name}!`;
    showToast('¡Cuenta creada con éxito!');
    showView('view-home');
  } catch (err) {
    showToast(friendlyAuthError(err.code));
  } finally {
    submitBtn.disabled = false;
  }
});

// Mantiene la sesión activa entre recargas: si ya había iniciado sesión,
// entra directo a Home sin pasar por Get Started / Login.
onAuthStateChanged(auth, (user) => {
  if (user) {
    $('#home-greeting').textContent = `¡Hola ${user.displayName || user.email}!`;
    const active = $('.view.is-active');
    const isAuthScreen = !active || ['view-get-started', 'view-login', 'view-signup'].includes(active.id);
    if (isAuthScreen) showView('view-home');
  }
});

// El login con Facebook/Google requiere configurar esos proveedores en Firebase
// (Authentication → Sign-in method → Google / Facebook). Aún no está conectado.
['#btn-facebook-login', '#btn-google-login'].forEach(sel => {
  const el = $(sel);
  if (el) el.addEventListener('click', () => showToast('Inicio de sesión social próximamente'));
});

  /* =========================================================
     CALCULADORA NOTARIAL
     ========================================================= */
  function formatCOP(rawDigits) {
    if (!rawDigits) return '';
    return Number(rawDigits).toLocaleString('es-CO');
  }
  function parseCOP(value) {
    return Number((value || '').replace(/\D/g, '')) || 0;
  }

  ['calc-valor-inmueble', 'calc-valor-catastral', 'calc-valor-credito'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '');
      input.value = formatCOP(digits);
    });
  });

  $$('.segmented').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      $$('.seg-btn', group).forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
    });
  });

  function money(n) {
    return '$ ' + Math.round(n).toLocaleString('es-CO');
  }

  $('#form-calculadora').addEventListener('submit', (e) => {
    e.preventDefault();
    const valorInmueble = parseCOP($('#calc-valor-inmueble').value);
    const valorCatastral = parseCOP($('#calc-valor-catastral').value);
    const valorCredito = parseCOP($('#calc-valor-credito').value);

    if (!valorInmueble) {
      showToast('Ingresa el valor del inmueble');
      return;
    }

    const base = Math.max(valorInmueble, valorCatastral);

    // Tarifas aproximadas de referencia (Colombia) — estimación, no oficial.
    const derechosNotariales = Math.max(base * 0.003, 100000);
    const iva = derechosNotariales * 0.19;
    const derechosRegistro = base * 0.005;
    const impuestoBeneficencia = base * 0.01;
    const retencion = base * 0.01;
    const gestoria = Math.max(base * 0.001, 60000);
    const hipoteca = valorCredito ? valorCredito * 0.005 : 0;

    // Escritura e IVA notarial se dividen tradicionalmente 50/50 entre comprador y vendedor.
    const escrituraComprador = derechosNotariales / 2;
    const escrituraVendedor = derechosNotariales / 2;
    const ivaComprador = iva / 2;
    const ivaVendedor = iva / 2;

    const totalComprador = escrituraComprador + ivaComprador + derechosRegistro + impuestoBeneficencia + gestoria + hipoteca;
    const totalVendedor = escrituraVendedor + ivaVendedor + retencion;
    const total = totalComprador + totalVendedor;

    $('#res-total').textContent = money(total);
    $('#res-total-comprador').textContent = money(totalComprador);
    $('#res-total-vendedor').textContent = money(totalVendedor);

    $('#res-c-total').textContent = money(totalComprador);
    $('#res-c-escritura').textContent = money(escrituraComprador);
    $('#res-c-iva').textContent = money(ivaComprador);
    $('#res-c-registro').textContent = money(derechosRegistro);
    $('#res-c-beneficencia').textContent = money(impuestoBeneficencia);
    $('#res-c-gestoria').textContent = money(gestoria + hipoteca);

    $('#res-v-total').textContent = money(totalVendedor);
    $('#res-v-escritura').textContent = money(escrituraVendedor);
    $('#res-v-iva').textContent = money(ivaVendedor);
    $('#res-v-retencion').textContent = money(retencion);

    showView('view-calculadora-resultado');
  });

  $('#btn-editar-datos').addEventListener('click', () => showView('view-calculadora'));

  $('#btn-nueva-simulacion').addEventListener('click', () => {
    $('#form-calculadora').reset();
    $$('.segmented').forEach(group => {
      $$('.seg-btn', group).forEach((b, i) => b.classList.toggle('is-selected', i === 0));
    });
    showView('view-calculadora');
  });

  /* =========================================================
     CITAS (localStorage)
     ========================================================= */
  const ESTADOS = [
    { value: 'en-proceso', label: 'En Proceso', dotClass: 'pending' },
    { value: 'confirmada', label: 'Confirmada', dotClass: 'pending' },
    { value: 'completada', label: 'Completada', dotClass: 'done' },
    { value: 'cancelada', label: 'Cancelada', dotClass: '' }
  ];

function getCitas() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.citas));
    if (Array.isArray(data)) return data;
  } catch {}
  setCitas([]);
  return [];
}

  function setCitas(list) {
    localStorage.setItem(STORAGE_KEYS.citas, JSON.stringify(list));
  }

  function cryptoId() {
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function estadoInfo(value) {
    return ESTADOS.find(e => e.value === value) || ESTADOS[0];
  }

  function taskCardHTML(cita) {
    const info = estadoInfo(cita.estado);
    return `
      <div class="task-card" data-id="${cita.id}">
        <div class="task-card-row">
          <span>Hora : ${cita.fecha}</span>
          <span class="status-pill">
            Estado:
            <span class="status-dot ${info.dotClass}"></span>
            ${info.label}
          </span>
        </div>
        <div class="task-field"><span class="label">Cliente:</span><span class="value">${escapeHTML(cita.cliente)}</span></div>
        <div class="task-field"><span class="label">Inmueble:</span><span class="value">${escapeHTML(cita.inmueble)}</span></div>
        <div class="task-actions">
          <button class="task-action" data-action="llamar" data-id="${cita.id}">
          <img src="imagenes/call.svg" class="icon" alt="">
            LLAMAR
          </button>
          <button class="task-action" data-action="notas" data-id="${cita.id}">
            <img src="imagenes/notas.svg" class="icon" alt="">
            NOTAS
          </button>
          <button class="task-action" data-action="estado" data-id="${cita.id}">
            <img src="imagenes/estado.svg" class="icon" alt="">
            CAMBIAR ESTADO
          </button>
        </div>
      </div>`;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }

function renderCitas() {
  // Las citas "Completada" quedan guardadas (por si luego se agrega un
  // historial), pero se ocultan de Home y Citas.
  const citas = getCitas().filter(c => c.estado !== 'completada');
  const html = citas.length
    ? citas.map(taskCardHTML).join('')
      : '<div class="empty-state">Aún no tienes citas agendadas.<br>Toca "Agendar Nueva visita" para crear la primera.</div>';

    const citasList = $('#citas-list');
    const homeList = $('#home-task-list');
    if (citasList) citasList.innerHTML = html;
    if (homeList) homeList.innerHTML = html;
  }

  /* ---- Acciones de cada tarjeta (llamar / notas / estado) ---- */
  document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;
    const citas = getCitas();
    const cita = citas.find(c => c.id === id);
    if (!cita) return;

    if (action === 'llamar') {
      window.location.href = `tel:${cita.numero || ''}`;
    }

    if (action === 'notas') {
      const nota = prompt(`Notas para ${cita.cliente}:`, cita.notas || '');
      if (nota !== null) {
        cita.notas = nota;
        setCitas(citas);
        showToast('Nota guardada');
      }
    }

    if (action === 'estado') {
      openEstadoModal(cita, citas);
    }
  });

  /* ---- Modal cambiar estado ---- */
  const modal = $('#modal-estado');
  function openEstadoModal(cita, citas) {
    const optionsWrap = $('#modal-estado-options');
    optionsWrap.innerHTML = ESTADOS.map(e => `
      <button class="modal-option ${e.value === cita.estado ? 'is-selected' : ''}" data-value="${e.value}">
        <span class="status-dot ${e.dotClass}"></span>
        ${e.label}
      </button>
    `).join('');

    optionsWrap.querySelectorAll('.modal-option').forEach(opt => {
      opt.addEventListener('click', () => {
        cita.estado = opt.dataset.value;
        setCitas(citas);
        closeModal();
        renderCitas();
        showToast('Estado actualizado');
      });
    });

    modal.classList.add('is-visible');
  }
  function closeModal() { modal.classList.remove('is-visible'); }
  $('#modal-estado-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ---- Crear nueva cita ---- */
  $('#form-crear-cita').addEventListener('submit', (e) => {
    e.preventDefault();
    const cliente = $('#cc-nombre').value.trim();
    const numero = $('#cc-numero').value.trim();
    const inmueble = $('#cc-inmueble').value.trim();
    const fecha = $('#cc-fecha').value.trim();

    if (!cliente || !numero || !inmueble || !fecha) {
      showToast('Completa todos los campos');
      return;
    }

    const citas = getCitas();
    citas.unshift({
      id: cryptoId(),
      cliente: cliente.toUpperCase(),
      numero,
      inmueble,
      fecha,
      estado: 'en-proceso',
      notas: ''
    });
    setCitas(citas);

    e.target.reset();
    showToast('Cita creada con éxito');
    showView('view-citas');
  });

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    buildBottomNavs();
    renderCitas();

    // Registrar service worker (PWA)
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
