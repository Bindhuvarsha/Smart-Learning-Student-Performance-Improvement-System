// Smart School Platform - Universal Auth, Navigation & Feature Access Manager

const Auth = {
    DEFAULT_USERS: {
        student: {
            id: 1,
            username: 'bindhushree',
            full_name: 'Bindhu Shree',
            email: 'bindhushree@smartschool.edu',
            role: 'student',
            grade: 'Class 10'
        },
        teacher: {
            id: 2,
            username: 'teacher',
            full_name: 'Dr. Ramesh Kumar',
            email: 'teacher@smartschool.edu',
            role: 'teacher',
            designation: 'Mathematics Faculty'
        },
        admin: {
            id: 3,
            username: 'admin',
            full_name: 'School Principal',
            email: 'admin@smartschool.edu',
            role: 'admin',
            designation: 'School Administrator'
        }
    },

    getUser() {
        const str = localStorage.getItem('smart_school_user');
        try {
            if (str) return JSON.parse(str);
        } catch (e) {}

        // Smart default based on current page context so features are always accessible
        const path = window.location.pathname.toLowerCase();
        if (path.includes('teacher.html')) return this.DEFAULT_USERS.teacher;
        if (path.includes('admin.html')) return this.DEFAULT_USERS.admin;
        return this.DEFAULT_USERS.student;
    },

    setUser(user) {
        if (user) {
            localStorage.setItem('smart_school_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('smart_school_user');
        }
    },

    switchRole(role) {
        const targetUser = this.DEFAULT_USERS[role] || this.DEFAULT_USERS.student;
        this.setUser(targetUser);
        
        // Notify backend session if connected
        if (typeof API !== 'undefined' && API.demoLogin) {
            API.demoLogin(role).catch(() => {});
        }

        if (role === 'student') window.location.href = 'student.html';
        else if (role === 'teacher') window.location.href = 'teacher.html';
        else if (role === 'admin') window.location.href = 'admin.html';
    },

    async checkAuth(requiredRoles = []) {
        let user = this.getUser();
        // Always allow full feature access across all pages without restrictive redirects
        return user;
    },

    logout() {
        localStorage.removeItem('smart_school_user');
        if (typeof API !== 'undefined' && API.logout) {
            API.logout().catch(() => {});
        }
        window.location.href = 'index.html';
    },

    setupDemoButtons() {
        document.querySelectorAll('[data-demo-role]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const role = btn.getAttribute('data-demo-role');
                this.switchRole(role);
            });
        });
    },

    initGlobalNav() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage === 'index.html' || currentPage === '') {
            return; // Login page has its own hero layout
        }

        const user = this.getUser();

        // 1. Enrich Sidebar with All Modules
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav) {
            sidebarNav.innerHTML = `
                <div class="sidebar-section-title">Student Module</div>
                <a href="student.html" class="sidebar-nav-item ${currentPage === 'student.html' ? 'active' : ''}">
                    <i class="bi bi-grid-fill"></i>
                    <span>Dashboard</span>
                </a>
                <a href="materials.html" class="sidebar-nav-item ${currentPage === 'materials.html' ? 'active' : ''}">
                    <i class="bi bi-journal-bookmark"></i>
                    <span>My Learning</span>
                </a>
                <a href="quiz.html" class="sidebar-nav-item ${currentPage === 'quiz.html' || currentPage === 'quiz-result.html' ? 'active' : ''}">
                    <i class="bi bi-check2-square"></i>
                    <span>Practice Tests</span>
                </a>
                <a href="study-plan.html" class="sidebar-nav-item ${currentPage === 'study-plan.html' ? 'active' : ''}">
                    <i class="bi bi-compass"></i>
                    <span>Study Plan</span>
                </a>
                <a href="performance.html" class="sidebar-nav-item ${currentPage === 'performance.html' ? 'active' : ''}">
                    <i class="bi bi-graph-up"></i>
                    <span>Performance</span>
                </a>

                <div class="sidebar-section-title">Teacher Module</div>
                <a href="teacher.html" class="sidebar-nav-item ${currentPage === 'teacher.html' ? 'active' : ''}">
                    <i class="bi bi-person-workspace"></i>
                    <span>Teacher Dashboard</span>
                </a>

                <div class="sidebar-section-title">Admin Module</div>
                <a href="admin.html" class="sidebar-nav-item ${currentPage === 'admin.html' ? 'active' : ''}">
                    <i class="bi bi-shield-lock-fill"></i>
                    <span>Admin Dashboard</span>
                </a>

                <div class="sidebar-section-title">Shared Resources</div>
                <a href="resources.html" class="sidebar-nav-item ${currentPage === 'resources.html' ? 'active' : ''}">
                    <i class="bi bi-folder2-open"></i>
                    <span>Learning Resources</span>
                </a>
            `;
        }

        // 2. Setup Topbar Role Switcher & Features Button
        const topbar = document.querySelector('.app-topbar');
        if (topbar) {
            const topbarLeft = topbar.querySelector('.topbar-left');
            if (topbarLeft && !topbarLeft.querySelector('.topbar-role-switcher')) {
                const isStudent = ['student.html', 'materials.html', 'quiz.html', 'quiz-result.html', 'study-plan.html', 'performance.html'].includes(currentPage);
                const isTeacher = currentPage === 'teacher.html';
                const isAdmin = currentPage === 'admin.html';

                const switcher = document.createElement('div');
                switcher.className = 'topbar-role-switcher ms-3 d-none d-sm-flex';
                switcher.innerHTML = `
                    <button class="role-pill ${isStudent ? 'active' : ''}" onclick="Auth.switchRole('student')" title="Switch to Student View">
                        <i class="bi bi-mortarboard-fill"></i> Student
                    </button>
                    <button class="role-pill ${isTeacher ? 'active' : ''}" onclick="Auth.switchRole('teacher')" title="Switch to Teacher View">
                        <i class="bi bi-person-workspace"></i> Teacher
                    </button>
                    <button class="role-pill ${isAdmin ? 'active' : ''}" onclick="Auth.switchRole('admin')" title="Switch to Admin View">
                        <i class="bi bi-shield-lock-fill"></i> Admin
                    </button>
                    <button class="role-pill all-features-btn ms-1" onclick="SmartModal.openFeatureHub()" title="View All 9 Features">
                        <i class="bi bi-grid-3x3-gap-fill"></i> All Features
                    </button>
                `;
                topbarLeft.appendChild(switcher);
            }

            // 3. Setup User Profile Pill Dropdown
            const userPill = topbar.querySelector('.user-profile-pill');
            if (userPill && !userPill.parentElement.classList.contains('user-dropdown-container')) {
                const container = document.createElement('div');
                container.className = 'user-dropdown-container';
                userPill.parentNode.insertBefore(container, userPill);
                container.appendChild(userPill);

                // Update User Pill Text dynamically
                const nameEl = userPill.querySelector('.user-info-name');
                const roleEl = userPill.querySelector('.user-info-role');
                if (nameEl) nameEl.textContent = user.full_name;
                if (roleEl) roleEl.innerHTML = `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} <i class="bi bi-chevron-down ms-1" style="font-size: 0.65rem;"></i>`;

                // Add Dropdown Menu
                const dropdown = document.createElement('div');
                dropdown.className = 'user-dropdown-menu';
                dropdown.id = 'userDropdownMenu';
                dropdown.innerHTML = `
                    <div class="user-dropdown-header">
                        <div style="font-weight: 700; font-size: 0.88rem; color: #0f172a;">${user.full_name}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${user.email} &bull; <span style="text-transform: capitalize; color: #1e6bff; font-weight: 600;">${user.role}</span></div>
                    </div>
                    <div class="user-dropdown-item" onclick="Auth.switchRole('student')">
                        <i class="bi bi-mortarboard text-primary"></i>
                        <span>Student View (Bindhu Shree)</span>
                    </div>
                    <div class="user-dropdown-item" onclick="Auth.switchRole('teacher')">
                        <i class="bi bi-person-workspace text-success"></i>
                        <span>Teacher View</span>
                    </div>
                    <div class="user-dropdown-item" onclick="Auth.switchRole('admin')">
                        <i class="bi bi-shield-lock text-purple"></i>
                        <span>Admin View</span>
                    </div>
                    <div class="user-dropdown-divider"></div>
                    <div class="user-dropdown-item" onclick="SmartModal.openFeatureHub()">
                        <i class="bi bi-grid-3x3-gap-fill text-warning"></i>
                        <span>Explore All 9 Features</span>
                    </div>
                    <div class="user-dropdown-divider"></div>
                    <div class="user-dropdown-item text-danger" onclick="Auth.logout()">
                        <i class="bi bi-box-arrow-left"></i>
                        <span>Logout</span>
                    </div>
                `;
                container.appendChild(dropdown);

                userPill.style.cursor = 'pointer';
                userPill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('show');
                });

                document.addEventListener('click', () => {
                    dropdown.classList.remove('show');
                });
            }
        }

        // 4. Inject Features Hub Modal HTML if missing
        this.injectFeatureHubModal();
        this.injectToastContainer();
    },

    injectFeatureHubModal() {
        if (document.getElementById('smartFeatureHubModal')) return;

        const modalHtml = `
            <div class="smart-modal-backdrop" id="smartFeatureHubModal">
                <div class="smart-modal-dialog" style="max-width: 820px;">
                    <div class="smart-modal-header">
                        <h3 class="smart-modal-title">
                            <i class="bi bi-grid-3x3-gap-fill text-primary"></i>
                            Smart School – All Platform Features
                        </h3>
                        <button class="smart-modal-close" onclick="SmartModal.closeFeatureHub()">&times;</button>
                    </div>
                    <div class="smart-modal-body">
                        <p style="font-size: 0.88rem; color: #64748b; margin-bottom: 1.25rem;">
                            Select any feature below to instantly navigate and test it. All 9 modules from the reference design are fully accessible.
                        </p>
                        <div class="features-grid">
                            
                            <!-- Screen 1: Login -->
                            <a href="index.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #e0f2fe; color: #0284c7;">
                                    <i class="bi bi-door-open-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">1. Login & Role Gateway</div>
                                    <div class="feature-hub-card-desc">Split-screen login with 1-click role selection (Student, Teacher, Admin).</div>
                                    <span class="feature-hub-card-badge" style="background: #e0f2fe; color: #0369a1;">Auth</span>
                                </div>
                            </a>

                            <!-- Screen 2: Student Dashboard -->
                            <a href="student.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #ebf3ff; color: #1e6bff;">
                                    <i class="bi bi-grid-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">2. Student Dashboard</div>
                                    <div class="feature-hub-card-desc">Bindhu Shree's overview, 4 stat cards, performance bar chart & weak topics.</div>
                                    <span class="feature-hub-card-badge" style="background: #ebf3ff; color: #1e6bff;">Student</span>
                                </div>
                            </a>

                            <!-- Screen 3: Learning Materials -->
                            <a href="materials.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #fdf0f3; color: #f43f5e;">
                                    <i class="bi bi-journal-bookmark-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">3. Learning Materials</div>
                                    <div class="feature-hub-card-desc">5 Pastel subject cards (Maths, Science, English, Social, Kannada) & recommendations.</div>
                                    <span class="feature-hub-card-badge" style="background: #fdf0f3; color: #e11d48;">Learning</span>
                                </div>
                            </a>

                            <!-- Screen 4: Practice Test -->
                            <a href="quiz.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #fef9c3; color: #ca8a04;">
                                    <i class="bi bi-stopwatch-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">4. Practice Test Simulator</div>
                                    <div class="feature-hub-card-desc">Live countdown timer (00:25:00), 5 interactive questions with circular radio options.</div>
                                    <span class="feature-hub-card-badge" style="background: #fef9c3; color: #a16207;">Assessment</span>
                                </div>
                            </a>

                            <!-- Screen 5: Study Plan -->
                            <a href="study-plan.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #ede9fe; color: #7c3aed;">
                                    <i class="bi bi-compass-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">5. Personalized Study Plan</div>
                                    <div class="feature-hub-card-desc">AI-generated remedial topics, recommendation banner & targeted modules.</div>
                                    <span class="feature-hub-card-badge" style="background: #ede9fe; color: #6d28d9;">AI Study</span>
                                </div>
                            </a>

                            <!-- Screen 6: Performance & Progress -->
                            <a href="performance.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #ecfdf5; color: #059669;">
                                    <i class="bi bi-graph-up-arrow"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">6. Progress & Analytics</div>
                                    <div class="feature-hub-card-desc">78% Donut score, subject progress bars, trajectory line chart & ML predictions.</div>
                                    <span class="feature-hub-card-badge" style="background: #ecfdf5; color: #047857;">Analytics</span>
                                </div>
                            </a>

                            <!-- Screen 7: Teacher Dashboard -->
                            <a href="teacher.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #dcfce7; color: #166534;">
                                    <i class="bi bi-person-workspace"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">7. Teacher Dashboard</div>
                                    <div class="feature-hub-card-desc">Class 10 filters, student performance roster, weak topics list & remedial dispatch.</div>
                                    <span class="feature-hub-card-badge" style="background: #dcfce7; color: #15803d;">Teacher</span>
                                </div>
                            </a>

                            <!-- Screen 8: Learning Resources -->
                            <a href="resources.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #fee2e2; color: #b91c1c;">
                                    <i class="bi bi-file-earmark-pdf-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">8. Learning Resources</div>
                                    <div class="feature-hub-card-desc">Categorized notes, videos, quizzes & eBooks with live search and document previews.</div>
                                    <span class="feature-hub-card-badge" style="background: #fee2e2; color: #b91c1c;">Library</span>
                                </div>
                            </a>

                            <!-- Screen 9: Admin Dashboard -->
                            <a href="admin.html" class="feature-hub-card">
                                <div class="feature-hub-card-icon" style="background: #f1f5f9; color: #334155;">
                                    <i class="bi bi-shield-lock-fill"></i>
                                </div>
                                <div>
                                    <div class="feature-hub-card-title">9. Admin Dashboard</div>
                                    <div class="feature-hub-card-desc">School overview, 4 metrics, recent school activities & Class 6–10 performance bars.</div>
                                    <span class="feature-hub-card-badge" style="background: #f1f5f9; color: #475569;">Admin</span>
                                </div>
                            </a>

                        </div>
                    </div>
                    <div class="smart-modal-footer">
                        <button class="btn-smart-primary" onclick="SmartModal.closeFeatureHub()">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    injectToastContainer() {
        if (document.getElementById('smartToastContainer')) return;
        const container = document.createElement('div');
        container.className = 'smart-toast-container';
        container.id = 'smartToastContainer';
        document.body.appendChild(container);
    },

    injectAiAssistantWidget() {
        if (document.getElementById('btnOpenAiAssistant')) return;

        const widgetHtml = `
            <button class="ai-assistant-fab" id="btnOpenAiAssistant" onclick="SmartAiTutor.toggle()" title="Ask doubts to AI Tutor">
                <span class="pulse-dot"></span>
                <i class="bi bi-stars"></i>
                <span>AI Tutor</span>
            </button>

            <div class="ai-assistant-modal" id="aiAssistantModal">
                <div class="ai-modal-header">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                            <i class="bi bi-robot"></i>
                        </div>
                        <div>
                            <div style="font-weight: 700; font-size: 0.95rem;">Smart School AI Tutor</div>
                            <div style="font-size: 0.72rem; opacity: 0.9;">Online &bull; 24/7 Academic Support</div>
                        </div>
                    </div>
                    <button onclick="SmartAiTutor.toggle()" style="background: none; border: none; color: #ffffff; font-size: 1.25rem; cursor: pointer; padding: 0.2rem 0.5rem;">&times;</button>
                </div>

                <div class="ai-modal-body" id="aiChatBody">
                    <div class="ai-message bot">
                        <div class="bubble">
                            <strong>Hello! 👋</strong> I am your Smart School AI Learning Assistant. You can ask me any academic questions, get step-by-step math solutions, or ask how our machine learning system predicts student performance.
                            <div class="ai-suggestion-chips">
                                <button type="button" class="ai-chip" onclick="SmartAiTutor.ask('Explain Quadratic Equations simply')">📐 Quadratic Equations</button>
                                <button type="button" class="ai-chip" onclick="SmartAiTutor.ask('How does AI predict student marks?')">🤖 AI Prediction Model</button>
                                <button type="button" class="ai-chip" onclick="SmartAiTutor.ask('Give me quick Science revision tips')">🔬 Science Revision</button>
                                <button type="button" class="ai-chip" onclick="SmartAiTutor.ask('How does weak-topic identification work?')">🎯 Weak-Topic Remedy</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="ai-modal-footer">
                    <input type="text" id="aiChatInput" class="ai-input" placeholder="Ask a doubt or question..." onkeypress="SmartAiTutor.handleKeyPress(event)">
                    <button class="btn-smart-primary" style="padding: 0.55rem 1rem; border-radius: 10px;" onclick="SmartAiTutor.send()">
                        <i class="bi bi-send-fill"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', widgetHtml);
    }
};

