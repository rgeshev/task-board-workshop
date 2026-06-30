import './BoardDragDrop.css';

function getDropIndex(columnBody, clientY, draggedId) {
  const cards = [...columnBody.querySelectorAll('.board__task')].filter(
    (card) => card.dataset.taskId !== draggedId
  );

  for (let i = 0; i < cards.length; i += 1) {
    const rect = cards[i].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (clientY < midpoint) {
      return i;
    }
  }

  return cards.length;
}

export function initBoardDragDrop(boardRoot, { onMove }) {
  let draggedTaskId = null;
  let dropStageId = null;
  let dropIndex = 0;
  let placeholder = null;
  let isMoving = false;

  function getPlaceholder() {
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.className = 'board__drop-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
    }
    return placeholder;
  }

  function clearDragState() {
    boardRoot.querySelectorAll('.board__task--dragging').forEach((el) => {
      el.classList.remove('board__task--dragging');
    });
    boardRoot.querySelectorAll('.board__col-body--drag-over').forEach((el) => {
      el.classList.remove('board__col-body--drag-over');
    });
    placeholder?.remove();
    draggedTaskId = null;
    dropStageId = null;
    dropIndex = 0;
  }

  function placePlaceholder(columnBody, clientY) {
    const ph = getPlaceholder();
    const index = getDropIndex(columnBody, clientY, draggedTaskId);
    const cards = [...columnBody.querySelectorAll('.board__task')].filter(
      (card) => card.dataset.taskId !== draggedTaskId
    );

    dropStageId = columnBody.dataset.stageId;
    dropIndex = index;

    if (index >= cards.length) {
      columnBody.appendChild(ph);
    } else {
      columnBody.insertBefore(ph, cards[index]);
    }

    return index;
  }

  const onDragStart = (event) => {
    if (isMoving) {
      event.preventDefault();
      return;
    }

    if (event.target.closest('button, input, label, a')) {
      event.preventDefault();
      return;
    }

    const task = event.target.closest('.board__task');
    if (!task) return;

    draggedTaskId = task.dataset.taskId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedTaskId);

    window.requestAnimationFrame(() => {
      task.classList.add('board__task--dragging');
    });
  };

  const onDragEnd = () => {
    clearDragState();
  };

  const onDragOver = (event) => {
    const columnBody = event.target.closest('.board__col-body');
    if (!columnBody || !draggedTaskId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    columnBody.classList.add('board__col-body--drag-over');
    placePlaceholder(columnBody, event.clientY);
  };

  const onDragLeave = (event) => {
    const columnBody = event.target.closest('.board__col-body');
    if (!columnBody) return;

    const related = event.relatedTarget;
    if (!related || !columnBody.contains(related)) {
      columnBody.classList.remove('board__col-body--drag-over');
    }
  };

  const onDrop = async (event) => {
    event.preventDefault();

    const columnBody = event.target.closest('.board__col-body');
    if (!columnBody || !draggedTaskId || !dropStageId) {
      clearDragState();
      return;
    }

    const taskId = draggedTaskId;
    const stageId = dropStageId;
    const toIndex = dropIndex;

    clearDragState();
    isMoving = true;

    try {
      await onMove({ taskId, stageId, toIndex });
    } finally {
      isMoving = false;
    }
  };

  boardRoot.addEventListener('dragstart', onDragStart);
  boardRoot.addEventListener('dragend', onDragEnd);
  boardRoot.addEventListener('dragover', onDragOver);
  boardRoot.addEventListener('dragleave', onDragLeave);
  boardRoot.addEventListener('drop', onDrop);

  return () => {
    boardRoot.removeEventListener('dragstart', onDragStart);
    boardRoot.removeEventListener('dragend', onDragEnd);
    boardRoot.removeEventListener('dragover', onDragOver);
    boardRoot.removeEventListener('dragleave', onDragLeave);
    boardRoot.removeEventListener('drop', onDrop);
    clearDragState();
  };
}
