import template from './ProjectForm.html?raw';
import './ProjectForm.css';
import { createProject, fetchProject, updateProject } from '../../lib/api/projects.js';
import { navigate } from '../../router/router.js';
import { toast } from '../../lib/toast.js';

const COPY = {
  add: {
    breadcrumb: 'Add project',
    eyebrow: 'New project',
    title: 'Add project',
    subtitle: 'Create a new board with default stages.',
    submitLabel: 'Create project',
  },
  edit: {
    breadcrumb: 'Edit project',
    eyebrow: 'Edit project',
    title: 'Edit project',
    subtitle: 'Update the project title and description.',
    submitLabel: 'Save changes',
  },
};

function setLoading(container, loading) {
  container.querySelector('[data-form-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-project-form]')?.classList.toggle('d-none', loading);
}

function setSubmitLoading(form, loading) {
  const btn = form.querySelector('[data-submit-btn]');
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving…';
  } else if (btn.dataset.originalHtml) {
    btn.innerHTML = btn.dataset.originalHtml;
  }
}

function applyCopy(container, mode) {
  const copy = COPY[mode];
  container.querySelector('[data-form-breadcrumb]').textContent = copy.breadcrumb;
  container.querySelector('[data-form-eyebrow]').textContent = copy.eyebrow;
  container.querySelector('[data-form-title]').textContent = copy.title;
  container.querySelector('[data-form-subtitle]').textContent = copy.subtitle;
  container.querySelector('[data-submit-label]').textContent = copy.submitLabel;
}

export function render(container, params = {}) {
  container.innerHTML = template;

  const isEdit = Boolean(params.id);
  const projectId = params.id;
  const form = container.querySelector('[data-project-form]');
  let cancelled = false;

  applyCopy(container, isEdit ? 'edit' : 'add');

  async function loadProject() {
    if (!isEdit) return;

    setLoading(container, true);

    try {
      const project = await fetchProject(projectId);
      if (cancelled) return;

      if (!project) {
        toast.error('Project not found.');
        navigate('/projects');
        return;
      }

      form.title.value = project.title;
      form.description.value = project.description ?? '';
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load project.');
      navigate('/projects');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault();

    const title = form.title.value.trim();
    const description = form.description.value.trim();

    if (!title) {
      toast.error('Please enter a project title.');
      return;
    }

    setSubmitLoading(form, true);

    try {
      if (isEdit) {
        await updateProject(projectId, { title, description });
        toast.success('Project updated.');
      } else {
        await createProject({ title, description });
        toast.success('Project created.');
      }

      navigate('/projects');
    } catch (error) {
      toast.fromError(error, isEdit ? 'Could not update project.' : 'Could not create project.');
    } finally {
      setSubmitLoading(form, false);
    }
  };

  form.addEventListener('submit', onSubmit);
  loadProject();

  return () => {
    cancelled = true;
    form.removeEventListener('submit', onSubmit);
  };
}
