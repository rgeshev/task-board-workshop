import './Toast.css';

const ICONS = {
  error: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
  success: 'bi-check-circle-fill',
};

const DEFAULT_DURATION = {
  error: 6000,
  info: 5000,
  success: 5000,
};

let host = null;
const timers = new Map();

export function initToasts() {
  if (host) return host;

  host = document.createElement('div');
  host.className = 'tb-toast-host';
  host.setAttribute('aria-live', 'polite');
  host.setAttribute('aria-atomic', 'false');
  document.body.appendChild(host);

  return host;
}

function dismissToast(toastEl) {
  if (!toastEl || toastEl.classList.contains('is-leaving')) return;

  const timerId = timers.get(toastEl);
  if (timerId) {
    window.clearTimeout(timerId);
    timers.delete(toastEl);
  }

  toastEl.classList.remove('is-visible');
  toastEl.classList.add('is-leaving');

  window.setTimeout(() => {
    toastEl.remove();
  }, 350);
}

export function pushToast({ message, type = 'info', duration } = {}) {
  if (!message) return null;

  initToasts();

  const toastType = ['error', 'info', 'success'].includes(type) ? type : 'info';
  const toastDuration = duration ?? DEFAULT_DURATION[toastType];

  const toastEl = document.createElement('div');
  toastEl.className = `tb-toast tb-toast--${toastType}`;
  toastEl.setAttribute('role', toastType === 'error' ? 'alert' : 'status');

  toastEl.innerHTML = `
    <span class="tb-toast__icon"><i class="bi ${ICONS[toastType]}"></i></span>
    <div class="tb-toast__body">
      <p class="tb-toast__message"></p>
    </div>
    <button type="button" class="tb-toast__close" aria-label="Dismiss notification">
      <i class="bi bi-x-lg"></i>
    </button>
    <div class="tb-toast__progress" aria-hidden="true">
      <div class="tb-toast__progress-bar" style="animation-duration: ${toastDuration}ms"></div>
    </div>
  `;

  toastEl.querySelector('.tb-toast__message').textContent = message;

  const closeBtn = toastEl.querySelector('.tb-toast__close');
  closeBtn.addEventListener('click', () => dismissToast(toastEl));

  host.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.add('is-visible');
  });

  const timerId = window.setTimeout(() => dismissToast(toastEl), toastDuration);
  timers.set(toastEl, timerId);

  return toastEl;
}
