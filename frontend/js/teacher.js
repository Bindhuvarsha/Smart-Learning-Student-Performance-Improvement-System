// Smart School Platform - Teacher Dashboard Logic

let teacherData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await Auth.checkAuth(['teacher', 'admin']);
    if (!user) return;

    loadTeacherData();
    setupForms();
});

async function loadTeacherData() {
    try {
        teacherData = await API.getTeacherDashboard();
        renderStats(teacherData);
        renderWeakTopics(teacherData.topic_stats);
        renderStudents(teacherData.students);
        populateSubjectDropdowns(teacherData.subjects);
    } catch (err) {
        console.error('Failed to load teacher dashboard:', err);
    }
}

function renderStats(data) {
    document.getElementById('stat-total-students').textContent = data.students ? data.students.length : 0;
    document.getElementById('stat-avg-predicted').textContent = `${data.avg_predicted_score}%`;
    document.getElementById('stat-high-risk').textContent = data.risk_counts ? data.risk_counts['High Risk'] : 0;
    document.getElementById('stat-weak-topics').textContent = data.weak_topics ? data.weak_topics.length : 0;
}

function renderWeakTopics(topicStats) {
    const container = document.getElementById('weak-topics-container');
    if (!topicStats || Object.keys(topicStats).length === 0) {
        container.innerHTML = '<p class="text-muted">No topic assessment data available.</p>';
        return;
    }

    container.innerHTML = Object.entries(topicStats).map(([topic, stats]) => {
        let badgeClass = 'bg-success';
        let alertHtml = '';
        if (stats.status === 'Weak') {
            badgeClass = 'bg-danger';
            alertHtml = `<div class="mt-2 p-1 px-2 rounded bg-danger-subtle text-danger small"><i class="bi bi-exclamation-circle me-1"></i>Urgent: Plan remedial review session.</div>`;
        } else if (stats.status === 'Developing') {
            badgeClass = 'bg-warning text-dark';
            alertHtml = `<div class="mt-2 p-1 px-2 rounded bg-warning-subtle text-warning-emphasis small"><i class="bi bi-info-circle me-1"></i>Assign targeted practice quiz.</div>`;
        }

        return `
            <div class="col-md-6 col-lg-4">
                <div class="p-3 border rounded-3 bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold text-dark">${topic}</span>
                        <span class="badge ${badgeClass}">${stats.status}</span>
                    </div>
                    <div class="progress progress-thin mb-2">
                        <div class="progress-bar ${stats.status === 'Weak' ? 'bg-danger' : (stats.status === 'Developing' ? 'bg-warning' : 'bg-success')}" 
                             style="width: ${stats.percentage}%;"></div>
                    </div>
                    <div class="d-flex justify-content-between small text-muted">
                        <span>Mastery: <strong>${stats.percentage}%</strong></span>
                        <span>${stats.correct}/${stats.total} correct</span>
                    </div>
                    ${alertHtml}
                </div>
            </div>
        `;
    }).join('');
}

