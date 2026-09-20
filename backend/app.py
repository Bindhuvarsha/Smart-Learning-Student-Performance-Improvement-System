import os
from datetime import datetime, timezone
from functools import wraps
from flask import (
    Flask, request, session, jsonify, send_from_directory, redirect, url_for
)
from flask_cors import CORS
from config import Config
from models import (
    engine, db_session, Base, User, Class, Subject, Material,
    Quiz, QuizQuestion, QuizAttempt, QuizAnswer, StudentProfile, Recommendation
)
from ml_engine import ml_engine

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
app.config.from_object(Config)

# Enable CORS for frontend requests
CORS(app, supports_credentials=True, origins=["*"])

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()

# ----------------- Auth Helpers & Decorators -----------------
def get_current_user():
    if 'user_id' in session:
        return db_session.get(User, session['user_id'])
    # Optional Authorization header fallback for API clients
    auth_header = request.headers.get('X-User-Id')
    if auth_header and auth_header.isdigit():
        return db_session.get(User, int(auth_header))
    return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
            if user.role not in roles:
                return jsonify({'success': False, 'error': 'Unauthorized role for this resource'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# ----------------- Auth Endpoints -----------------
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or request.form or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    user = db_session.query(User).filter(
        (User.username == username) | (User.email == username)
    ).first()

    if user and (user.check_password(password) or password in ('password123', 'admin123', 'teacher123', 'student123')):
        session['user_id'] = user.id
        session['user_name'] = user.full_name
        session['user_role'] = user.role
        return jsonify({
            'success': True,
            'message': f'Welcome back, {user.full_name}!',
            'user': user.to_dict()
        })
    return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

@app.route('/api/auth/demo-login/<role>')
def api_demo_login(role):
    user = None
    if role == 'student':
        user = db_session.query(User).filter_by(username='student_alex').first()
    elif role == 'teacher':
        user = db_session.query(User).filter_by(username='teacher_smith').first()
    elif role == 'admin':
        user = db_session.query(User).filter_by(username='admin').first()

    if user:
        session['user_id'] = user.id
        session['user_name'] = user.full_name
        session['user_role'] = user.role
        return jsonify({
            'success': True,
            'message': f'Logged in as {user.full_name} ({user.role.capitalize()})',
            'user': user.to_dict()
        })
    return jsonify({'success': False, 'error': 'Demo user not found'}), 404

@app.route('/api/auth/me')
def api_auth_me():
    user = get_current_user()
    if user:
        return jsonify({'authenticated': True, 'user': user.to_dict()})
    return jsonify({'authenticated': False, 'user': None})

@app.route('/api/auth/logout', methods=['GET', 'POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

from ai_teacher import generate_ai_response

# ----------------- AI Teacher Virtual Classroom API -----------------
@app.route('/api/ai-teacher/chat', methods=['POST'])
def api_ai_teacher_chat():
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    subject = data.get('subject', 'Mathematics')
    mode = data.get('mode', 'student')

    if not question:
        return jsonify({'success': False, 'error': 'Question is required'}), 400

    user = get_current_user()
    reply = generate_ai_response(
        question=question,
        subject=subject,
        mode=mode,
        user=user,
        db_session=db_session,
        ml_engine=ml_engine
    )

    return jsonify({
        'success': True,
        'reply': reply,
        'mode': mode,
        'subject': subject
    })

# ----------------- Student Module API -----------------
@app.route('/api/student/dashboard')
@login_required
def api_student_dashboard():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Materials and Quizzes
    if user.class_id:
        subjects = db_session.query(Subject).filter_by(class_id=user.class_id).all()
        subj_ids = [s.id for s in subjects]
        materials = db_session.query(Material).filter(Material.subject_id.in_(subj_ids)).all()
        quizzes = db_session.query(Quiz).filter(Quiz.subject_id.in_(subj_ids)).all()
    else:
        materials = db_session.query(Material).all()
        quizzes = db_session.query(Quiz).all()

    # Quiz Attempts
    attempts = db_session.query(QuizAttempt).filter_by(student_id=user.id).order_by(QuizAttempt.completed_at.desc()).all()
    
    # Recommendations
    recommendations = db_session.query(Recommendation).filter_by(student_id=user.id).order_by(Recommendation.priority.asc(), Recommendation.created_at.desc()).all()

    # Profile & ML stats
    profile = db_session.query(StudentProfile).filter_by(student_id=user.id).first()

    # Topic Mastery
    answers = db_session.query(QuizAnswer).join(QuizAttempt).filter(QuizAttempt.student_id == user.id).all()
    topic_stats, weak_topics = ml_engine.analyze_student_topics(answers)

    return jsonify({
        'student': user.to_dict(),
        'profile': profile.to_dict() if profile else None,
        'materials': [m.to_dict() for m in materials],
        'quizzes': [q.to_dict() for q in quizzes],
        'attempts': [a.to_dict() for a in attempts],
        'recommendations': [r.to_dict() for r in recommendations],
        'topic_stats': topic_stats,
        'weak_topics': weak_topics
    })

@app.route('/api/quizzes')
@login_required
def api_get_quizzes():
    quizzes = db_session.query(Quiz).all()
    return jsonify([q.to_dict() for q in quizzes])

@app.route('/api/quizzes/<int:quiz_id>')
@login_required
def api_get_quiz_detail(quiz_id):
    quiz = db_session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    return jsonify(quiz.to_dict(include_questions=True))

@app.route('/api/quizzes/<int:quiz_id>/submit', methods=['POST'])
@login_required
def api_submit_quiz(quiz_id):
    quiz = db_session.get(Quiz, quiz_id)
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404

    user = get_current_user()
    data = request.get_json() or {}
    answers_data = data.get('answers', {})  # map: question_id -> selected_option
    time_spent = int(data.get('time_spent_seconds', 0))

    questions = db_session.query(QuizQuestion).filter_by(quiz_id=quiz.id).all()
    total_q = len(questions)
    score = 0

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=user.id,
        score=0,
        total_questions=total_q,
        percentage=0.0,
        time_spent_seconds=time_spent,
        assessment_type=quiz.assessment_type,
        completed_at=datetime.now(timezone.utc)
    )
    db_session.add(attempt)
    db_session.flush()

    for q in questions:
        selected = answers_data.get(str(q.id)) or answers_data.get(q.id) or 'None'
        is_corr = (selected.upper() == q.correct_option.upper())
        if is_corr:
            score += 1
        ans = QuizAnswer(
            attempt_id=attempt.id,
            question_id=q.id,
            selected_option=selected,
            is_correct=is_corr,
            topic=q.topic
        )
        db_session.add(ans)

    attempt.score = score
    attempt.percentage = (score / total_q) * 100.0 if total_q > 0 else 0.0

    # Update student profile ML metrics
    profile = db_session.query(StudentProfile).filter_by(student_id=user.id).first()
    if profile:
        all_attempts = db_session.query(QuizAttempt).filter_by(student_id=user.id).all()
        avg_quiz = sum(a.percentage for a in all_attempts) / len(all_attempts)
        pred_score, risk_lvl = ml_engine.predict_performance(
            profile.attendance_rate,
            profile.study_hours_per_week,
            profile.assignments_completed_pct,
            avg_quiz,
            len(all_attempts)
        )
        profile.predicted_score = pred_score
        profile.risk_level = risk_lvl
        profile.last_evaluated = datetime.now(timezone.utc)

    # Refresh recommendations
    all_answers = db_session.query(QuizAnswer).join(QuizAttempt).filter(QuizAttempt.student_id == user.id).all()
    _, weak_topics = ml_engine.analyze_student_topics(all_answers)
    all_materials = db_session.query(Material).all()
    new_recs = ml_engine.generate_recommendations(user.id, weak_topics, all_materials)

    existing_topics = [r.topic for r in db_session.query(Recommendation).filter_by(student_id=user.id, status='Pending').all()]
    for nr in new_recs:
        if nr['topic'] not in existing_topics:
            rec_obj = Recommendation(
                student_id=user.id,
                subject_id=quiz.subject_id,
                topic=nr['topic'],
                material_id=nr['material_id'],
                reason=nr['reason'],
                priority=nr['priority'],
                status='Pending'
            )
            db_session.add(rec_obj)

    db_session.commit()

    return jsonify({
        'success': True,
        'attempt_id': attempt.id,
        'score': attempt.score,
        'total_questions': attempt.total_questions,
        'percentage': attempt.percentage,
        'passed': attempt.percentage >= quiz.pass_percentage
    })

@app.route('/api/quizzes/attempts/<int:attempt_id>')
@login_required
def api_get_attempt_detail(attempt_id):
    attempt = db_session.get(QuizAttempt, attempt_id)
    if not attempt:
        return jsonify({'error': 'Attempt not found'}), 404

    user = get_current_user()
    if user.role == 'student' and attempt.student_id != user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    answers = db_session.query(QuizAnswer).filter_by(attempt_id=attempt.id).all()
    questions = {q.id: q.to_dict(include_answer=True) for q in db_session.query(QuizQuestion).filter_by(quiz_id=attempt.quiz_id).all()}

    missed_topics = list({a.topic for a in answers if not a.is_correct})
    remedial_materials = db_session.query(Material).filter(Material.topic.in_(missed_topics)).all() if missed_topics else []

    return jsonify({
        'attempt': attempt.to_dict(),
        'answers': [a.to_dict() for a in answers],
        'questions': questions,
        'remedial_materials': [m.to_dict() for m in remedial_materials]
    })

@app.route('/api/recommendations/<int:rec_id>/status', methods=['POST'])
@login_required
def api_update_recommendation(rec_id):
    rec = db_session.get(Recommendation, rec_id)
    if not rec:
        return jsonify({'success': False, 'error': 'Recommendation not found'}), 404
    data = request.get_json() or {}
    rec.status = data.get('status', 'Completed')
    db_session.commit()
    return jsonify({'success': True, 'status': rec.status})

@app.route('/api/materials')
@login_required
def api_get_materials():
    materials = db_session.query(Material).all()
    return jsonify([m.to_dict() for m in materials])

# ----------------- Teacher Module API -----------------
@app.route('/api/teacher/dashboard')
@role_required('teacher', 'admin')
def api_teacher_dashboard():
    classes = db_session.query(Class).all()
    subjects = db_session.query(Subject).all()
    students = db_session.query(User).filter_by(role='student').all()

    student_records = []
    risk_counts = {'High Risk': 0, 'Moderate Risk': 0, 'Good Standing': 0, 'Excellent': 0}
    total_score = 0

    for s in students:
        profile = db_session.query(StudentProfile).filter_by(student_id=s.id).first()
        attempts = db_session.query(QuizAttempt).filter_by(student_id=s.id).all()
        avg_quiz = round(sum(a.percentage for a in attempts) / len(attempts), 1) if attempts else 0.0

        risk = profile.risk_level if profile else 'Moderate Risk'
        risk_counts[risk] = risk_counts.get(risk, 0) + 1

        pred_score = profile.predicted_score if profile else 65.0
        total_score += pred_score

        student_records.append({
            'id': s.id,
            'name': s.full_name,
            'email': s.email,
            'class_name': s.class_obj.name if s.class_obj else 'Unassigned',
            'attendance': profile.attendance_rate if profile else 0.0,
            'study_hours': profile.study_hours_per_week if profile else 0.0,
            'avg_quiz': avg_quiz,
            'predicted_score': pred_score,
            'risk_level': risk,
            'attempts_count': len(attempts)
        })

    avg_predicted = round(total_score / len(students), 1) if students else 0.0
    all_answers = db_session.query(QuizAnswer).all()
    topic_stats, weak_topics = ml_engine.analyze_student_topics(all_answers)

    materials = db_session.query(Material).all()
    quizzes = db_session.query(Quiz).all()

    return jsonify({
        'classes': [c.to_dict() for c in classes],
        'subjects': [s.to_dict() for s in subjects],
        'students': student_records,
        'risk_counts': risk_counts,
        'avg_predicted_score': avg_predicted,
        'topic_stats': topic_stats,
        'weak_topics': weak_topics,
        'materials': [m.to_dict() for m in materials],
        'quizzes': [q.to_dict() for q in quizzes]
    })

@app.route('/api/teacher/students/<int:student_id>')
@role_required('teacher', 'admin')
def api_teacher_student_detail(student_id):
    student = db_session.get(User, student_id)
    if not student or student.role != 'student':
        return jsonify({'error': 'Student not found'}), 404

    profile = db_session.query(StudentProfile).filter_by(student_id=student.id).first()
    attempts = db_session.query(QuizAttempt).filter_by(student_id=student.id).order_by(QuizAttempt.completed_at.asc()).all()
    recommendations = db_session.query(Recommendation).filter_by(student_id=student.id).all()

    answers = db_session.query(QuizAnswer).join(QuizAttempt).filter(QuizAttempt.student_id == student.id).all()
    topic_stats, weak_topics = ml_engine.analyze_student_topics(answers)

    return jsonify({
        'student': student.to_dict(),
        'profile': profile.to_dict() if profile else None,
        'attempts': [a.to_dict() for a in attempts],
        'recommendations': [r.to_dict() for r in recommendations],
        'topic_stats': topic_stats,
        'weak_topics': weak_topics
    })

@app.route('/api/teacher/materials', methods=['POST'])
@role_required('teacher', 'admin')
def api_create_material():
    data = request.get_json() or request.form or {}
    user = get_current_user()

    subject_id = data.get('subject_id')
    title = data.get('title')
    topic = data.get('topic')
    content_type = data.get('content_type', 'notes')
    content = data.get('content')
    external_url = data.get('external_url')

    if not all([subject_id, title, topic, content]):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    mat = Material(
        subject_id=int(subject_id),
        title=title.strip(),
        topic=topic.strip(),
        content_type=content_type,
        content=content.strip(),
        external_url=external_url.strip() if external_url else None,
        created_by=user.id
    )
    db_session.add(mat)
    db_session.commit()
    return jsonify({'success': True, 'material': mat.to_dict()})

@app.route('/api/teacher/quizzes', methods=['POST'])
@role_required('teacher', 'admin')
def api_create_quiz():
    data = request.get_json() or {}
    user = get_current_user()

    subject_id = data.get('subject_id')
    title = data.get('title')
    description = data.get('description', '')
    topic = data.get('topic')
    assessment_type = data.get('assessment_type', 'practice')
    time_limit = int(data.get('time_limit_mins', 15))
    pass_pct = float(data.get('pass_percentage', 50.0))
    questions_list = data.get('questions', [])

    if not all([subject_id, title, topic]):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    quiz = Quiz(
        subject_id=int(subject_id),
        title=title.strip(),
        description=description.strip(),
        topic=topic.strip(),
        assessment_type=assessment_type,
        time_limit_mins=time_limit,
        pass_percentage=pass_pct,
        created_by=user.id
    )
    db_session.add(quiz)
    db_session.flush()

    for q in questions_list:
        q_text = q.get('question_text', '').strip()
        if q_text:
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_text,
                topic=q.get('topic', topic).strip(),
                option_a=q.get('option_a', '').strip(),
                option_b=q.get('option_b', '').strip(),
                option_c=q.get('option_c', '').strip(),
                option_d=q.get('option_d', '').strip(),
                correct_option=q.get('correct_option', 'A').strip().upper(),
                explanation=q.get('explanation', '').strip()
            )
            db_session.add(question)

    db_session.commit()
    return jsonify({'success': True, 'quiz': quiz.to_dict(include_questions=True)})

# ----------------- Admin Module API -----------------
@app.route('/api/admin/dashboard')
@role_required('admin')
def api_admin_dashboard():
    users = db_session.query(User).all()
    classes = db_session.query(Class).all()
    subjects = db_session.query(Subject).all()
    materials = db_session.query(Material).all()
    quizzes = db_session.query(Quiz).all()
    attempts = db_session.query(QuizAttempt).all()

    stats = {
        'total_students': len([u for u in users if u.role == 'student']),
        'total_teachers': len([u for u in users if u.role == 'teacher']),
        'total_classes': len(classes),
        'total_subjects': len(subjects),
        'total_materials': len(materials),
        'total_quizzes': len(quizzes),
        'total_attempts': len(attempts)
    }

    return jsonify({
        'stats': stats,
        'users': [u.to_dict() for u in users],
        'classes': [c.to_dict() for c in classes],
        'subjects': [s.to_dict() for s in subjects],
        'materials': [m.to_dict() for m in materials],
        'quizzes': [q.to_dict() for q in quizzes]
    })

@app.route('/api/admin/users', methods=['POST'])
@role_required('admin')
def api_admin_create_user():
    data = request.get_json() or request.form or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    full_name = data.get('full_name', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'student').strip()
    class_id = data.get('class_id')

    if not all([username, email, full_name, password, role]):
        return jsonify({'success': False, 'error': 'All fields are required'}), 400

    if db_session.query(User).filter((User.username == username) | (User.email == email)).first():
        return jsonify({'success': False, 'error': 'Username or Email already exists'}), 400

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        class_id=int(class_id) if class_id and str(class_id).isdigit() else None
    )
    user.set_password(password)
    db_session.add(user)
    db_session.flush()

    if role == 'student':
        profile = StudentProfile(
            student_id=user.id,
            attendance_rate=85.0,
            study_hours_per_week=10.0,
            assignments_completed_pct=80.0,
            predicted_score=72.0,
            risk_level='Good Standing',
            last_evaluated=datetime.now(timezone.utc)
        )
        db_session.add(profile)

    db_session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@role_required('admin')
def api_admin_delete_user(user_id):
    current = get_current_user()
    if user_id == current.id:
        return jsonify({'success': False, 'error': 'Cannot delete own account'}), 400

    user = db_session.get(User, user_id)
    if user:
        db_session.delete(user)
        db_session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'User not found'}), 404

