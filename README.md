# Smart School – A Digital Learning and Academic Improvement Platform

An end-to-end, AI/ML-driven digital learning platform designed to bridge the gap between student diagnostic assessment and continuous academic improvement. Built specifically for Information Science & Engineering curriculum and practical **AICTE Activity** demonstrations.

---

## 🏛️ Project Architecture (Decoupled Frontend & Backend)

The project is structured with a **clean separation between Frontend and Backend**, allowing independent development, testing, and deployment:

```
Smart-Learning-Student-Performance-Improvement-System/
├── backend/
│   ├── app.py                  # Flask REST API server (CORS-enabled) + Static file serving
│   ├── config.py               # Database and environment configuration
│   ├── models.py               # SQLAlchemy ORM models (Users, Classes, Quizzes, Profiles, etc.)
│   ├── ml_engine.py            # AI/ML Engine: Random Forest Regressor/Classifier & Recommendations
│   ├── seed_data.py            # Database seeder with realistic demo students, quizzes & pre/post scores
│   ├── test_app.py             # Automated unit and integration test suite (100% passing)
│   ├── requirements.txt        # Python backend dependencies
│   └── models_saved/           # Serialized trained Scikit-Learn models (.joblib)
│
├── frontend/
│   ├── index.html              # Landing & Login page with 1-click demo accounts
│   ├── student.html            # Student Portal: materials, quizzes, recommendations, mastery
│   ├── teacher.html            # Teacher Portal: student monitoring roster & weak topics
│   ├── admin.html              # Admin Portal: user management, classes, subjects & data reset
│   ├── analytics.html          # Comparative analytics & before-and-after assessment gains
│   ├── quiz.html               # Interactive quiz view with countdown timer
│   ├── quiz-result.html        # Detailed quiz evaluation, explanations & remedial guides
│   ├── css/
│   │   └── style.css           # Custom styling, risk badges, quiz timer & card layouts
│   └── js/
│       ├── api.js              # Centralized API service for talking to backend REST endpoints
│       ├── auth.js             # Authentication state, login, logout, role check
│       ├── student.js          # Student dashboard logic & interactions
│       ├── teacher.js          # Teacher dashboard logic & interactions
│       ├── admin.js            # Admin dashboard logic & interactions
│       ├── analytics.js        # Chart.js visualization logic (Before/After bar chart, radar, doughnut)
│       └── quiz.js             # Quiz runner, timer, and result evaluator
│
├── README.md                   # Complete system documentation
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Key Modules

### 1. 🎓 Student Module (`frontend/student.html`)
- **Diagnostic & Practice Assessments**: Take timed multiple-choice quizzes with countdown timer, immediate scoring, question-level explanations, and pass/fail status.
- **Personalized AI Recommendations**: Automatically receive tailored action items and review materials for topics where mastery is below threshold ($<70\%$).
- **Topic Mastery Tracker**: Visual progress bars categorizing student proficiency into *Weak* ($<50\%$), *Developing* ($50–70\%$), and *Mastered* ($>70\%$).
- **Curriculum Resource Library**: In-browser modal reader for notes, formula sheets, interactive guides, and external video lectures.
- **Assessment History**: Chronological log of quiz scores, time spent, and performance trajectories.

### 2. 👩‍🏫 Teacher Module (`frontend/teacher.html`)
- **Student Performance Monitoring Roster**: Real-time gradebook tracking attendance %, weekly self-study hours, quiz averages, and ML predicted scores.
- **Automated Weak-Topic Identification**: AI-driven analysis highlighting curriculum topics where the cohort is struggling.
- **Individual Student Drill-Down**: In-depth academic trajectory, attempt timelines, and active recommendation statuses for any student.
- **Quiz & Resource Creator**: Publish new quizzes (Pre-test, Practice, Post-test) and add study guides directly to subjects.

### 3. 🛠️ Admin Module (`frontend/admin.html`)
- **User Provisioning**: Add, manage, and delete Students, Teachers, and Administrators with role-based access control.
- **Class & Subject Management**: Configure grade levels (e.g., Grade 10-A, 10-B) and associate subjects with codes (e.g., `MATH-10`, `SCI-10`, `CS-10`).
- **System Overview Metrics**: High-level counters for total enrolled students, active teachers, courses, quizzes, and completed attempts.
- **1-Click Demo Reset**: Instantly restore the rich demonstration dataset with one click for presentations.

### 4. 📊 Analytics Module (`frontend/analytics.html`)
- **Before-and-After Assessment Comparisons**: Side-by-side interactive Chart.js bar charts showing pre-test vs. post-test performance ($+40\%$ gain).
- **Hake's Normalized Learning Gain $\langle g \rangle$**: Computes empirical educational effectiveness $\left(g = \frac{\text{Post} - \text{Pre}}{100 - \text{Pre}} = 0.68\right)$ indicating high pedagogical gain.
- **Topic Mastery Radar Chart**: Visualizes class-wide strengths and weaknesses across subjects.
- **Academic Risk Distribution**: Doughnut chart categorizing students into *High Risk*, *Moderate Risk*, *Good Standing*, and *Excellent*.
- **Engagement Correlation**: Analysis of study hours and attendance vs. predicted final scores ($r \approx 0.88$).

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript | Pure decoupled client with Bootstrap 5, Bootstrap Icons, and custom CSS |
| **Backend** | Python Flask, Flask-CORS | RESTful JSON APIs with session-based and header-based authentication |
| **Database** | SQLite / MySQL | Zero-config local SQLite by default, fully compatible with MySQL via SQLAlchemy ORM |
| **AI / ML** | Scikit-Learn, Pandas, NumPy | Random Forest Regressor (score prediction) and Classifier (risk evaluation) |
| **Data Visualization** | Chart.js | Interactive bar charts, radar charts, and doughnut charts for comparative analytics |
| **Development Tools**| VS Code, Git, GitHub | Industry-standard development workflow and version control |

---

## ⚙️ Installation & Running

### 1. Clone the Repository
```bash
git clone https://github.com/Bindhuvarsha/Smart-Learning-Student-Performance-Improvement-System.git
cd Smart-Learning-Student-Performance-Improvement-System
```

### 2. Backend Setup & Run
```bash
cd backend
pip install -r requirements.txt
python seed_data.py
python app.py
```
The Flask backend starts at: **`http://127.0.0.1:5000`**

