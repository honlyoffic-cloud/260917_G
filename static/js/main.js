/**
 * TaskFlow - 스마트 할일 관리 애플리케이션 프론트엔드 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current State
    const state = {
        status: 'all',
        category: 'all',
        priority: 'all',
        search: '',
        sortBy: 'created_desc',
        todos: []
    };

    // DOM Elements
    const elements = {
        currentDateText: document.getElementById('currentDateText'),
        statTotalCount: document.getElementById('statTotalCount'),
        statPendingCount: document.getElementById('statPendingCount'),
        statCompletedCount: document.getElementById('statCompletedCount'),
        statRateText: document.getElementById('statRateText'),
        statProgressBar: document.getElementById('statProgressBar'),
        
        countAll: document.getElementById('countAll'),
        countActive: document.getElementById('countActive'),
        countCompleted: document.getElementById('countCompleted'),

        addTodoForm: document.getElementById('addTodoForm'),
        taskTitleInput: document.getElementById('taskTitleInput'),
        toggleDetailsBtn: document.getElementById('toggleDetailsBtn'),
        formDetailsRow: document.getElementById('formDetailsRow'),
        taskCategorySelect: document.getElementById('taskCategorySelect'),
        taskPrioritySelect: document.getElementById('taskPrioritySelect'),
        taskDueDateInput: document.getElementById('taskDueDateInput'),
        taskDescriptionInput: document.getElementById('taskDescriptionInput'),

        tabButtons: document.querySelectorAll('.tab-btn'),
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        filterCategory: document.getElementById('filterCategory'),
        filterPriority: document.getElementById('filterPriority'),
        sortOrder: document.getElementById('sortOrder'),

        todoList: document.getElementById('todoList'),
        emptyState: document.getElementById('emptyState'),
        loadingSpinner: document.getElementById('loadingSpinner'),

        // Edit Modal
        editModal: document.getElementById('editModal'),
        editTodoForm: document.getElementById('editTodoForm'),
        closeEditModalBtn: document.getElementById('closeEditModalBtn'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),
        editTodoId: document.getElementById('editTodoId'),
        editTitleInput: document.getElementById('editTitleInput'),
        editCategorySelect: document.getElementById('editCategorySelect'),
        editPrioritySelect: document.getElementById('editPrioritySelect'),
        editDueDateInput: document.getElementById('editDueDateInput'),
        editDescriptionInput: document.getElementById('editDescriptionInput'),

        toastContainer: document.getElementById('toastContainer')
    };

    // Initialize Current Date Badge
    initDateDisplay();

    // Set Default Due Date to today for quick reference
    const todayStr = new Date().toISOString().split('T')[0];
    elements.taskDueDateInput.value = todayStr;

    // Load Todos & Stats
    fetchTodos();
    fetchStats();

    // Event Listeners
    setupEventListeners();

    /* ==========================================================================
       Core Functions
       ========================================================================== */

    function initDateDisplay() {
        const now = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const day = days[now.getDay()];
        elements.currentDateText.textContent = `${year}.${month}.${date} (${day})`;
    }

    function setupEventListeners() {
        // Toggle Form Details
        elements.toggleDetailsBtn.addEventListener('click', () => {
            const isVisible = elements.formDetailsRow.style.display !== 'none';
            elements.formDetailsRow.style.display = isVisible ? 'none' : 'grid';
            elements.toggleDetailsBtn.classList.toggle('active', !isVisible);
        });

        // Add Todo Form Submit
        elements.addTodoForm.addEventListener('submit', handleAddTodo);

        // Status Tabs Click
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.status = btn.dataset.status;
                fetchTodos();
            });
        });

        // Search Input with Debounce
        let searchTimeout = null;
        elements.searchInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            elements.clearSearchBtn.style.display = val ? 'block' : 'none';
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.search = val;
                fetchTodos();
            }, 300);
        });

        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.clearSearchBtn.style.display = 'none';
            state.search = '';
            fetchTodos();
        });

        // Category & Priority Filters
        elements.filterCategory.addEventListener('change', (e) => {
            state.category = e.target.value;
            fetchTodos();
        });

        elements.filterPriority.addEventListener('change', (e) => {
            state.priority = e.target.value;
            fetchTodos();
        });

        // Sort Order
        elements.sortOrder.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            fetchTodos();
        });

        // Modal Controls
        elements.closeEditModalBtn.addEventListener('click', closeEditModal);
        elements.cancelEditBtn.addEventListener('click', closeEditModal);
        elements.editModal.addEventListener('click', (e) => {
            if (e.target === elements.editModal) closeEditModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.editModal.style.display === 'flex') {
                closeEditModal();
            }
        });
        elements.editTodoForm.addEventListener('submit', handleUpdateTodo);
    }

    /* ==========================================================================
       API Calls & Data Fetching
       ========================================================================== */

    async function fetchTodos() {
        showLoading(true);
        try {
            const params = new URLSearchParams({
                status: state.status,
                category: state.category,
                priority: state.priority,
                search: state.search,
                sort_by: state.sortBy
            });

            const res = await fetch(`/api/todos?${params.toString()}`);
            if (!res.ok) throw new Error('목록 조회 실패');
            
            const data = await res.json();
            state.todos = data.todos || [];
            renderTodoList(state.todos);
        } catch (err) {
            console.error(err);
            showToast('할일 목록을 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) return;
            const stats = await res.json();

            elements.statTotalCount.textContent = stats.total;
            elements.statPendingCount.textContent = stats.pending;
            elements.statCompletedCount.textContent = stats.completed;
            elements.statRateText.textContent = `${stats.rate}%`;
            elements.statProgressBar.style.width = `${stats.rate}%`;

            elements.countAll.textContent = stats.total;
            elements.countActive.textContent = stats.pending;
            elements.countCompleted.textContent = stats.completed;
        } catch (err) {
            console.error('Stats fetch error:', err);
        }
    }

    async function handleAddTodo(e) {
        e.preventDefault();
        const title = elements.taskTitleInput.value.trim();
        if (!title) {
            showToast('할일 제목을 입력해주세요.', 'error');
            return;
        }

        const payload = {
            title: title,
            description: elements.taskDescriptionInput.value.trim(),
            category: elements.taskCategorySelect.value,
            priority: elements.taskPrioritySelect.value,
            due_date: elements.taskDueDateInput.value
        };

        try {
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '등록 실패');
            }

            // Reset Input Fields
            elements.taskTitleInput.value = '';
            elements.taskDescriptionInput.value = '';
            elements.taskTitleInput.focus();

            showToast('할 일이 성공적으로 등록되었습니다.', 'success');
            await fetchTodos();
            await fetchStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function toggleTodoStatus(todoId) {
        try {
            const res = await fetch(`/api/todos/${todoId}/toggle`, {
                method: 'PATCH'
            });
            if (!res.ok) throw new Error('상태 변경 실패');
            
            const data = await res.json();
            const isDone = data.todo.completed === 1;
            showToast(isDone ? '완료 처리되었습니다! 🎉' : '진행 중으로 변경되었습니다.', 'info');
            
            await fetchTodos();
            await fetchStats();
        } catch (err) {
            showToast('상태 변경 중 오류가 발생했습니다.', 'error');
        }
    }

    async function deleteTodo(todoId) {
        if (!confirm('정말 이 할일을 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`/api/todos/${todoId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('삭제 실패');

            showToast('할 일이 삭제되었습니다.', 'info');
            await fetchTodos();
            await fetchStats();
        } catch (err) {
            showToast('삭제 중 문제가 발생했습니다.', 'error');
        }
    }

    async function handleUpdateTodo(e) {
        e.preventDefault();
        const todoId = elements.editTodoId.value;
        const title = elements.editTitleInput.value.trim();

        if (!title) {
            showToast('제목을 입력해주세요.', 'error');
            return;
        }

        const payload = {
            title: title,
            category: elements.editCategorySelect.value,
            priority: elements.editPrioritySelect.value,
            due_date: elements.editDueDateInput.value,
            description: elements.editDescriptionInput.value.trim()
        };

        try {
            const res = await fetch(`/api/todos/${todoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '수정 실패');
            }

            closeEditModal();
            showToast('할일이 수정되었습니다.', 'success');
            await fetchTodos();
            await fetchStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    /* ==========================================================================
       Rendering & UI
       ========================================================================== */

    function renderTodoList(todos) {
        elements.todoList.innerHTML = '';

        if (!todos || todos.length === 0) {
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.emptyState.style.display = 'none';

        todos.forEach(todo => {
            const card = document.createElement('div');
            card.className = `todo-card ${todo.completed ? 'completed' : ''}`;
            card.id = `todoCard-${todo.id}`;

            // Due Date Badge HTML
            let dueDateBadge = '';
            if (todo.due_date) {
                const { text, statusClass } = formatDueDate(todo.due_date);
                dueDateBadge = `
                    <span class="badge-due-date ${statusClass}">
                        <i class="fa-regular fa-clock"></i> ${text}
                    </span>
                `;
            }

            card.innerHTML = `
                <button type="button" class="todo-checkbox-btn" aria-label="완료 여부 변경" data-id="${todo.id}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <div class="todo-content">
                    <div class="todo-header-row">
                        <span class="todo-title">${escapeHtml(todo.title)}</span>
                        <div class="todo-badges">
                            <span class="badge badge-priority-${todo.priority}">${todo.priority}</span>
                            <span class="badge badge-category-${todo.category}">${todo.category}</span>
                            ${dueDateBadge}
                        </div>
                    </div>
                    ${todo.description ? `<p class="todo-description">${escapeHtml(todo.description)}</p>` : ''}
                </div>
                <div class="todo-actions">
                    <button type="button" class="action-icon-btn edit-btn" title="수정" data-id="${todo.id}">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="action-icon-btn delete-btn" title="삭제" data-id="${todo.id}">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Event Bindings
            const checkBtn = card.querySelector('.todo-checkbox-btn');
            checkBtn.addEventListener('click', () => toggleTodoStatus(todo.id));

            const editBtn = card.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => openEditModal(todo));

            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            elements.todoList.appendChild(card);
        });
    }

    function openEditModal(todo) {
        elements.editTodoId.value = todo.id;
        elements.editTitleInput.value = todo.title;
        elements.editCategorySelect.value = todo.category || '일반';
        elements.editPrioritySelect.value = todo.priority || '보통';
        elements.editDueDateInput.value = todo.due_date || '';
        elements.editDescriptionInput.value = todo.description || '';

        elements.editModal.style.display = 'flex';
        elements.editTitleInput.focus();
    }

    function closeEditModal() {
        elements.editModal.style.display = 'none';
        elements.editTodoForm.reset();
    }

    function formatDueDate(dueDateStr) {
        if (!dueDateStr) return { text: '', statusClass: '' };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(dueDateStr);
        target.setHours(0, 0, 0, 0);

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { text: `기한초과 (${Math.abs(diffDays)}일 지남)`, statusClass: 'overdue' };
        } else if (diffDays === 0) {
            return { text: '오늘 마감', statusClass: 'today' };
        } else if (diffDays === 1) {
            return { text: '내일 마감 (D-1)', statusClass: 'today' };
        } else {
            return { text: `D-${diffDays} (${dueDateStr.slice(5)})`, statusClass: '' };
        }
    }

    function showLoading(isLoading) {
        elements.loadingSpinner.style.display = isLoading ? 'block' : 'none';
        if (isLoading) {
            elements.emptyState.style.display = 'none';
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check"></i>';
        else if (type === 'error') iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>';

        toast.innerHTML = `${iconHtml}<span>${escapeHtml(message)}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
