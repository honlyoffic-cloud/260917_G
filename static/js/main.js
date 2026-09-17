/**
 * 맛집노트 - 맛집 관리 애플리케이션 프론트엔드 스크립트
 */

document.addEventListener('DOMContentLoaded', () => {
    // Current State
    const state = {
        status: 'all',
        category: 'all',
        rating: 'all',
        search: '',
        sortBy: 'created_desc',
        restaurants: []
    };

    // DOM Elements
    const elements = {
        currentDateText: document.getElementById('currentDateText'),
        statTotalCount: document.getElementById('statTotalCount'),
        statPendingCount: document.getElementById('statPendingCount'),
        statCompletedCount: document.getElementById('statCompletedCount'),
        statAvgRating: document.getElementById('statAvgRating'),
        statRateText: document.getElementById('statRateText'),
        statProgressBar: document.getElementById('statProgressBar'),

        countAll: document.getElementById('countAll'),
        countActive: document.getElementById('countActive'),
        countCompleted: document.getElementById('countCompleted'),

        addRestaurantForm: document.getElementById('addRestaurantForm'),
        nameInput: document.getElementById('nameInput'),
        toggleDetailsBtn: document.getElementById('toggleDetailsBtn'),
        formDetailsRow: document.getElementById('formDetailsRow'),
        categorySelect: document.getElementById('categorySelect'),
        priceSelect: document.getElementById('priceSelect'),
        addressInput: document.getElementById('addressInput'),
        linkInput: document.getElementById('linkInput'),
        memoInput: document.getElementById('memoInput'),

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
        editRestaurantForm: document.getElementById('editRestaurantForm'),
        closeEditModalBtn: document.getElementById('closeEditModalBtn'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),
        editId: document.getElementById('editId'),
        editNameInput: document.getElementById('editNameInput'),
        editCategorySelect: document.getElementById('editCategorySelect'),
        editPriceSelect: document.getElementById('editPriceSelect'),
        editAddressInput: document.getElementById('editAddressInput'),
        editLinkInput: document.getElementById('editLinkInput'),
        editRatingSelect: document.getElementById('editRatingSelect'),
        editMemoInput: document.getElementById('editMemoInput'),

        toastContainer: document.getElementById('toastContainer')
    };

    // Initialize Current Date Badge
    initDateDisplay();

    // Load Restaurants & Stats
    fetchRestaurants();
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

        // Add Restaurant Form Submit
        elements.addRestaurantForm.addEventListener('submit', handleAddRestaurant);

        // Status Tabs Click
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.status = btn.dataset.status;
                fetchRestaurants();
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
                fetchRestaurants();
            }, 300);
        });

        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.clearSearchBtn.style.display = 'none';
            state.search = '';
            fetchRestaurants();
        });

        // Category & Rating Filters
        elements.filterCategory.addEventListener('change', (e) => {
            state.category = e.target.value;
            fetchRestaurants();
        });

        elements.filterPriority.addEventListener('change', (e) => {
            state.rating = e.target.value;
            fetchRestaurants();
        });

        // Sort Order
        elements.sortOrder.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            fetchRestaurants();
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
        elements.editRestaurantForm.addEventListener('submit', handleUpdateRestaurant);
    }

    /* ==========================================================================
       API Calls & Data Fetching
       ========================================================================== */

    async function fetchRestaurants() {
        showLoading(true);
        try {
            const params = new URLSearchParams({
                status: state.status,
                category: state.category,
                rating: state.rating,
                search: state.search,
                sort_by: state.sortBy
            });

            const res = await fetch(`/api/restaurants?${params.toString()}`);
            if (!res.ok) throw new Error('목록 조회 실패');

            const data = await res.json();
            state.restaurants = data.restaurants || [];
            renderRestaurantList(state.restaurants);
        } catch (err) {
            console.error(err);
            showToast('맛집 목록을 불러오는 중 오류가 발생했습니다.', 'error');
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
            elements.statPendingCount.textContent = stats.planned;
            elements.statCompletedCount.textContent = stats.visited;
            elements.statRateText.textContent = `${stats.rate}%`;
            elements.statProgressBar.style.width = `${stats.rate}%`;
            elements.statAvgRating.textContent = stats.avg_rating > 0 ? `(평균 ★${stats.avg_rating})` : '';

            elements.countAll.textContent = stats.total;
            elements.countActive.textContent = stats.planned;
            elements.countCompleted.textContent = stats.visited;
        } catch (err) {
            console.error('Stats fetch error:', err);
        }
    }

    async function handleAddRestaurant(e) {
        e.preventDefault();
        const name = elements.nameInput.value.trim();
        if (!name) {
            showToast('가게 이름을 입력해주세요.', 'error');
            return;
        }

        const payload = {
            name: name,
            memo: elements.memoInput.value.trim(),
            category: elements.categorySelect.value,
            price_range: elements.priceSelect.value,
            address: elements.addressInput.value.trim(),
            link: elements.linkInput.value.trim()
        };

        try {
            const res = await fetch('/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '등록 실패');
            }

            // Reset Input Fields
            elements.nameInput.value = '';
            elements.memoInput.value = '';
            elements.addressInput.value = '';
            elements.linkInput.value = '';
            elements.nameInput.focus();

            showToast('맛집이 성공적으로 등록되었습니다.', 'success');
            await fetchRestaurants();
            await fetchStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function toggleVisited(id) {
        try {
            const res = await fetch(`/api/restaurants/${id}/toggle`, {
                method: 'PATCH'
            });
            if (!res.ok) throw new Error('상태 변경 실패');

            const data = await res.json();
            const isVisited = data.restaurant.visited === 1;
            showToast(isVisited ? '방문 완료로 표시했어요! 🍽️' : '방문 예정으로 변경했어요.', 'info');

            await fetchRestaurants();
            await fetchStats();
        } catch (err) {
            showToast('상태 변경 중 오류가 발생했습니다.', 'error');
        }
    }

    async function deleteRestaurant(id) {
        if (!confirm('정말 이 맛집을 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`/api/restaurants/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('삭제 실패');

            showToast('맛집이 삭제되었습니다.', 'info');
            await fetchRestaurants();
            await fetchStats();
        } catch (err) {
            showToast('삭제 중 문제가 발생했습니다.', 'error');
        }
    }

    async function handleUpdateRestaurant(e) {
        e.preventDefault();
        const id = elements.editId.value;
        const name = elements.editNameInput.value.trim();

        if (!name) {
            showToast('가게 이름을 입력해주세요.', 'error');
            return;
        }

        const payload = {
            name: name,
            category: elements.editCategorySelect.value,
            price_range: elements.editPriceSelect.value,
            address: elements.editAddressInput.value.trim(),
            link: elements.editLinkInput.value.trim(),
            rating: parseInt(elements.editRatingSelect.value, 10),
            memo: elements.editMemoInput.value.trim()
        };

        try {
            const res = await fetch(`/api/restaurants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '수정 실패');
            }

            closeEditModal();
            showToast('맛집 정보가 수정되었습니다.', 'success');
            await fetchRestaurants();
            await fetchStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    /* ==========================================================================
       Rendering & UI
       ========================================================================== */

    function renderRestaurantList(restaurants) {
        elements.todoList.innerHTML = '';

        if (!restaurants || restaurants.length === 0) {
            elements.emptyState.style.display = 'block';
            return;
        }

        elements.emptyState.style.display = 'none';

        restaurants.forEach(item => {
            const card = document.createElement('div');
            card.className = `todo-card ${item.visited ? 'completed' : ''}`;
            card.id = `todoCard-${item.id}`;

            let addressBadge = '';
            if (item.address) {
                addressBadge = `
                    <span class="badge-due-date">
                        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.address)}
                    </span>
                `;
            }

            let linkButton = '';
            if (item.link && /^https?:\/\//i.test(item.link)) {
                // Only render http(s) links as clickable — anything else (e.g. javascript:)
                // is skipped so it can never execute in the page.
                linkButton = `
                    <a class="action-icon-btn link-btn" title="참고 링크 열기" href="${escapeAttr(item.link)}" target="_blank" rel="noopener noreferrer">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                `;
            }

            card.innerHTML = `
                <button type="button" class="todo-checkbox-btn" aria-label="방문 여부 변경" data-id="${item.id}" title="방문 완료로 표시">
                    <i class="fa-solid fa-check"></i>
                </button>
                <div class="todo-content">
                    <div class="todo-header-row">
                        <span class="todo-title">${escapeHtml(item.name)}</span>
                        <div class="todo-badges">
                            <span class="badge badge-category-${item.category}">${item.category}</span>
                            <span class="badge badge-price-${item.price_range}">${item.price_range}</span>
                            ${renderStars(item.rating, item.visited)}
                            ${addressBadge}
                        </div>
                    </div>
                    ${item.memo ? `<p class="todo-description">${escapeHtml(item.memo)}</p>` : ''}
                </div>
                <div class="todo-actions">
                    ${linkButton}
                    <button type="button" class="action-icon-btn edit-btn" title="수정" data-id="${item.id}">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button type="button" class="action-icon-btn delete-btn" title="삭제" data-id="${item.id}">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Event Bindings
            const checkBtn = card.querySelector('.todo-checkbox-btn');
            checkBtn.addEventListener('click', () => toggleVisited(item.id));

            const editBtn = card.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => openEditModal(item));

            const deleteBtn = card.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteRestaurant(item.id));

            elements.todoList.appendChild(card);
        });
    }

    function renderStars(rating, visited) {
        if (!visited) return '';
        if (!rating || rating === 0) {
            return `<span class="rating-stars rating-empty">평점 없음</span>`;
        }
        let starsHtml = '<span class="rating-stars">';
        for (let i = 1; i <= 5; i++) {
            const filled = i <= rating;
            starsHtml += `<i class="fa-${filled ? 'solid' : 'regular'} fa-star${filled ? ' filled' : ''}"></i>`;
        }
        starsHtml += '</span>';
        return starsHtml;
    }

    function openEditModal(item) {
        elements.editId.value = item.id;
        elements.editNameInput.value = item.name;
        elements.editCategorySelect.value = item.category || '기타';
        elements.editPriceSelect.value = item.price_range || '보통';
        elements.editAddressInput.value = item.address || '';
        elements.editLinkInput.value = item.link || '';
        elements.editRatingSelect.value = String(item.rating || 0);
        elements.editMemoInput.value = item.memo || '';

        elements.editModal.style.display = 'flex';
        elements.editNameInput.focus();
    }

    function closeEditModal() {
        elements.editModal.style.display = 'none';
        elements.editRestaurantForm.reset();
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

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;');
    }
});
