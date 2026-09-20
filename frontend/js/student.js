// Smart School Platform - Student Dashboard Logic

document.addEventListener('DOMContentLoaded', async () => {
    const user = await Auth.checkAuth(['student']);
    if (!user) return;

    loadStudentData();
});

async function loadStudentData() {
    try {
        const data = await API.getStudentDashboard();
        renderProfile(data.student, data.profile);
        renderRecommendations(data.recommendations);
        renderTopicMastery(data.topic_stats);
        renderQuizzes(data.quizzes);
        renderMaterials(data.materials);
        renderAttempts(data.attempts);
    } catch (err) {
        console.error('Failed to load student dashboard:', err);
    }
}

function renderProfile(student, profile) {
    document.getElementById('student-name').textContent = student.full_name;
    document.getElementById('student-class').textContent = student.class_name || 'Class 10-A';
    document.getElementById('student-email').textContent = student.email;
    document.getElementById('student-avatar').textContent = student.full_name[0] || 'S';

    if (profile) {
        document.getElementById('stat-attendance').textContent = `${profile.attendance_rate}%`;
        document.getElementById('stat-study-hours').textContent = `${profile.study_hours_per_week} hrs`;
        document.getElementById('stat-predicted-score').textContent = `${profile.predicted_score}%`;

        const riskBadge = document.getElementById('stat-risk-badge');
        riskBadge.textContent = profile.risk_level;
        riskBadge.className = 'badge mt-1 ' + getRiskBadgeClass(profile.risk_level);
    }
}

function getRiskBadgeClass(risk) {
    if (risk === 'High Risk') return 'badge-risk-high';
    if (risk === 'Moderate Risk') return 'badge-risk-moderate';
    if (risk === 'Good Standing') return 'badge-risk-good';
    return 'badge-risk-excellent';
}