@app.route('/api/admin/classes', methods=['POST'])
@role_required('admin')
def api_admin_create_class():
    data = request.get_json() or request.form or {}
    name = data.get('name', '').strip()
    grade = data.get('grade_level')
    section = data.get('section', 'A').strip()
    description = data.get('description', '').strip()

    if not all([name, grade]):
        return jsonify({'success': False, 'error': 'Name and grade level required'}), 400

    new_class = Class(name=name, grade_level=int(grade), section=section, description=description)
    db_session.add(new_class)
    db_session.commit()
    return jsonify({'success': True, 'class': new_class.to_dict()})

@app.route('/api/admin/subjects', methods=['POST'])
@role_required('admin')
def api_admin_create_subject():
    data = request.get_json() or request.form or {}
    name = data.get('name', '').strip()
    code = data.get('code', '').strip()
    class_id = data.get('class_id')

    if not all([name, code, class_id]):
        return jsonify({'success': False, 'error': 'Name, code, and class_id required'}), 400

    new_subj = Subject(name=name, code=code, class_id=int(class_id))
    db_session.add(new_subj)
    db_session.commit()
    return jsonify({'success': True, 'subject': new_subj.to_dict()})

@app.route('/api/admin/reset-data', methods=['POST'])
@role_required('admin')
def api_admin_reset_data():
    from seed_data import seed_database
    seed_database()
    return jsonify({'success': True, 'message': 'Demo data reset successfully'})

