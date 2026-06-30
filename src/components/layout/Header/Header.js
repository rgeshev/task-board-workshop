import template from './Header.html?raw';
import './Header.css';
import { getSession, signOut } from '../../../lib/auth.js';
import { go } from '../../../lib/navigation.js';

let logoutHandler = null;

function renderAuthSlot(slot, session) {
  const dashboardItems = document.querySelectorAll('[data-auth-dashboard]');
  dashboardItems.forEach((item) => {
    item.classList.toggle('d-none', !session);
  });

  if (session) {
    const email = session.user.email ?? 'Account';
    slot.innerHTML = `
      <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
        <span class="app-header__user text-soft small d-none d-lg-inline">${email}</span>
        <button type="button" class="btn btn-glass" data-logout>
          <i class="bi bi-box-arrow-right me-1"></i>Logout
        </button>
      </div>
    `;

    const btn = slot.querySelector('[data-logout]');
    logoutHandler = async () => {
      btn.disabled = true;
      try {
        await signOut();
        go('/');
      } catch (error) {
        console.error(error);
        btn.disabled = false;
      }
    };
    btn.addEventListener('click', logoutHandler);
    return;
  }

  slot.innerHTML = `
    <a class="btn btn-gradient" href="/login" data-router-link data-nav-link="/login">
      <i class="bi bi-box-arrow-in-right me-1"></i>Login
    </a>
  `;
}

export function renderHeader(container) {
  container.innerHTML = template;
  refreshHeaderAuth();
}

export async function refreshHeaderAuth() {
  const slot = document.querySelector('[data-auth-slot]');
  if (!slot) return;

  if (logoutHandler) {
    slot.querySelector('[data-logout]')?.removeEventListener('click', logoutHandler);
    logoutHandler = null;
  }

  const session = await getSession();
  renderAuthSlot(slot, session);
}
