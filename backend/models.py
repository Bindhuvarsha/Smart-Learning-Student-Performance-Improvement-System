from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session, relationship
from config import Config

def utc_now():
    return datetime.now(timezone.utc)

Base = declarative_base()

# Setup database engine and session
engine = create_engine(Config.SQLALCHEMY_DATABASE_URI, echo=False)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base.query = db_session.query_property()


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), nullable=False, default='student')  # 'student', 'teacher', 'admin'
    full_name = Column(String(100), nullable=False)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    class_obj = relationship('Class', back_populates='students')
    quiz_attempts = relationship('QuizAttempt', back_populates='student', cascade='all, delete-orphan')
    profile = relationship('StudentProfile', back_populates='student', uselist=False, cascade='all, delete-orphan')
    recommendations = relationship('Recommendation', back_populates='student', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'class_id': self.class_id,
            'class_name': self.class_obj.name if self.class_obj else None
        }


class Class(Base):
    __tablename__ = 'classes'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)  # e.g., 'Grade 10 - Section A'
    grade_level = Column(Integer, nullable=False)           # 9, 10, etc.
    section = Column(String(10), default='A')
    description = Column(String(200), nullable=True)

    # Relationships
    students = relationship('User', back_populates='class_obj')
    subjects = relationship('Subject', back_populates='class_obj', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'grade_level': self.grade_level,
            'section': self.section,
            'description': self.description,
            'student_count': len(self.students) if self.students else 0
        }


class Subject(Base):
    __tablename__ = 'subjects'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)             # e.g., 'Mathematics'
    code = Column(String(20), nullable=False)              # e.g., 'MATH-10'
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)

    # Relationships
    class_obj = relationship('Class', back_populates='subjects')
    materials = relationship('Material', back_populates='subject', cascade='all, delete-orphan')
    quizzes = relationship('Quiz', back_populates='subject', cascade='all, delete-orphan')
    recommendations = relationship('Recommendation', back_populates='subject', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'class_id': self.class_id,
            'class_name': self.class_obj.name if self.class_obj else None,
            'materials_count': len(self.materials) if self.materials else 0,
            'quizzes_count': len(self.quizzes) if self.quizzes else 0
        }


