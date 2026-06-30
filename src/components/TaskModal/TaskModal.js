import { Modal } from 'bootstrap';
import { showConfirm } from '../ConfirmModal/ConfirmModal.js';
import {
  deleteTaskAttachment,
  fetchTaskAttachments,
  getAttachmentDownloadUrl,
  uploadTaskAttachment,
  validateAttachmentFile,
} from '../../lib/api/attachments.js';
import { escapeHtml, formatFileSize, truncate } from '../../lib/utils.js';
import { toast } from '../../lib/toast.js';
import './TaskModal.css';

let modalEl = null;
let modalInstance = null;
let submitHandler = null;
let pendingFiles = [];
let currentTaskId = null;
let currentMode = 'add';

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade task-modal';
  modalEl.tabIndex = -1;
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered">
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
              <label class="form-label small text-soft" for="task-due-date">Due date</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-calendar-event"></i></span>
                <input type="date" class="form-control" id="task-due-date" name="dueDate" />
              </div>
            </div>
            <div class="mb-3" data-attachments-section>
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <label class="form-label small text-soft mb-0">Attachments</label>
                <button type="button" class="btn btn-sm btn-glass" data-add-attachment>
                  <i class="bi bi-paperclip me-1"></i>Add file
                </button>
              </div>
              <p class="text-soft small mb-2">Images and PDFs, up to 50 MB each.</p>
              <input
                type="file"
                class="d-none"
                data-attachment-input
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              />
              <ul class="task-modal__attachments list-unstyled mb-0" data-attachment-list></ul>
              <p class="text-soft small mb-0 mt-2 d-none" data-attachment-empty>No attachments yet.</p>
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
  const addBtn = modalEl.querySelector('[data-add-attachment]');
  const fileInput = modalEl.querySelector('[data-attachment-input]');
  const attachmentList = modalEl.querySelector('[data-attachment-list]');

  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files ?? []);
    fileInput.value = '';

    if (!files.length) return;

    if (currentMode === 'add') {
      for (const file of files) {
        try {
          validateAttachmentFile(file);
          pendingFiles.push(file);
        } catch (error) {
          toast.error(error.message);
        }
      }
      renderPendingAttachments();
      return;
    }

    if (!currentTaskId) return;

    for (const file of files) {
      try {
        validateAttachmentFile(file);
        await uploadTaskAttachment(currentTaskId, file);
        toast.success(`"${truncate(file.name, 40)}" uploaded.`);
      } catch (error) {
        toast.fromError(error, `Could not upload "${truncate(file.name, 40)}".`);
      }
    }

    await loadEditAttachments();
  });

  attachmentList.addEventListener('click', async (event) => {
    const viewBtn = event.target.closest('[data-view-attachment]');
    const deleteBtn = event.target.closest('[data-delete-attachment]');
    const removePendingBtn = event.target.closest('[data-remove-pending]');

    if (viewBtn) {
      event.preventDefault();
      const storagePath = viewBtn.getAttribute('data-storage-path');
      try {
        const url = await getAttachmentDownloadUrl(storagePath);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        toast.fromError(error, 'Could not open attachment.');
      }
      return;
    }

    if (removePendingBtn) {
      const index = Number(removePendingBtn.getAttribute('data-index'));
      pendingFiles.splice(index, 1);
      renderPendingAttachments();
      return;
    }

    if (deleteBtn) {
      const attachmentId = deleteBtn.getAttribute('data-attachment-id');
      const fileName = deleteBtn.getAttribute('data-file-name');
      const confirmed = await showConfirm({
        title: 'Delete attachment?',
        message: `Remove "${fileName}" from this task?`,
        confirmLabel: 'Delete',
        confirmClass: 'btn-danger',
      });

      if (!confirmed) return;

      deleteBtn.disabled = true;

      try {
        const attachment = {
          id: attachmentId,
          storage_path: deleteBtn.getAttribute('data-storage-path'),
        };
        await deleteTaskAttachment(attachment);
        toast.success('Attachment deleted.');
        await loadEditAttachments();
      } catch (error) {
        toast.fromError(error, 'Could not delete attachment.');
        deleteBtn.disabled = false;
      }
    }
  });

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
        dueDate: form.dueDate.value || null,
        done: form.done.checked,
        pendingFiles: [...pendingFiles],
      };

      if (!values.title) {
        toast.error('Please enter a task title.');
        return;
      }

      await submitHandler(values);
      modalInstance.hide();
    } catch {
      // Keep modal open when submit handler reports partial failures.
    } finally {
      submitBtn.disabled = false;
    }
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    pendingFiles = [];
    currentTaskId = null;
    currentMode = 'add';
    renderPendingAttachments();
    modalEl.querySelector('[data-attachment-list]').innerHTML = '';
    modalEl.querySelector('[data-attachment-empty]')?.classList.add('d-none');
  });

  return modalEl;
}

