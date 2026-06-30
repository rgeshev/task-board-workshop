import template from './Dashboard.html?raw';
import './Dashboard.css';
import { fetchDashboardStats } from '../../lib/api/dashboard.js';
import { toast } from '../../lib/toast.js';

function formatCount(value) {
  return new Intl.NumberFormat().format(value);
}

function setLoading(container, loading) {
  container.querySelector('[data-dashboard-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-dashboard-stats]')?.classList.toggle('opacity-50', loading);
}

function renderStats(container, stats) {
  container.querySelector('[data-stat-projects]').textContent = formatCount(stats.projectCount);
  container.querySelector('[data-stat-open]').textContent = formatCount(stats.openTaskCount);
  container.querySelector('[data-stat-done]').textContent = formatCount(stats.doneTaskCount);
}

export function render(container) {
  container.innerHTML = template;

  let cancelled = false;

  async function loadStats() {
    setLoading(container, true);

    try {
      const stats = await fetchDashboardStats();
      if (cancelled) return;
      renderStats(container, stats);
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load dashboard stats.');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  loadStats();

  return () => {
    cancelled = true;
  };
}