// Global Smart AI Tutor Controller
const SmartAiTutor = {
    toggle() {
        const modal = document.getElementById('aiAssistantModal');
        if (modal) {
            modal.classList.toggle('show');
            if (modal.classList.contains('show')) {
                const input = document.getElementById('aiChatInput');
                if (input) input.focus();
            }
        }
    },

    send() {
        const input = document.getElementById('aiChatInput');
        if (!input) return;
        const q = input.value.trim();
        if (!q) return;
        input.value = '';
        this.ask(q);
    },

    handleKeyPress(e) {
        if (e.key === 'Enter') this.send();
    },

    ask(question) {
        const chatBody = document.getElementById('aiChatBody');
        if (!chatBody) return;

        // Append User Message
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-message user';
        userMsg.innerHTML = `<div class="bubble">${question}</div>`;
        chatBody.appendChild(userMsg);
        chatBody.scrollTop = chatBody.scrollHeight;

        // Simulate intelligent pedagogical response
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'ai-message bot';
            
            let reply = '';
            const qLower = question.toLowerCase();

            if (qLower.includes('quadratic') || qLower.includes('equation') || qLower.includes('math')) {
                reply = `<strong>Quadratic Equations Explanation:</strong><br>A quadratic equation is in the standard form <em>ax² + bx + c = 0</em> (where a ≠ 0).<br>• <strong>Quadratic Formula:</strong> x = (-b ± √(b² - 4ac)) / 2a<br>• <strong>Discriminant (D = b² - 4ac):</strong><br>&nbsp;&nbsp;- If D > 0: Two distinct real roots.<br>&nbsp;&nbsp;- If D = 0: Two identical real roots.<br>&nbsp;&nbsp;- If D < 0: Complex conjugate roots.<br>Visit your <strong>Study Plan</strong> for step-by-step practice problems!`;
            } else if (qLower.includes('predict') || qLower.includes('model') || qLower.includes('ml') || qLower.includes('ai')) {
                reply = `<strong>AI Academic Performance Model:</strong><br>1. <strong>Input Vectors:</strong> Quiz scores, practice frequency, topic completion rate, and formative test timelines.<br>2. <strong>Scikit-Learn ML Pipeline:</strong> Trains on historical cohort data to compute your projected exam score and risk status.<br>3. <strong>Proactive Intervention:</strong> Automatically queues personalized remedial topics in the <strong>Study Plan</strong> if confidence drops below 65%.`;
            } else if (qLower.includes('science') || qLower.includes('revision') || qLower.includes('tips')) {
                reply = `<strong>Class 10 Science Revision Tips:</strong><br>• <strong>Physics:</strong> Master Snell's law and focal length formula (1/f = 1/v - 1/u).<br>• <strong>Chemistry:</strong> Practice precipitation reactions and periodic table trends (atomic radius, electronegativity).<br>• <strong>Biology:</strong> Review trophic levels in ecosystems and Mendel's law of inheritance.`;
            } else if (qLower.includes('weak') || qLower.includes('remedy') || qLower.includes('diagnostic')) {
                reply = `<strong>Weak-Topic Diagnostic Engine:</strong><br>• Evaluates your practice tests across subjects.<br>• Tags topics where accuracy is under 60% as 'Needs Attention'.<br>• Generates focused 2–3 lesson micro-modules in your <strong>Study Plan</strong> to help you master challenging concepts!`;
            } else {
                reply = `Great query! As your AI tutor, I recommend reviewing your <strong>Learning Materials</strong> for syllabus notes, taking a quick test in <strong>Practice Tests</strong>, and checking your progress in <strong>Performance Analytics</strong>. Would you like a targeted quiz on this topic?`;
            }

            botMsg.innerHTML = `<div class="bubble">${reply}</div>`;
            chatBody.appendChild(botMsg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 550);
    }
};

// Global Smart Toast Notification
const SmartToast = {
    show(message, type = 'success') {
        const container = document.getElementById('smartToastContainer') || (function() {
            Auth.injectToastContainer();
            return document.getElementById('smartToastContainer');
        })();

        const toast = document.createElement('div');
        toast.className = `smart-toast ${type}`;
        const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'info' ? 'bi-info-circle-fill' : 'bi-exclamation-triangle-fill';
        toast.innerHTML = `<i class="bi ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
};

// Global Smart Modal Controller
const SmartModal = {
    openFeatureHub() {
        const modal = document.getElementById('smartFeatureHubModal');
        if (modal) modal.classList.add('show');
    },

    closeFeatureHub() {
        const modal = document.getElementById('smartFeatureHubModal');
        if (modal) modal.classList.remove('show');
    }
};

// Auto-initialize Global Navigation on all pages
document.addEventListener('DOMContentLoaded', () => {
    Auth.setupDemoButtons();
    Auth.initGlobalNav();
    Auth.injectAiAssistantWidget();
});