### 3. Frontend Running Options

- **Option A (Integrated via Flask)**:
  Once `app.py` is running, open **`http://127.0.0.1:5000`** in any browser. The backend will serve the decoupled `frontend/` directory automatically.

- **Option B (Independent Frontend)**:
  You can run `frontend/` using VS Code **Live Server**, or any static web server (e.g. `npx serve frontend` or `python -m http.server 8000 --directory frontend`). The frontend's `js/api.js` automatically connects to `http://127.0.0.1:5000/api` with CORS enabled!

### 4. Run Automated Backend Tests
```bash
cd backend
python test_app.py
```
*(All 7 tests pass with 0 errors/warnings).*

---

## 🔑 Default Demo Accounts

For presentations and viva evaluations, use the **1-Click Demo Buttons** at the top of any page or enter credentials:

| Role | Username | Password | Persona & Purpose |
| :--- | :--- | :--- | :--- |
| **Student** | `student_alex` | `student123` | **Alex Johnson** (Grade 10-A, Moderate Risk &rarr; Improving) |
| **Student** | `student_priya` | `student123` | **Priya Sharma** (Grade 10-A, High Achiever / Excellent) |
| **Student** | `student_rahul` | `student123` | **Rahul Verma** (Grade 10-A, High Risk / Needs Remedial Help) |
| **Teacher** | `teacher_smith` | `teacher123` | **Prof. Sarah Smith** (Mathematics & Science Instructor) |
| **Teacher** | `teacher_rao` | `teacher123` | **Prof. Rajesh Rao** (Computer Science Instructor) |
| **Admin** | `admin` | `admin123` | **Dr. Alistair Vance** (Principal / System Administrator) |

---

## 🎯 AICTE Activity Presentation Walkthrough

When presenting to evaluators:

1. **Step 1: Student Persona Demo**
   - Click **"Student (Alex)"** on the top demo bar.
   - Show how the AI predicted score ($76.8\%$) and risk standing are updated dynamically.
   - Point out the **Personalized AI Recommendations** flagging weak topics (e.g., *Quadratic Equations*).
   - Take a practice quiz, submit answers, and showcase the instant feedback with question explanations.

2. **Step 2: Teacher Monitoring & Weak-Topic Identification**
   - Switch to **"Teacher (Prof. Smith)"**.
   - Show the **Student Performance Roster** and the **AI Weak-Topic Identification** cards.
   - Open **Rahul Verma's** profile to show how an at-risk student is identified before semester exams.

3. **Step 3: Comparative Analytics Demo**
   - Navigate to **"Comparative Analytics"**.
   - Present the **Before-and-After Assessment Chart** showing pre-test ($40\%$) vs. post-test ($80\%$) scores.
   - Highlight **Hake's Normalized Learning Gain $\langle g \rangle = 0.68$** as scientific proof of learning improvement.
   - Show the **Topic Mastery Radar Chart** and **Cohort Risk Distribution** doughnut chart.

4. **Step 4: Admin Management Demo**
   - Switch to **"Admin"** to show class creation, subject configuration, and user provisioning.
   - Highlight the **Reset Demo Data** button that ensures you can reset the state cleanly during live demonstrations.

---

## 📄 License

Developed for educational and academic project purposes under the Information Science & Engineering curriculum.
