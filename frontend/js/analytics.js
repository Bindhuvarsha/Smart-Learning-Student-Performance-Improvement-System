// Smart School Platform - Comparative Analytics & Chart.js Integration

document.addEventListener('DOMContentLoaded', async () => {
    const user = await Auth.checkAuth();
    if (!user) return;

    loadAnalyticsData();
});

async function loadAnalyticsData() {
    try {
        const data = await API.getAnalyticsOverview();
        renderSummaryKPIs(data);
        renderComparisonChart();
        renderTopicRadar();
        renderRiskDoughnut();
        renderIndividualTable(data.math_comparison);
        renderCorrelationTable(data.correlation_data);
    } catch (e) {
        console.error('Failed to load analytics:', e);
    }
}

function renderSummaryKPIs(data) {
    if (data.math_comparison) {
        document.getElementById('kpi-math-gain').textContent = `+${data.math_comparison.avg_gain}%`;
        document.getElementById('kpi-math-pre').textContent = `${data.math_comparison.avg_pre}%`;
        document.getElementById('kpi-math-post').textContent = `${data.math_comparison.avg_post}%`;
        document.getElementById('kpi-math-count').textContent = `${data.math_comparison.student_count} Students`;
    }

    if (data.sci_comparison) {
        document.getElementById('kpi-sci-gain').textContent = `+${data.sci_comparison.avg_gain}%`;
        document.getElementById('kpi-sci-pre').textContent = `${data.sci_comparison.avg_pre}%`;
        document.getElementById('kpi-sci-post').textContent = `${data.sci_comparison.avg_post}%`;
        document.getElementById('kpi-sci-count').textContent = `${data.sci_comparison.student_count} Students`;
    }
}

async function renderComparisonChart() {
    const ctx = document.getElementById('assessmentComparisonChart');
    if (!ctx) return;

    try {
        const data = await API.getAssessmentComparison();
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Pre-Test Score (%)',
                        data: data.pre_scores,
                        backgroundColor: 'rgba(239, 68, 68, 0.75)',
                        borderColor: '#dc2626',
                        borderWidth: 1.5,
                        borderRadius: 6
                    },
                    {
                        label: 'Post-Test Score (%)',
                        data: data.post_scores,
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderColor: '#059669',
                        borderWidth: 1.5,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterBody: function(tooltipItems) {
                                const idx = tooltipItems[0].dataIndex;
                                const delta = data.deltas[idx];
                                return `Improvement Gain: +${delta}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Score Percentage (%)' }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Error rendering comparison chart:', e);
    }
}

async function renderTopicRadar() {
    const ctx = document.getElementById('topicMasteryChart');
    if (!ctx) return;

    try {
        const data = await API.getTopicMastery();
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Curriculum Topic Mastery (%)',
                    data: data.values,
                    fill: true,
                    backgroundColor: 'rgba(79, 70, 229, 0.25)',
                    borderColor: '#4f46e5',
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: { stepSize: 20 }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Error rendering topic radar:', e);
    }
}

async function renderRiskDoughnut() {
    const ctx = document.getElementById('riskDistributionChart');
    if (!ctx) return;

    try {
        const data = await API.getRiskDistribution();
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['High Risk', 'Moderate Risk', 'Good Standing', 'Excellent'],
                datasets: [{
                    data: [
                        data['High Risk'] || 0,
                        data['Moderate Risk'] || 0,
                        data['Good Standing'] || 0,
                        data['Excellent'] || 0
                    ],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                cutout: '65%'
            }
        });
    } catch (e) {
        console.error('Error rendering risk doughnut:', e);
    }
}

function renderIndividualTable(comparison) {
    const tbody = document.getElementById('individual-table-body');
    if (!comparison || !comparison.comparisons || comparison.comparisons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No comparison data recorded.</td></tr>';
        return;
    }

    tbody.innerHTML = comparison.comparisons.map(c => `
        <tr>
            <td class="fw-bold">Student #${c.student_id}</td>
            <td><span class="badge bg-danger-subtle text-danger fs-6">${c.pre_score}%</span></td>
            <td><span class="badge bg-success-subtle text-success fs-6">${c.post_score}%</span></td>
            <td><span class="fw-bold text-success fs-6">+${c.delta}%</span></td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="progress progress-thin flex-grow-1" style="width: 80px;">
                        <div class="progress-bar bg-success" style="width: ${c.normalized_gain}%;"></div>
                    </div>
                    <span class="small fw-semibold">${c.normalized_gain}%</span>
                </div>
            </td>
            <td>
                <span class="badge ${c.normalized_gain >= 70 ? 'bg-success' : (c.normalized_gain >= 30 ? 'bg-primary' : 'bg-warning text-dark')}">
                    ${c.normalized_gain >= 70 ? 'High Gain' : (c.normalized_gain >= 30 ? 'Medium Gain' : 'Low Gain')}
                </span>
            </td>
        </tr>
    `).join('');
}

function renderCorrelationTable(data) {
    const tbody = document.getElementById('correlation-table-body');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No data available.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(c => {
        let scoreClass = 'text-primary';
        if (c.predicted_score >= 80) scoreClass = 'text-success';
        else if (c.predicted_score < 60) scoreClass = 'text-danger';

        return `
            <tr>
                <td class="fw-semibold">${c.name}</td>
                <td>${c.attendance}%</td>
                <td>${c.study_hours} hrs</td>
                <td><span class="fw-bold ${scoreClass}">${c.predicted_score}%</span></td>
            </tr>
        `;
    }).join('');
}
