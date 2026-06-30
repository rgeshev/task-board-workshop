import { getPageContentContainer, initLayout } from '../components/layout/AppLayout/AppLayout.js';

const routes = [
  {
    path: '/',
    load: () => import('../pages/Home/Home.js'),
  },
  {
    path: '/login',
    load: () => import('../pages/Login/Login.js'),
  },
  {
    path: '/dashboard',
    load: () => import('../pages/Dashboard/Dashboard.js'),
  },
  {
    path: '/projects/:id/tasks',
    load: () => import('../pages/ProjectTasks/ProjectTasks.js'),
  },
];

let currentPageCleanup = null;

function matchRoute(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    const pathParts = normalizedPath.split('/').filter(Boolean);

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};
    let matched = true;

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        params[routePart.slice(1)] = decodeURIComponent(pathPart);
      } else if (routePart !== pathPart) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { route, params };
    }
  }

  return null;
}

async function navigate(path, { replace = false } = {}) {
  const match = matchRoute(path);

  if (!match) {
    window.location.href = '/';
    return;
  }

  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  const contentContainer = getPageContentContainer();
  contentContainer.innerHTML = '';

  const pageModule = await match.route.load();
  currentPageCleanup = pageModule.render(contentContainer, match.params);

  if (replace) {
    history.replaceState({ path }, '', path);
  } else {
    history.pushState({ path }, '', path);
  }

  updateActiveNavLink(path);
}

function updateActiveNavLink(path) {
  const normalizedPath = path.replace(/\/+$/, '') || '/';

  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const linkPath = link.getAttribute('data-nav-link');
    const isActive =
      normalizedPath === linkPath ||
      (linkPath !== '/' && normalizedPath.startsWith(linkPath));

    link.classList.toggle('active', isActive);
  });
}

function handleLinkClick(event) {
  const link = event.target.closest('[data-router-link]');
  if (!link) {
    return;
  }

  const href = link.getAttribute('href');
  if (!href || href.startsWith('http')) {
    return;
  }

  event.preventDefault();
  navigate(href);
}

export function initRouter() {
  initLayout();

  document.addEventListener('click', handleLinkClick);
  window.addEventListener('popstate', () => {
    navigate(window.location.pathname, { replace: true });
  });

  navigate(window.location.pathname, { replace: true });
}

export { navigate };