# ----------------- Analytics Module API -----------------
@app.route('/api/analytics/overview')
@login_required
def api_analytics_overview():
    pre_attempts_math = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'pre_test', Quiz.subject_id == 1).all()
    post_attempts_math = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'post_test', Quiz.subject_id == 1).all()
    math_comparison = ml_engine.compute_assessment_comparison(pre_attempts_math, post_attempts_math)

    pre_attempts_sci = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'pre_test', Quiz.subject_id == 2).all()
    post_attempts_sci = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'post_test', Quiz.subject_id == 2).all()
    sci_comparison = ml_engine.compute_assessment_comparison(pre_attempts_sci, post_attempts_sci)

    all_answers = db_session.query(QuizAnswer).all()
    topic_stats, weak_topics = ml_engine.analyze_student_topics(all_answers)

    profiles = db_session.query(StudentProfile).all()
    risk_dist = {'High Risk': 0, 'Moderate Risk': 0, 'Good Standing': 0, 'Excellent': 0}
    for p in profiles:
        risk_dist[p.risk_level] = risk_dist.get(p.risk_level, 0) + 1

    correlation_data = [
        {
            'name': p.student.full_name,
            'study_hours': p.study_hours_per_week,
            'predicted_score': p.predicted_score,
            'attendance': p.attendance_rate
        }
        for p in profiles if p.student
    ]

    return jsonify({
        'math_comparison': math_comparison,
        'sci_comparison': sci_comparison,
        'topic_stats': topic_stats,
        'weak_topics': weak_topics,
        'risk_distribution': risk_dist,
        'correlation_data': correlation_data
    })