class Material(Base):
    __tablename__ = 'materials'

    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    title = Column(String(150), nullable=False)
    topic = Column(String(100), nullable=False, index=True)
    content_type = Column(String(20), default='notes')     # 'notes', 'guide', 'summary', 'video'
    content = Column(Text, nullable=False)                 # Markdown / text notes
    external_url = Column(String(300), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    subject = relationship('Subject', back_populates='materials')

    def to_dict(self):
        return {
            'id': self.id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'title': self.title,
            'topic': self.topic,
            'content_type': self.content_type,
            'content': self.content,
            'external_url': self.external_url,
            'created_at': self.created_at.strftime('%Y-%m-%d') if self.created_at else ''
        }


class Quiz(Base):
    __tablename__ = 'quizzes'

    id = Column(Integer, primary_key=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    topic = Column(String(100), nullable=True)
    assessment_type = Column(String(20), default='practice')  # 'pre_test', 'post_test', 'practice'
    time_limit_mins = Column(Integer, default=15)
    pass_percentage = Column(Float, default=50.0)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    subject = relationship('Subject', back_populates='quizzes')
    questions = relationship('QuizQuestion', back_populates='quiz', cascade='all, delete-orphan')
    attempts = relationship('QuizAttempt', back_populates='quiz', cascade='all, delete-orphan')

    def to_dict(self, include_questions=False):
        data = {
            'id': self.id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'title': self.title,
            'description': self.description,
            'topic': self.topic,
            'assessment_type': self.assessment_type,
            'time_limit_mins': self.time_limit_mins,
            'pass_percentage': self.pass_percentage,
            'question_count': len(self.questions) if self.questions else 0
        }
        if include_questions:
            data['questions'] = [q.to_dict() for q in self.questions]
        return data


class QuizQuestion(Base):
    __tablename__ = 'quiz_questions'

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey('quizzes.id'), nullable=False)
    question_text = Column(Text, nullable=False)
    topic = Column(String(100), nullable=False, index=True)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_option = Column(String(1), nullable=False)  # 'A', 'B', 'C', 'D'
    explanation = Column(Text, nullable=True)

    # Relationships
    quiz = relationship('Quiz', back_populates='questions')
    answers = relationship('QuizAnswer', back_populates='question', cascade='all, delete-orphan')

    def to_dict(self, include_answer=False):
        data = {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'question_text': self.question_text,
            'topic': self.topic,
            'option_a': self.option_a,
            'option_b': self.option_b,
            'option_c': self.option_c,
            'option_d': self.option_d,
        }
        if include_answer:
            data['correct_option'] = self.correct_option
            data['explanation'] = self.explanation
        return data


class QuizAttempt(Base):
    __tablename__ = 'quiz_attempts'

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey('quizzes.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    time_spent_seconds = Column(Integer, default=0)
    assessment_type = Column(String(20), default='practice')  # 'pre_test', 'post_test', 'practice'
    completed_at = Column(DateTime, default=utc_now)

    # Relationships
    quiz = relationship('Quiz', back_populates='attempts')
    student = relationship('User', back_populates='quiz_attempts')
    answers = relationship('QuizAnswer', back_populates='attempt', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'quiz_title': self.quiz.title if self.quiz else None,
            'subject_name': self.quiz.subject.name if self.quiz and self.quiz.subject else None,
            'student_id': self.student_id,
            'student_name': self.student.full_name if self.student else None,
            'score': self.score,
            'total_questions': self.total_questions,
            'percentage': round(self.percentage, 1),
            'time_spent_seconds': self.time_spent_seconds,
            'assessment_type': self.assessment_type,
            'completed_at': self.completed_at.strftime('%Y-%m-%d %H:%M') if self.completed_at else ''
        }


class QuizAnswer(Base):
    __tablename__ = 'quiz_answers'

    id = Column(Integer, primary_key=True)
    attempt_id = Column(Integer, ForeignKey('quiz_attempts.id'), nullable=False)
    question_id = Column(Integer, ForeignKey('quiz_questions.id'), nullable=False)
    selected_option = Column(String(1), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    topic = Column(String(100), nullable=False, index=True)

    # Relationships
    attempt = relationship('QuizAttempt', back_populates='answers')
    question = relationship('QuizQuestion', back_populates='answers')

    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'question_id': self.question_id,
            'selected_option': self.selected_option,
            'is_correct': self.is_correct,
            'topic': self.topic
        }


class StudentProfile(Base):
    __tablename__ = 'student_profiles'

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    attendance_rate = Column(Float, default=85.0)              # 0 - 100%
    study_hours_per_week = Column(Float, default=10.0)         # hours
    assignments_completed_pct = Column(Float, default=80.0)    # 0 - 100%
    predicted_score = Column(Float, default=70.0)              # 0 - 100%
    risk_level = Column(String(20), default='Moderate Risk')   # 'High Risk', 'Moderate Risk', 'Good Standing', 'Excellent'
    last_evaluated = Column(DateTime, default=utc_now)

    # Relationships
    student = relationship('User', back_populates='profile')

    def to_dict(self):
        return {
            'student_id': self.student_id,
            'attendance_rate': self.attendance_rate,
            'study_hours_per_week': self.study_hours_per_week,
            'assignments_completed_pct': self.assignments_completed_pct,
            'predicted_score': round(self.predicted_score, 1),
            'risk_level': self.risk_level,
            'last_evaluated': self.last_evaluated.strftime('%Y-%m-%d') if self.last_evaluated else ''
        }


class Recommendation(Base):
    __tablename__ = 'recommendations'

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=False)
    topic = Column(String(100), nullable=False)
    material_id = Column(Integer, ForeignKey('materials.id'), nullable=True)
    reason = Column(Text, nullable=False)
    priority = Column(String(20), default='Medium')            # 'High', 'Medium', 'Low'
    status = Column(String(20), default='Pending')              # 'Pending', 'In Progress', 'Completed'
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    student = relationship('User', back_populates='recommendations')
    subject = relationship('Subject', back_populates='recommendations')
    material = relationship('Material')

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'topic': self.topic,
            'material_id': self.material_id,
            'material_title': self.material.title if self.material else None,
            'reason': self.reason,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d') if self.created_at else ''
        }


def init_db():
    """Initializes the database schema."""
    Base.metadata.create_all(bind=engine)
