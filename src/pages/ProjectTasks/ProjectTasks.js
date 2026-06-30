import template from './ProjectTasks.html?raw';
import './ProjectTasks.css';

export function render(container, params = {}) {
  container.innerHTML = template;

  const projectId = params.id ?? '';
  container.querySelectorAll('[data-project-id]').forEach((el) => {
    el.textContent = projectId;
  });
  container.querySelectorAll('[data-project-id-label]').forEach((el) => {
    el.textContent = projectId;
  });

  return () => {};
}
