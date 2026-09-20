// Smart School Platform - Quiz Runner & Results Logic

document.addEventListener('DOMContentLoaded', async () => {
    const user = await Auth.checkAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (window.location.pathname.includes('quiz-result.html')) {
        const attemptId = urlParams.get('id');
        const localResult = localStorage.getItem('latest_quiz_result');

        if (attemptId) {
            try {
                await loadQuizResult(attemptId);
                return;
            } catch (e) {
                console.warn('Backend attempt not found, falling back to local result');
            }
        }

        if (localResult) {
            try {
                renderLocalQuizResult(JSON.parse(localResult));
            } catch (e) {
                console.error(e);
            }
        }
    } else if (quizId && typeof loadQuiz === 'function') {
        loadQuiz(quizId);
    }
});

function renderLocalQuizResult(data) {
    if (!data) return;
    document.getElementById('result-quiz-title').textContent = data.title || "Mathematics Practice Test";
    document.getElementById('result-score').textContent = `${data.score} / ${data.total}`;
    document.getElementById('result-pct').textContent = `${data.percentage}%`;
    document.getElementById('result-time').textContent = data.timeSpent || "3m 45s";

    const statusElem = document.getElementById('result-status');
    const headerElem = document.getElementById('result-header');

    if (data.percentage >= 70) {
        headerElem.innerHTML = `
            <div style="display: inline-flex; padding: 1rem; border-radius: 50%; background-color: #ecfdf5; color: #10b981; font-size: 2rem; margin-bottom: 0.75rem;">
                <i class="bi bi-trophy-fill"></i>
            </div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #10b981; margin-bottom: 0.25rem;">Great Job! Test Complete</h2>
        `;
        statusElem.textContent = 'Passed';
        statusElem.style.color = '#10b981';
    } else {
        headerElem.innerHTML = `
            <div style="display: inline-flex; padding: 1rem; border-radius: 50%; background-color: #fef2f2; color: #ef4444; font-size: 2rem; margin-bottom: 0.75rem;">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h2 style="font-size: 1.6rem; font-weight: 800; color: #ef4444; margin-bottom: 0.25rem;">Needs Improvement</h2>
        `;
        statusElem.textContent = 'Review Needed';
        statusElem.style.color = '#ef4444';
    }

    // Render remedial card if score < 100%
    const remedialCard = document.getElementById('remedial-materials-card');
    const remedialList = document.getElementById('remedial-materials-list');
    if (remedialCard && remedialList) {
        if (data.percentage < 100) {
            remedialCard.style.display = 'block';
            remedialList.innerHTML = `
                <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">Algebra &ndash; Basics & Practice</div>
                    <div style="font-size: 0.78rem; color: #64748b;">Targeted revision module &bull; 15 mins</div>
                    <a href="study-plan.html" class="btn-smart-primary mt-2 d-inline-block" style="padding: 0.3rem 0.85rem; font-size: 0.78rem; border-radius: 6px;">Start Review</a>
                </div>
                <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">Linear Equations & Variables</div>
                    <div style="font-size: 0.78rem; color: #64748b;">Formula sheet & practice questions &bull; 20 mins</div>
                    <a href="resources.html" class="btn-smart-outline mt-2 d-inline-block" style="padding: 0.3rem 0.85rem; font-size: 0.78rem; border-radius: 6px;">Read Notes</a>
                </div>
            `;
        } else {
            remedialCard.style.display = 'none';
        }
    }

    // Render answers
    const reviewContainer = document.getElementById('answers-review-container');
    if (reviewContainer && data.detailedResults) {
        reviewContainer.innerHTML = data.detailedResults.map((item, idx) => `
            <div style="border-radius: 10px; padding: 1.25rem; background-color: ${item.isCorrect ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${item.isCorrect ? '#a7f3d0' : '#fecaca'}; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 700; font-size: 0.95rem; color: #0f172a;">Question ${idx + 1}</span>
                    <span style="background-color: ${item.isCorrect ? '#10b981' : '#ef4444'}; color: white; padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">
                        ${item.isCorrect ? '<i class="bi bi-check-lg me-1"></i>Correct (+1)' : '<i class="bi bi-x-lg me-1"></i>Incorrect (0)'}
                    </span>
                </div>
                <p style="font-weight: 600; font-size: 0.92rem; margin-bottom: 0.5rem; color: #0f172a;">${item.question}</p>
                <div style="font-size: 0.85rem; color: ${item.isCorrect ? '#047857' : '#b91c1c'}; margin-bottom: 0.25rem;">
                    <strong>Your Answer:</strong> ${item.options[item.selected] !== undefined ? item.options[item.selected] : 'None'}
                </div>
                ${!item.isCorrect ? `
                    <div style="font-size: 0.85rem; color: #047857; margin-bottom: 0.25rem;">
                        <strong>Correct Answer:</strong> ${item.options[item.correct]}
                    </div>
                ` : ''}
                <div style="margin-top: 0.6rem; font-size: 0.82rem; color: #334155; background: #ffffff; padding: 0.6rem 0.85rem; border-radius: 6px; border: 1px solid rgba(0,0,0,0.06);">
                    <strong><i class="bi bi-info-circle me-1 text-primary"></i>Explanation:</strong> ${item.explanation}
                </div>
            </div>
        `).join('');
    }
}