function attachmentIcon(mimeType) {
  return mimeType === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-image';
}

function renderPendingAttachments() {
  const listEl = modalEl.querySelector('[data-attachment-list]');
  const emptyEl = modalEl.querySelector('[data-attachment-empty]');

  if (!pendingFiles.length) {
    listEl.innerHTML = '';
    if (currentMode === 'add') {
      emptyEl?.classList.remove('d-none');
    }
    return;
  }

  emptyEl?.classList.add('d-none');
  listEl.innerHTML = pendingFiles
    .map(
      (file, index) => `
        <li class="task-modal__attachment">
          <div class="task-modal__attachment-info">
            <i class="bi ${attachmentIcon(file.type)}"></i>
            <span class="task-modal__attachment-name">${escapeHtml(truncate(file.name, 48))}</span>
            <span class="task-modal__attachment-size text-soft">${formatFileSize(file.size)}</span>
            <span class="badge text-bg-secondary">Pending</span>
          </div>
          <button type="button" class="btn btn-sm btn-glass text-danger" data-remove-pending data-index="${index}" title="Remove">
            <i class="bi bi-x-lg"></i>
          </button>
        </li>
      `
    )
    .join('');
}

async function loadEditAttachments() {
  const listEl = modalEl.querySelector('[data-attachment-list]');
  const emptyEl = modalEl.querySelector('[data-attachment-empty]');

  if (!currentTaskId) return;

  try {
    const attachments = await fetchTaskAttachments(currentTaskId);

    if (!attachments.length) {
      listEl.innerHTML = '';
      emptyEl?.classList.remove('d-none');
      return;
    }

    emptyEl?.classList.add('d-none');
    listEl.innerHTML = attachments
      .map(
        (attachment) => `
          <li class="task-modal__attachment">
            <div class="task-modal__attachment-info">
              <i class="bi ${attachmentIcon(attachment.mime_type)}"></i>
              <span class="task-modal__attachment-name">${escapeHtml(truncate(attachment.file_name, 48))}</span>
              <span class="task-modal__attachment-size text-soft">${formatFileSize(attachment.size_bytes)}</span>
            </div>
            <div class="task-modal__attachment-actions">
              <button
                type="button"
                class="btn btn-sm btn-glass"
                data-view-attachment
                data-storage-path="${escapeHtml(attachment.storage_path)}"
                title="View"
              >
                <i class="bi bi-box-arrow-up-right"></i>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-glass text-danger"
                data-delete-attachment
                data-attachment-id="${attachment.id}"
                data-storage-path="${escapeHtml(attachment.storage_path)}"
                data-file-name="${escapeHtml(attachment.file_name)}"
                title="Delete"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </li>
        `
      )
      .join('');
  } catch (error) {
    toast.fromError(error, 'Could not load attachments.');
  }
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
  currentMode = mode;
  currentTaskId = isEdit ? task?.id ?? null : null;
  pendingFiles = [];

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
  form.dueDate.value = task?.due_date ?? '';
  form.done.checked = Boolean(task?.done);

  renderPendingAttachments();

  if (isEdit && currentTaskId) {
    loadEditAttachments();
  } else {
    modalEl.querySelector('[data-attachment-list]').innerHTML = '';
    modalEl.querySelector('[data-attachment-empty]')?.classList.remove('d-none');
  }

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
