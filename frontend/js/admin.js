// Smart School Platform - Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    const user = await Auth.checkAuth(['admin']);
    if (!user) return;

    loadAdminData();
    setupAdminForms();
});

async function loadAdminData() {
    try {
        const data = await API.getAdminDashboard();
        renderStats(data.stats);
        renderUsers(data.users);
        renderClasses(data.classes);
        renderSubjects(data.subjects);
        populateClassDropdown(data.classes);
    } catch (e) {
        console.error('Failed to load admin dashboard:', e);
    }
}

function renderStats(stats) {
    if (!stats) return;
    document.getElementById('stat-students').textContent = stats.total_students || 0;
    document.getElementById('stat-teachers').textContent = stats.total_teachers || 0;
    document.getElementById('stat-classes').textContent = stats.total_classes || 0;
    document.getElementById('stat-subjects').textContent = stats.total_subjects || 0;
    document.getElementById('stat-materials').textContent = stats.total_materials || 0;
    document.getElementById('stat-quizzes').textContent = stats.total_quizzes || 0;
    document.getElementById('stat-attempts').textContent = stats.total_attempts || 0;
}

function renderUsers(users) {
    const tbody = document.getElementById('users-table-body');
    const currentUser = Auth.getUser();
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => {
        let roleBadge = 'bg-primary-subtle text-primary';
        if (u.role === 'teacher') roleBadge = 'bg-success-subtle text-success';
        else if (u.role === 'admin') roleBadge = 'bg-danger-subtle text-danger';

        const isSelf = currentUser && currentUser.id === u.id;

        return `
            <tr>
                <td>
                    <div class="fw-bold">${u.full_name}</div>
                    <div class="small text-muted">@${u.username}</div>
                </td>
                <td><span class="badge ${roleBadge} text-capitalize">${u.role}</span></td>
                <td>${u.email}</td>
                <td>${u.class_name || '—'}</td>
                <td>
                    ${!isSelf ? `
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteUser(${u.id})" title="Delete User">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : '<span class="small text-muted">(Current User)</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function renderClasses(classes) {
    const list = document.getElementById('classes-list');
    if (!classes || classes.length === 0) {
        list.innerHTML = '<li class="list-group-item text-muted">No classes defined.</li>';
        return;
    }

    list.innerHTML = classes.map(c => `
        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
            <div>
                <div class="fw-semibold text-dark">${c.name}</div>
                <div class="small text-muted">Grade ${c.grade_level} &bull; Section ${c.section}</div>
            </div>
            <span class="badge bg-secondary-subtle text-secondary rounded-pill">
                ${c.student_count} Students
            </span>
        </li>
    `).join('');
}

function renderSubjects(subjects) {
    const list = document.getElementById('subjects-list');
    if (!subjects || subjects.length === 0) {
        list.innerHTML = '<li class="list-group-item text-muted">No subjects defined.</li>';
        return;
    }

    list.innerHTML = subjects.map(s => `
        <li class="list-group-item px-0 d-flex justify-content-between align-items-center">
            <div>
                <div class="fw-semibold text-dark">${s.name}</div>
                <div class="small text-muted">Code: ${s.code} &bull; Class: ${s.class_name}</div>
            </div>
            <span class="badge bg-primary-subtle text-primary rounded-pill">
                ${s.materials_count} Materials / ${s.quizzes_count} Quizzes
            </span>
        </li>
    `).join('');
}

function populateClassDropdown(classes) {
    const opts = (classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const uClass = document.getElementById('user-class-id');
    const sClass = document.getElementById('subject-class-id');
    if (uClass) uClass.innerHTML = '<option value="">None (Teacher/Admin)</option>' + opts;
    if (sClass) sClass.innerHTML = opts;
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await API.deleteAdminUser(userId);
        loadAdminData();
    } catch (e) {
        alert('Failed to delete user');
    }
}

function setupAdminForms() {
    // Create User
    document.getElementById('form-create-user')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            role: document.getElementById('user-role').value,
            full_name: document.getElementById('user-fullname').value,
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            password: document.getElementById('user-password').value,
            class_id: document.getElementById('user-class-id').value
        };
        try {
            await API.createAdminUser(payload);
            alert('User created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
            loadAdminData();
        } catch (err) {
            alert('Failed to create user: ' + err.message);
        }
    });

    // Create Class
    document.getElementById('form-create-class')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('class-name').value,
            grade_level: document.getElementById('class-grade').value,
            section: document.getElementById('class-section').value,
            description: document.getElementById('class-description').value
        };
        try {
            await API.createAdminClass(payload);
            alert('Class created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createClassModal')).hide();
            loadAdminData();
        } catch (err) {
            alert('Failed to create class: ' + err.message);
        }
    });

    // Create Subject
    document.getElementById('form-create-subject')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('subject-name').value,
            code: document.getElementById('subject-code').value,
            class_id: document.getElementById('subject-class-id').value
        };
        try {
            await API.createAdminSubject(payload);
            alert('Subject created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createSubjectModal')).hide();
            loadAdminData();
        } catch (err) {
            alert('Failed to create subject: ' + err.message);
        }
    });

    // Reset Demo Data
    document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
        if (!confirm('Reset all data to default demo dataset? This will re-seed students, quizzes, and before/after test scores.')) return;
        try {
            await API.resetAdminData();
            alert('Database reset successfully to fresh demo dataset!');
            loadAdminData();
        } catch (e) {
            alert('Failed to reset demo data');
        }
    });
}