let quizTimerInterval = null;
let quizDurationMins = 15;
let timeSpentSeconds = 0;

async function loadQuiz(quizId) {
    try {
        const quiz = await API.getQuiz(quizId);
        renderQuizHeader(quiz);
        renderQuizQuestions(quiz.questions);
        startQuizTimer(quiz.time_limit_mins || 15, quiz.id);
        setupQuizSubmission(quiz.id);
    } catch (e) {
        alert('Failed to load quiz: ' + e.message);
        window.location.href = 'student.html';
    }
}

function renderQuizHeader(quiz) {
    document.getElementById('quiz-title').textContent = quiz.title;
    document.getElementById('quiz-meta').textContent = `${quiz.subject_name} • ${quiz.question_count} Questions`;
    if (quiz.description) {
        document.getElementById('quiz-description').textContent = quiz.description;
    }

    const typeBadge = document.getElementById('quiz-type-badge');
    typeBadge.textContent = quiz.assessment_type.replace('_', ' ');
    if (quiz.assessment_type === 'pre_test') {
        typeBadge.className = 'badge bg-danger-subtle text-danger text-uppercase';
    } else if (quiz.assessment_type === 'post_test') {
        typeBadge.className = 'badge bg-success-subtle text-success text-uppercase';
    } else {
        typeBadge.className = 'badge bg-primary-subtle text-primary text-uppercase';
    }
}

function renderQuizQuestions(questions) {
    const container = document.getElementById('questions-container');
    if (!questions || questions.length === 0) {
        container.innerHTML = '<p class="text-muted">No questions in this quiz.</p>';
        return;
    }

    container.innerHTML = questions.map((q, idx) => `
        <div class="dashboard-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-secondary">Question ${idx + 1} of ${questions.length}</span>
                <span class="badge bg-light text-muted border"><i class="bi bi-tag me-1"></i>${q.topic}</span>
            </div>

            <h5 class="fw-semibold text-dark mb-4">${q.question_text}</h5>

            <div class="options-container">
                <label class="quiz-option-label d-flex align-items-center">
                    <input type="radio" class="form-check-input me-3" name="question_${q.id}" value="A" required>
                    <span class="option-content"><strong>A.</strong> ${q.option_a}</span>
                </label>
                <label class="quiz-option-label d-flex align-items-center">
                    <input type="radio" class="form-check-input me-3" name="question_${q.id}" value="B">
                    <span class="option-content"><strong>B.</strong> ${q.option_b}</span>
                </label>
                <label class="quiz-option-label d-flex align-items-center">
                    <input type="radio" class="form-check-input me-3" name="question_${q.id}" value="C">
                    <span class="option-content"><strong>C.</strong> ${q.option_c}</span>
                </label>
                <label class="quiz-option-label d-flex align-items-center">
                    <input type="radio" class="form-check-input me-3" name="question_${q.id}" value="D">
                    <span class="option-content"><strong>D.</strong> ${q.option_d}</span>
                </label>
            </div>
        </div>
    `).join('');
}

function startQuizTimer(durationMins, quizId) {
    quizDurationMins = durationMins;
    let timeRemaining = durationMins * 60;
    const timerElem = document.getElementById('quiz-timer');

    quizTimerInterval = setInterval(() => {
        timeRemaining--;
        timeSpentSeconds++;

        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        if (timerElem) {
            timerElem.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        if (timeRemaining <= 60 && timerElem) {
            timerElem.classList.remove('bg-warning', 'text-dark');
            timerElem.classList.add('bg-danger', 'text-white');
        }

        if (timeRemaining <= 0) {
            clearInterval(quizTimerInterval);
            alert('Time is up! Your answers will be submitted.');
            submitAnswers(quizId);
        }
    }, 1000);
}

function setupQuizSubmission(quizId) {
    document.getElementById('quiz-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitAnswers(quizId);
    });
}

async function submitAnswers(quizId) {
    clearInterval(quizTimerInterval);
    const form = document.getElementById('quiz-form');
    const formData = new FormData(form);
    const answers = {};

    for (let [key, value] of formData.entries()) {
        if (key.startsWith('question_')) {
            const qId = key.replace('question_', '');
            answers[qId] = value;
        }
    }

    try {
        const res = await API.submitQuiz(quizId, answers, timeSpentSeconds);
        if (res.success) {
            window.location.href = `quiz-result.html?id=${res.attempt_id}`;
        }
    } catch (e) {
        alert('Failed to submit quiz: ' + e.message);
    }
}