function renderStudents(students) {
    const tbody = document.getElementById('students-table-body');
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No students enrolled.</td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(s => {
        let riskClass = 'badge-risk-good';
        if (s.risk_level === 'High Risk') riskClass = 'badge-risk-high';
        else if (s.risk_level === 'Moderate Risk') riskClass = 'badge-risk-moderate';
        else if (s.risk_level === 'Excellent') riskClass = 'badge-risk-excellent';

        let scoreColor = 'text-primary';
        if (s.predicted_score >= 80) scoreColor = 'text-success';
        else if (s.predicted_score < 60) scoreColor = 'text-danger';

        return `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${s.name}</div>
                    <div class="small text-muted">ID: #${s.id} &bull; ${s.email}</div>
                </td>
                <td><span class="badge bg-light text-dark border">${s.class_name}</span></td>
                <td><span class="fw-semibold ${s.attendance < 75 ? 'text-danger' : 'text-dark'}">${s.attendance}%</span></td>
                <td>${s.study_hours} hrs</td>
                <td>
                    <span class="fw-semibold">${s.avg_quiz}%</span>
                    <span class="small text-muted">(${s.attempts_count} att.)</span>
                </td>
                <td><span class="fw-bold fs-6 ${scoreColor}">${s.predicted_score}%</span></td>
                <td><span class="badge ${riskClass}">${s.risk_level}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="viewStudentDetail(${s.id})">
                        View Profile &rarr;
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function populateSubjectDropdowns(subjects) {
    const opts = (subjects || []).map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
    const mSubj = document.getElementById('material-subject-id');
    const qSubj = document.getElementById('quiz-subject-id');
    if (mSubj) mSubj.innerHTML = opts;
    if (qSubj) qSubj.innerHTML = opts;
}

async function viewStudentDetail(studentId) {
    try {
        const detail = await API.getTeacherStudentDetail(studentId);
        document.getElementById('modal-student-name').textContent = detail.student.full_name;
        document.getElementById('modal-student-meta').textContent = `${detail.student.class_name || 'Class 10-A'} • ${detail.student.email}`;

        if (detail.profile) {
            document.getElementById('modal-stat-att').textContent = `${detail.profile.attendance_rate}%`;
            document.getElementById('modal-stat-study').textContent = `${detail.profile.study_hours_per_week} hrs`;
            document.getElementById('modal-stat-asgn').textContent = `${detail.profile.assignments_completed_pct}%`;
            document.getElementById('modal-stat-pred').textContent = `${detail.profile.predicted_score}%`;
            document.getElementById('modal-stat-risk').textContent = detail.profile.risk_level;
        }

        // Topic mastery
        const masteryContainer = document.getElementById('modal-student-mastery');
        if (detail.topic_stats && Object.keys(detail.topic_stats).length > 0) {
            masteryContainer.innerHTML = Object.entries(detail.topic_stats).map(([topic, stats]) => `
                <div class="mb-2 p-2 bg-light rounded border">
                    <div class="d-flex justify-content-between small fw-semibold">
                        <span>${topic}</span>
                        <span>${stats.status} (${stats.percentage}%)</span>
                    </div>
                    <div class="progress progress-thin mt-1">
                        <div class="progress-bar ${stats.status === 'Weak' ? 'bg-danger' : (stats.status === 'Developing' ? 'bg-warning' : 'bg-success')}" style="width: ${stats.percentage}%;"></div>
                    </div>
                </div>
            `).join('');
        } else {
            masteryContainer.innerHTML = '<p class="text-muted small">No topic records available.</p>';
        }

        // Recommendations
        const recContainer = document.getElementById('modal-student-recs');
        if (detail.recommendations && detail.recommendations.length > 0) {
            recContainer.innerHTML = detail.recommendations.map(r => `
                <div class="p-2 mb-2 border rounded bg-light">
                    <div class="d-flex justify-content-between">
                        <span class="badge ${r.priority === 'High' ? 'bg-danger' : 'bg-warning text-dark'}">${r.priority} Priority</span>
                        <span class="badge ${r.status === 'Completed' ? 'bg-success' : 'bg-secondary'}">${r.status}</span>
                    </div>
                    <div class="fw-semibold small mt-1">${r.topic}</div>
                    <div class="text-muted small">${r.reason}</div>
                </div>
            `).join('');
        } else {
            recContainer.innerHTML = '<p class="text-muted small">No active recommendations.</p>';
        }

        const modal = new bootstrap.Modal(document.getElementById('studentDetailModal'));
        modal.show();
    } catch (e) {
        alert('Failed to load student detail');
    }
}

function setupForms() {
    // Create Material
    document.getElementById('form-create-material')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_id: document.getElementById('material-subject-id').value,
            title: document.getElementById('material-title').value,
            topic: document.getElementById('material-topic').value,
            content_type: document.getElementById('material-content-type').value,
            external_url: document.getElementById('material-external-url').value,
            content: document.getElementById('material-content').value
        };
        try {
            await API.createMaterial(payload);
            alert('Material saved successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createMaterialModal')).hide();
            loadTeacherData();
        } catch (err) {
            alert('Failed to save material: ' + err.message);
        }
    });

    // Create Quiz
    document.getElementById('form-create-quiz')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            subject_id: document.getElementById('quiz-subject-id').value,
            title: document.getElementById('quiz-title').value,
            topic: document.getElementById('quiz-topic').value,
            assessment_type: document.getElementById('quiz-assessment-type').value,
            time_limit_mins: parseInt(document.getElementById('quiz-time-limit').value || '15'),
            pass_percentage: parseFloat(document.getElementById('quiz-pass-percentage').value || '50'),
            description: document.getElementById('quiz-description').value,
            questions: [
                {
                    question_text: document.getElementById('q1-text').value,
                    topic: document.getElementById('quiz-topic').value,
                    option_a: document.getElementById('q1-opt-a').value,
                    option_b: document.getElementById('q1-opt-b').value,
                    option_c: document.getElementById('q1-opt-c').value,
                    option_d: document.getElementById('q1-opt-d').value,
                    correct_option: document.getElementById('q1-correct').value,
                    explanation: document.getElementById('q1-expl').value
                }
            ]
        };
        try {
            await API.createQuiz(payload);
            alert('Quiz published successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createQuizModal')).hide();
            loadTeacherData();
        } catch (err) {
            alert('Failed to publish quiz: ' + err.message);
        }
    });
}