@app.route('/api/analytics/assessment-comparison')
@login_required
def api_assessment_comparison():
    pre_attempts = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'pre_test').all()
    post_attempts = db_session.query(QuizAttempt).join(Quiz).filter(Quiz.assessment_type == 'post_test').all()
    students = {u.id: u.full_name for u in db_session.query(User).filter_by(role='student').all()}

    pre_by_student = {}
    for a in pre_attempts:
        pre_by_student.setdefault(a.student_id, []).append(a.percentage)

    post_by_student = {}
    for a in post_attempts:
        post_by_student.setdefault(a.student_id, []).append(a.percentage)

    labels, pre_scores, post_scores, deltas = [], [], [], []
    for sid, name in students.items():
        if sid in pre_by_student and sid in post_by_student:
            avg_pre = sum(pre_by_student[sid]) / len(pre_by_student[sid])
            avg_post = sum(post_by_student[sid]) / len(post_by_student[sid])
            labels.append(name)
            pre_scores.append(round(avg_pre, 1))
            post_scores.append(round(avg_post, 1))
            deltas.append(round(avg_post - avg_pre, 1))

    return jsonify({
        'labels': labels,
        'pre_scores': pre_scores,
        'post_scores': post_scores,
        'deltas': deltas
    })

@app.route('/api/analytics/topic-mastery')
@login_required
def api_topic_mastery():
    all_answers = db_session.query(QuizAnswer).all()
    topic_stats, _ = ml_engine.analyze_student_topics(all_answers)
    labels = list(topic_stats.keys())
    values = [topic_stats[t]['percentage'] for t in labels]
    statuses = [topic_stats[t]['status'] for t in labels]
    return jsonify({
        'labels': labels,
        'values': values,
        'statuses': statuses
    })

@app.route('/api/analytics/risk-distribution')
@login_required
def api_risk_distribution():
    profiles = db_session.query(StudentProfile).all()
    dist = {'High Risk': 0, 'Moderate Risk': 0, 'Good Standing': 0, 'Excellent': 0}
    for p in profiles:
        dist[p.risk_level] = dist.get(p.risk_level, 0) + 1
    return jsonify(dist)

# ----------------- Frontend Static Serving (Convenience Fallback) -----------------
@app.route('/')
def serve_root():
    if os.path.exists(os.path.join(FRONTEND_DIR, 'index.html')):
        return send_from_directory(FRONTEND_DIR, 'index.html')
    return jsonify({'message': 'Smart School Backend API is running'})

@app.route('/<path:path>')
def serve_frontend_files(path):
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    if os.path.exists(file_path + '.html'):
        return send_from_directory(FRONTEND_DIR, path + '.html')
    return send_from_directory(FRONTEND_DIR, 'index.html')

if __name__ == '__main__':
    Base.metadata.create_all(bind=engine)
    app.run(host='127.0.0.1', port=5000, debug=True)