function renderRecommendations(recs) {
    const container = document.getElementById('recommendations-container');
    const countBadge = document.getElementById('recommendations-count');
    countBadge.textContent = `${recs ? recs.length : 0} Active`;

    if (!recs || recs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-emoji-smile fs-1 text-success d-block mb-2"></i>
                <p class="fw-semibold mb-0">Great job! No weak areas flagged at this time.</p>
                <small>Take new practice quizzes to continuously evaluate your skills.</small>
            </div>
        `;
        return;
    }

    container.innerHTML = recs.map(r => `
        <div class="rec-card ${r.priority === 'High' ? 'high-priority' : 'medium-priority'} ${r.status === 'Completed' ? 'completed' : ''}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <span class="badge ${r.priority === 'High' ? 'bg-danger' : 'bg-warning text-dark'} mb-1">
                        ${r.priority} Priority
                    </span>
                    <h6 class="fw-bold mb-1">${r.topic}</h6>
                    <p class="small text-muted mb-2">${r.reason}</p>
                    ${r.material_title ? `
                        <button class="btn btn-sm btn-outline-primary py-1 px-3 rounded-pill" onclick="viewMaterial(${r.material_id})">
                            <i class="bi bi-book-half me-1"></i>Review Material: ${r.material_title}
                        </button>
                    ` : ''}
                </div>
                <button class="btn btn-sm ${r.status === 'Completed' ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="toggleRecStatus(${r.id}, '${r.status}')">
                    <i class="bi ${r.status === 'Completed' ? 'bi-check-circle-fill' : 'bi-circle'} me-1"></i>
                    ${r.status}
                </button>
            </div>
        </div>
    `).join('');
}

async function toggleRecStatus(recId, currentStatus) {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
        await API.updateRecommendationStatus(recId, nextStatus);
        loadStudentData();
    } catch (e) {
        alert('Failed to update recommendation status');
    }
}

function renderTopicMastery(topicStats) {
    const container = document.getElementById('topic-mastery-container');
    if (!topicStats || Object.keys(topicStats).length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-clipboard2-check fs-1 text-muted d-block mb-2"></i>
                <p class="fw-semibold mb-0">No topic data available yet.</p>
                <small>Attempt a quiz below to see your topic mastery!</small>
            </div>
        `;
        return;
    }

    container.innerHTML = Object.entries(topicStats).map(([topic, stats]) => {
        let colorClass = 'bg-success';
        if (stats.status === 'Weak') colorClass = 'bg-danger';
        else if (stats.status === 'Developing') colorClass = 'bg-warning';

        return `
            <div class="mb-3 p-2 rounded border bg-light">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-semibold small">${topic}</span>
                    <span class="badge ${colorClass} ${stats.status === 'Developing' ? 'text-dark' : ''}">
                        ${stats.status} (${stats.percentage}%)
                    </span>
                </div>
                <div class="progress progress-thin">
                    <div class="progress-bar ${colorClass}" role="progressbar" style="width: ${stats.percentage}%;"></div>
                </div>
                <div class="d-flex justify-content-between text-muted" style="font-size: 0.75rem; margin-top: 2px;">
                    <span>${stats.correct}/${stats.total} questions correct</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderQuizzes(quizzes) {
    const container = document.getElementById('quizzes-container');
    if (!quizzes || quizzes.length === 0) {
        container.innerHTML = '<p class="text-muted">No quizzes currently assigned.</p>';
        return;
    }

    container.innerHTML = quizzes.map(q => {
        let badgeClass = 'bg-primary-subtle text-primary';
        if (q.assessment_type === 'pre_test') badgeClass = 'bg-danger-subtle text-danger';
        else if (q.assessment_type === 'post_test') badgeClass = 'bg-success-subtle text-success';

        return `
            <div class="col-md-6 col-lg-4">
                <div class="p-3 border rounded-3 bg-white h-100 d-flex flex-column justify-content-between shadow-sm">
                    <div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge ${badgeClass} text-uppercase" style="font-size: 0.7rem;">
                                ${q.assessment_type.replace('_', ' ')}
                            </span>
                            <span class="small text-muted"><i class="bi bi-clock me-1"></i>${q.time_limit_mins} mins</span>
                        </div>
                        <h6 class="fw-bold mb-1">${q.title}</h6>
                        <p class="small text-muted mb-2">${q.description || 'Evaluate your comprehension on this topic.'}</p>
                        <div class="small text-secondary mb-3">
                            <i class="bi bi-book me-1"></i>${q.subject_name} &bull; ${q.question_count} Questions
                        </div>
                    </div>
                    <a href="quiz.html?id=${q.id}" class="btn btn-sm btn-primary w-100 rounded-pill">
                        <i class="bi bi-pencil-square me-1"></i>Take Quiz
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

let loadedMaterials = [];
function renderMaterials(materials) {
    loadedMaterials = materials || [];
    const container = document.getElementById('materials-container');
    if (!materials || materials.length === 0) {
        container.innerHTML = '<p class="text-muted">No learning materials found.</p>';
        return;
    }

    container.innerHTML = materials.map(m => `
        <div class="col-md-6 col-lg-4">
            <div class="p-3 border rounded-3 bg-light h-100 d-flex flex-column justify-content-between">
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-secondary text-capitalize">${m.content_type}</span>
                        <span class="small text-muted">${m.subject_name}</span>
                    </div>
                    <h6 class="fw-bold mb-1 text-dark">${m.title}</h6>
                    <div class="small text-muted mb-3"><i class="bi bi-tag me-1"></i>Topic: <strong>${m.topic}</strong></div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-primary w-100 rounded-pill" onclick="viewMaterial(${m.id})">
                    <i class="bi bi-eye me-1"></i>Read Notes
                </button>
            </div>
        </div>
    `).join('');
}

function viewMaterial(materialId) {
    const mat = loadedMaterials.find(m => m.id === materialId);
    if (!mat) return;

    document.getElementById('modal-material-title').textContent = mat.title;
    document.getElementById('modal-material-meta').textContent = `${mat.subject_name} • Topic: ${mat.topic}`;
    document.getElementById('modal-material-content').textContent = mat.content;

    const refDiv = document.getElementById('modal-material-ref');
    if (mat.external_url) {
        refDiv.innerHTML = `<strong>Reference Link:</strong> <a href="${mat.external_url}" target="_blank" class="text-primary text-decoration-none">${mat.external_url} <i class="bi bi-box-arrow-up-right small"></i></a>`;
    } else {
        refDiv.innerHTML = '';
    }

    const modal = new bootstrap.Modal(document.getElementById('materialModal'));
    modal.show();
}

function renderAttempts(attempts) {
    const container = document.getElementById('attempts-table-body');
    if (!attempts || attempts.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No quizzes attempted yet. Select a quiz above to begin!</td></tr>`;
        return;
    }

    container.innerHTML = attempts.map(a => {
        let typeBadge = 'bg-primary-subtle text-primary';
        if (a.assessment_type === 'pre_test') typeBadge = 'bg-danger-subtle text-danger';
        else if (a.assessment_type === 'post_test') typeBadge = 'bg-success-subtle text-success';

        let scoreColor = 'text-success';
        if (a.percentage < 50) scoreColor = 'text-danger';
        else if (a.percentage < 70) scoreColor = 'text-warning';

        const mins = Math.floor(a.time_spent_seconds / 60);
        const secs = a.time_spent_seconds % 60;

        return `
            <tr>
                <td class="fw-semibold">${a.quiz_title}</td>
                <td><span class="badge ${typeBadge} text-uppercase">${a.assessment_type.replace('_', ' ')}</span></td>
                <td>${a.score} / ${a.total_questions}</td>
                <td><span class="fw-bold ${scoreColor}">${a.percentage}%</span></td>
                <td>${mins}m ${secs}s</td>
                <td class="small text-muted">${a.completed_at}</td>
                <td>
                    <a href="quiz-result.html?id=${a.id}" class="btn btn-sm btn-outline-primary py-1 px-2 rounded-pill" style="font-size: 0.8rem;">
                        View Review &rarr;
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}
