import { Modal } from 'bootstrap';
import { showConfirm } from '../ConfirmModal/ConfirmModal.js';
import { toast } from '../../lib/toast.js';
import './TaskModal.css';

let modalEl = null;
let modalInstance = null;
let submitHandler = null;

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade task-modal';
  modalEl.tabIndex = -1;
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title h5 mb-0" data-task-modal-title>Task</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <form data-task-form>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label small text-soft" for="task-title">Title</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-card-text"></i></span>
                <input type="text" class="form-control" id="task-title" name="title" required maxlength="120" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small text-soft" for="task-description">Description</label>
              <textarea class="form-control" id="task-description" name="description" rows="3"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label small text-soft" for="task-stage">Stage</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-columns-gap"></i></span>
                <select class="form-select" id="task-stage" name="stageId" required></select>
              </div>
            </div>
            <div class="form-check" data-task-done-wrap>
              <input class="form-check-input" type="checkbox" id="task-done" name="done" />
              <label class="form-check-label" for="task-done">Mark as done</label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-glass" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" class="btn btn-gradient" data-task-submit>Save task</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);
  modalInstance = new Modal(modalEl);

  const form = modalEl.querySelector('[data-task-form]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!submitHandler) return;

    const submitBtn = modalEl.querySelector('[data-task-submit]');
    submitBtn.disabled = true;

    try {
      const values = {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        stageId: form.stageId.value,
        done: form.done.checked,
      };

      if (!values.title) {
        toast.error('Please enter a task title.');
        return;
      }

      await submitHandler(values);
      modalInstance.hide();
    } finally {
      submitBtn.disabled = false;
    }
  });

  return modalEl;
}

function populateStages(stages, selectedStageId) {
  const select = modalEl.querySelector('[name="stageId"]');
  select.innerHTML = stages
    .map(
      (stage) =>
        `<option value="${stage.id}" ${stage.id === selectedStageId ? 'selected' : ''}>${stage.name}</option>`
    )
    .join('');
}

export function openTaskModal({
  mode = 'add',
  stages = [],
  task = null,
  defaultStageId = null,
  onSubmit,
}) {
  ensureModal();

  const isEdit = mode === 'edit';
  const titleEl = modalEl.querySelector('[data-task-modal-title]');
  const submitBtn = modalEl.querySelector('[data-task-submit]');
  const form = modalEl.querySelector('[data-task-form]');
  const doneWrap = modalEl.querySelector('[data-task-done-wrap]');

  titleEl.textContent = isEdit ? 'Edit task' : 'Add task';
  submitBtn.textContent = isEdit ? 'Save changes' : 'Create task';
  doneWrap.classList.toggle('d-none', !isEdit);

  const stageId = task?.stage_id ?? defaultStageId ?? stages[0]?.id ?? '';
  populateStages(stages, stageId);

  form.title.value = task?.title ?? '';
  form.description.value = task?.description ?? '';
  form.done.checked = Boolean(task?.done);

  submitHandler = onSubmit;
  modalInstance.show();

  window.setTimeout(() => form.title.focus(), 200);
}

export function showDeleteTaskConfirm({ itemName } = {}) {
  const label = itemName ? `"${itemName}"` : 'this task';
  return showConfirm({
    title: 'Delete task?',
    message: `Are you sure you want to delete ${label}?`,
    confirmLabel: 'Delete',
    confirmClass: 'btn-danger',
  });
}
