// Smart School Platform - API Client Service

const API_BASE = window.location.port === '5000' 
    ? '/api' 
    : 'http://127.0.0.1:5000/api';

const API = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        // Attach user ID if stored locally (fallback for cross-origin local sessions)
        const storedUser = localStorage.getItem('smart_school_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user && user.id) {
                    defaultHeaders['X-User-Id'] = user.id;
                }
            } catch (e) {}
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include' // Send cookies/session
        };

        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || `HTTP error ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Auth Endpoints
    login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    },

    demoLogin(role) {
        return this.request(`/auth/demo-login/${role}`);
    },

    getMe() {
        return this.request('/auth/me');
    },

    logout() {
        localStorage.removeItem('smart_school_user');
        return this.request('/auth/logout');
    },

    // AI Teacher Endpoint
    aiTeacherChat(question, subject = 'Mathematics', mode = 'student') {
        return this.request('/ai-teacher/chat', {
            method: 'POST',
            body: { question, subject, mode }
        });
    },

    // Student Endpoints
    getStudentDashboard() {
        return this.request('/student/dashboard');
    },

    getQuiz(quizId) {
        return this.request(`/quizzes/${quizId}`);
    },

    submitQuiz(quizId, answers, timeSpentSeconds) {
        return this.request(`/quizzes/${quizId}/submit`, {
            method: 'POST',
            body: { answers, time_spent_seconds: timeSpentSeconds }
        });
    },

    getAttemptDetail(attemptId) {
        return this.request(`/quizzes/attempts/${attemptId}`);
    },

    updateRecommendationStatus(recId, status) {
        return this.request(`/recommendations/${recId}/status`, {
            method: 'POST',
            body: { status }
        });
    },

    // Teacher Endpoints
    getTeacherDashboard() {
        return this.request('/teacher/dashboard');
    },

    getTeacherStudentDetail(studentId) {
        return this.request(`/teacher/students/${studentId}`);
    },

    createMaterial(materialData) {
        return this.request('/teacher/materials', {
            method: 'POST',
            body: materialData
        });
    },

    createQuiz(quizData) {
        return this.request('/teacher/quizzes', {
            method: 'POST',
            body: quizData
        });
    },

    // Admin Endpoints
    getAdminDashboard() {
        return this.request('/admin/dashboard');
    },

    createAdminUser(userData) {
        return this.request('/admin/users', {
            method: 'POST',
            body: userData
        });
    },

    deleteAdminUser(userId) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    createAdminClass(classData) {
        return this.request('/admin/classes', {
            method: 'POST',
            body: classData
        });
    },

    createAdminSubject(subjectData) {
        return this.request('/admin/subjects', {
            method: 'POST',
            body: subjectData
        });
    },

    resetAdminData() {
        return this.request('/admin/reset-data', {
            method: 'POST'
        });
    },

    // Analytics Endpoints
    getAnalyticsOverview() {
        return this.request('/analytics/overview');
    },

    getAssessmentComparison() {
        return this.request('/analytics/assessment-comparison');
    },

    getTopicMastery() {
        return this.request('/analytics/topic-mastery');
    },

    getRiskDistribution() {
        return this.request('/analytics/risk-distribution');
    }
};