// ----------------- Quiz Result Logic -----------------
async function loadQuizResult(attemptId) {
    try {
        const data = await API.getAttemptDetail(attemptId);
        renderResultSummary(data.attempt);
        renderRemedialRecommendations(data.remedial_materials);
        renderDetailedAnswers(data.answers, data.questions);
    } catch (e) {
        alert('Failed to load quiz results: ' + e.message);
        window.location.href = 'student.html';
    }
}

function renderResultSummary(attempt) {
    document.getElementById('result-quiz-title').textContent = attempt.quiz_title;
    document.getElementById('result-score').textContent = `${attempt.score} / ${attempt.total_questions}`;
    document.getElementById('result-pct').textContent = `${attempt.percentage}%`;

    const mins = Math.floor(attempt.time_spent_seconds / 60);
    const secs = attempt.time_spent_seconds % 60;
    document.getElementById('result-time').textContent = `${mins}m ${secs}s`;

    const statusElem = document.getElementById('result-status');
    const headerElem = document.getElementById('result-header');

    if (attempt.percentage >= 70) {
        headerElem.innerHTML = `
            <div class="d-inline-flex p-3 rounded-circle bg-success-subtle text-success mb-2"><i class="bi bi-trophy-fill fs-1"></i></div>
            <h3 class="fw-bold text-success">Excellent Performance!</h3>
        `;
        statusElem.textContent = 'Passed';
        statusElem.className = 'fs-4 fw-bold text-success';
    } else if (attempt.percentage >= 50) {
        headerElem.innerHTML = `
            <div class="d-inline-flex p-3 rounded-circle bg-warning-subtle text-warning mb-2"><i class="bi bi-hand-thumbs-up-fill fs-1"></i></div>
            <h3 class="fw-bold text-warning">Good Effort! Room for Improvement.</h3>
        `;
        statusElem.textContent = 'Passed';
        statusElem.className = 'fs-4 fw-bold text-warning';
    } else {
        headerElem.innerHTML = `
            <div class="d-inline-flex p-3 rounded-circle bg-danger-subtle text-danger mb-2"><i class="bi bi-exclamation-triangle-fill fs-1"></i></div>
            <h3 class="fw-bold text-danger">Needs Immediate Review</h3>
        `;
        statusElem.textContent = 'Failed';
        statusElem.className = 'fs-4 fw-bold text-danger';
    }
}

function renderRemedialRecommendations(materials) {
    const card = document.getElementById('remedial-materials-card');
    const list = document.getElementById('remedial-materials-list');

    if (!materials || materials.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    list.innerHTML = materials.map(m => `
        <div class="col-md-6">
            <div class="p-3 border rounded bg-light d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-semibold text-dark">${m.title}</div>
                    <div class="small text-muted">Topic: ${m.topic}</div>
                </div>
                <a href="student.html" class="btn btn-sm btn-outline-primary rounded-pill">
                    View &rarr;
                </a>
            </div>
        </div>
    `).join('');
}

function renderDetailedAnswers(answers, questions) {
    const container = document.getElementById('answers-review-container');
    if (!answers) return;

    container.innerHTML = answers.map((ans, idx) => {
        const q = questions[ans.question_id];
        if (!q) return '';

        return `
            <div class="p-3 mb-3 rounded-3 border ${ans.is_correct ? 'result-correct' : 'result-incorrect'}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold">Question ${idx + 1}</span>
                    <div>
                        <span class="badge bg-light text-dark border me-1">${ans.topic}</span>
                        ${ans.is_correct 
                            ? '<span class="badge bg-success"><i class="bi bi-check-lg me-1"></i>Correct (+1)</span>' 
                            : '<span class="badge bg-danger"><i class="bi bi-x-lg me-1"></i>Incorrect (0)</span>'}
                    </div>
                </div>

                <p class="mb-3 text-dark fw-semibold">${q.question_text}</p>

                <div class="small mb-2">
                    <div>
                        <strong>Your Answer:</strong>
                        <span class="${ans.is_correct ? 'text-success fw-bold' : 'text-danger fw-bold'}">
                            Option ${ans.selected_option}
                        </span>
                    </div>
                    ${!ans.is_correct ? `
                        <div>
                            <strong>Correct Answer:</strong>
                            <span class="text-success fw-bold">Option ${q.correct_option}</span>
                        </div>
                    ` : ''}
                </div>

                ${q.explanation ? `
                    <div class="mt-2 p-2 bg-white bg-opacity-75 rounded border small text-secondary">
                        <strong><i class="bi bi-info-circle me-1"></i>Explanation:</strong> ${q.explanation}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
