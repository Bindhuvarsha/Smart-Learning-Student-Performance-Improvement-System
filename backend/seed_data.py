import os
from datetime import datetime, timezone, timedelta
from models import (
    engine, db_session, Base, User, Class, Subject, Material,
    Quiz, QuizQuestion, QuizAttempt, QuizAnswer, StudentProfile, Recommendation
)
from ml_engine import ml_engine

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print("Creating Classes...")
    class_10a = Class(name="Grade 10 - Section A", grade_level=10, section="A", description="Secondary School Senior Batch A")
    class_10b = Class(name="Grade 10 - Section B", grade_level=10, section="B", description="Secondary School Senior Batch B")
    class_9a = Class(name="Grade 9 - Section A", grade_level=9, section="A", description="Secondary School Junior Batch A")
    db_session.add_all([class_10a, class_10b, class_9a])
    db_session.commit()

    print("Creating Users...")
    admin = User(
        username="admin",
        email="admin@smartschool.edu",
        role="admin",
        full_name="Dr. Alistair Vance (Principal / Admin)"
    )
    admin.set_password("admin123")

    teacher_smith = User(
        username="teacher_smith",
        email="smith@smartschool.edu",
        role="teacher",
        full_name="Prof. Sarah Smith"
    )
    teacher_smith.set_password("teacher123")

    teacher_rao = User(
        username="teacher_rao",
        email="rao@smartschool.edu",
        role="teacher",
        full_name="Prof. Rajesh Rao"
    )
    teacher_rao.set_password("teacher123")

    students_data = [
        ("student_alex", "alex@smartschool.edu", "Alex Johnson", class_10a.id, 76.0, 6.5, 68.0),
        ("student_priya", "priya@smartschool.edu", "Priya Sharma", class_10a.id, 96.0, 18.0, 95.0),
        ("student_rahul", "rahul@smartschool.edu", "Rahul Verma", class_10a.id, 62.0, 3.5, 50.0),
        ("student_anita", "anita@smartschool.edu", "Anita Desai", class_10a.id, 88.0, 12.0, 85.0),
        ("student_david", "david@smartschool.edu", "David Lee", class_10a.id, 82.0, 9.0, 78.0)
    ]

    student_users = []
    for uname, email, fname, cid, att, hrs, asgn in students_data:
        u = User(
            username=uname,
            email=email,
            role="student",
            full_name=fname,
            class_id=cid
        )
        u.set_password("student123")
        db_session.add(u)
        student_users.append((u, att, hrs, asgn))

    db_session.add_all([admin, teacher_smith, teacher_rao])
    db_session.commit()

    print("Creating Subjects...")
    math = Subject(name="Mathematics", code="MATH-10", class_id=class_10a.id)
    science = Subject(name="Physical Science", code="SCI-10", class_id=class_10a.id)
    cs = Subject(name="Computer Science", code="CS-10", class_id=class_10a.id)
    db_session.add_all([math, science, cs])
    db_session.commit()

    print("Creating Learning Materials...")
    materials = [
        Material(
            subject_id=math.id,
            title="Comprehensive Guide to Quadratic Equations",
            topic="Quadratic Equations",
            content_type="notes",
            content="""# Quadratic Equations Mastery Guide

### 1. Standard Form
A quadratic equation is expressed as:
$$ax^2 + bx + c = 0$$
where $a \\neq 0$.

### 2. Quadratic Formula
The roots are calculated using:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

### 3. The Discriminant ($\\Delta$)
- If $\\Delta = b^2 - 4ac > 0$: Two distinct real roots.
- If $\\Delta = 0$: One repeated real root.
- If $\\Delta < 0$: No real roots (two complex roots).

### 4. Worked Example
Solve: $2x^2 - 5x + 3 = 0$
- $a = 2, b = -5, c = 3$
- Discriminant: $(-5)^2 - 4(2)(3) = 25 - 24 = 1$
- $x = \\frac{5 \\pm 1}{4} \\implies x = 1.5$ or $x = 1$.
""",
            external_url="https://en.wikipedia.org/wiki/Quadratic_equation",
            created_by=teacher_smith.id
        ),
        Material(
            subject_id=math.id,
            title="Trigonometric Ratios & Pythagorean Identities",
            topic="Trigonometry",
            content_type="guide",
            content="""# Trigonometric Ratios & Identities

### 1. The Right-Angled Triangle
- $\\sin(\\theta) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}$
- $\\cos(\\theta) = \\frac{\\text{Adjacent}}{\\text{Hypotenuse}}$
- $\\tan(\\theta) = \\frac{\\text{Opposite}}{\\text{Adjacent}}$

### 2. Fundamental Identities
- $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$
- $1 + \\tan^2(\\theta) = \\sec^2(\\theta)$
- $1 + \\cot^2(\\theta) = \\csc^2(\\theta)$
""",
            external_url="https://en.wikipedia.org/wiki/Trigonometric_functions",
            created_by=teacher_smith.id
        ),
        Material(
            subject_id=science.id,
            title="Newton's Laws of Motion & Momentum",
            topic="Newton's Laws",
            content_type="notes",
            content="""# Newton's Laws of Motion

### 1. First Law (Law of Inertia)
An object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced external force.

### 2. Second Law (Force and Acceleration)
$$\\vec{F}_{net} = m \\vec{a}$$

### 3. Third Law (Action & Reaction)
$$\\vec{F}_{A \\rightarrow B} = -\\vec{F}_{B \\rightarrow A}$$
""",
            external_url="https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion",
            created_by=teacher_smith.id
        ),
        Material(
            subject_id=science.id,
            title="Chemical Reactions & Balancing Equations",
            topic="Chemical Reactions",
            content_type="summary",
            content="""# Chemical Reactions & Equations

### Types of Chemical Reactions:
1. Combination Reaction: $A + B \\rightarrow AB$
2. Decomposition Reaction: $AB \\rightarrow A + B$
3. Displacement Reaction: $A + BC \\rightarrow AC + B$
4. Redox Reactions: Oxidation is loss of electrons; Reduction is gain of electrons.
""",
            external_url="https://en.wikipedia.org/wiki/Chemical_reaction",
            created_by=teacher_smith.id
        ),
        Material(
            subject_id=cs.id,
            title="Data Structures: Arrays vs Linked Lists",
            topic="Data Structures",
            content_type="notes",
            content="""# Data Structures: Arrays & Linked Lists

### Arrays:
- Contiguous memory allocation.
- $O(1)$ random access by index.
- $O(n)$ insertion/deletion in worst case.

### Linked Lists:
- Non-contiguous memory allocation; nodes connected by pointers.
- $O(n)$ sequential access.
- $O(1)$ insertion/deletion if pointer to target node is known.
""",
            external_url="https://en.wikipedia.org/wiki/Linked_list",
            created_by=teacher_rao.id
        )
    ]
    db_session.add_all(materials)
    db_session.commit()

    print("Creating Quizzes & Questions...")
    quiz_math_pre = Quiz(
        subject_id=math.id,
        title="Mathematics Diagnostic Pre-Assessment",
        description="Initial benchmark test to measure baseline skills before instruction.",
        topic="General Mathematics",
        assessment_type="pre_test",
        time_limit_mins=20,
        pass_percentage=50.0,
        created_by=teacher_smith.id
    )

    quiz_math_post = Quiz(
        subject_id=math.id,
        title="Mathematics Post-Instruction Assessment",
        description="Comprehensive evaluation following remedial digital modules.",
        topic="General Mathematics",
        assessment_type="post_test",
        time_limit_mins=20,
        pass_percentage=50.0,
        created_by=teacher_smith.id
    )

    quiz_quad = Quiz(
        subject_id=math.id,
        title="Quadratic Equations Practice Quiz",
        description="Focused practice quiz on finding roots, discriminant, and word problems.",
        topic="Quadratic Equations",
        assessment_type="practice",
        time_limit_mins=15,
        pass_percentage=60.0,
        created_by=teacher_smith.id
    )

    quiz_sci_pre = Quiz(
        subject_id=science.id,
        title="Physical Science Diagnostic Pre-Assessment",
        description="Baseline evaluation covering Newton's Laws and Chemical Reactions.",
        topic="General Science",
        assessment_type="pre_test",
        time_limit_mins=20,
        pass_percentage=50.0,
        created_by=teacher_smith.id
    )

    quiz_sci_post = Quiz(
        subject_id=science.id,
        title="Physical Science Post-Instruction Assessment",
        description="Follow-up assessment to measure student academic improvement.",
        topic="General Science",
        assessment_type="post_test",
        time_limit_mins=20,
        pass_percentage=50.0,
        created_by=teacher_smith.id
    )

    db_session.add_all([quiz_math_pre, quiz_math_post, quiz_quad, quiz_sci_pre, quiz_sci_post])
    db_session.commit()

    # Questions
    math_q1 = QuizQuestion(
        quiz_id=quiz_math_pre.id,
        question_text="What are the roots of the quadratic equation x² - 7x + 12 = 0?",
        topic="Quadratic Equations",
        option_a="x = 3 and x = 4",
        option_b="x = -3 and x = -4",
        option_c="x = 2 and x = 6",
        option_d="x = -2 and x = -6",
        correct_option="A",
        explanation="Factoring (x - 3)(x - 4) = 0 gives roots x = 3 and x = 4."
    )
    math_q2 = QuizQuestion(
        quiz_id=quiz_math_pre.id,
        question_text="If the discriminant b² - 4ac of a quadratic equation is negative, what is the nature of the roots?",
        topic="Quadratic Equations",
        option_a="Two equal real roots",
        option_b="Two distinct real roots",
        option_c="No real roots (complex roots)",
        option_d="Infinitely many roots",
        correct_option="C",
        explanation="When the discriminant is less than zero, the square root yields imaginary numbers, hence no real roots."
    )
    math_q3 = QuizQuestion(
        quiz_id=quiz_math_pre.id,
        question_text="What is the value of sin²(θ) + cos²(θ)?",
        topic="Trigonometry",
        option_a="0",
        option_b="1",
        option_c="2",
        option_d="tan(θ)",
        correct_option="B",
        explanation="sin²(θ) + cos²(θ) = 1 is the fundamental Pythagorean trigonometric identity."
    )
    math_q4 = QuizQuestion(
        quiz_id=quiz_math_pre.id,
        question_text="In a right-angled triangle, if opposite side = 3 and adjacent side = 4, what is tan(θ)?",
        topic="Trigonometry",
        option_a="3/5",
        option_b="4/5",
        option_c="3/4",
        option_d="4/3",
        correct_option="C",
        explanation="tan(θ) = Opposite / Adjacent = 3/4."
    )
    math_q5 = QuizQuestion(
        quiz_id=quiz_math_pre.id,
        question_text="What is the vertex x-coordinate of the parabola y = 2x² - 8x + 5?",
        topic="Quadratic Equations",
        option_a="x = 2",
        option_b="x = 4",
        option_c="x = -2",
        option_d="x = 8",
        correct_option="A",
        explanation="Vertex x = -b / (2a) = -(-8) / (2 * 2) = 8 / 4 = 2."
    )

    math_post_q1 = QuizQuestion(
        quiz_id=quiz_math_post.id,
        question_text="What are the roots of x² - 9x + 20 = 0?",
        topic="Quadratic Equations",
        option_a="x = 4 and x = 5",
        option_b="x = -4 and x = -5",
        option_c="x = 2 and x = 10",
        option_d="x = 1 and x = 20",
        correct_option="A",
        explanation="Factoring (x - 4)(x - 5) = 0 gives x = 4 and x = 5."
    )
    math_post_q2 = QuizQuestion(
        quiz_id=quiz_math_post.id,
        question_text="Find the discriminant of 3x² - 6x + 3 = 0.",
        topic="Quadratic Equations",
        option_a="36",
        option_b="0",
        option_c="-36",
        option_d="12",
        correct_option="B",
        explanation="b² - 4ac = (-6)² - 4(3)(3) = 36 - 36 = 0."
    )
    math_post_q3 = QuizQuestion(
        quiz_id=quiz_math_post.id,
        question_text="If sin(θ) = 1/2 for an acute angle θ, what is θ in degrees?",
        topic="Trigonometry",
        option_a="45°",
        option_b="60°",
        option_c="30°",
        option_d="90°",
        correct_option="C",
        explanation="sin(30°) = 1/2."
    )
    math_post_q4 = QuizQuestion(
        quiz_id=quiz_math_post.id,
        question_text="Which identity equals sec²(θ)?",
        topic="Trigonometry",
        option_a="1 + sin²(θ)",
        option_b="1 + tan²(θ)",
        option_c="1 + cot²(θ)",
        option_d="1 - cos²(θ)",
        correct_option="B",
        explanation="1 + tan²(θ) = sec²(θ) is a standard identity."
    )
    math_post_q5 = QuizQuestion(
        quiz_id=quiz_math_post.id,
        question_text="If a quadratic equation has roots 2 and -3, what is the equation?",
        topic="Quadratic Equations",
        option_a="x² + x - 6 = 0",
        option_b="x² - x - 6 = 0",
        option_c="x² + 5x + 6 = 0",
        option_d="x² - 5x + 6 = 0",
        correct_option="A",
        explanation="(x - 2)(x + 3) = x² + x - 6 = 0."
    )

    quad_q1 = QuizQuestion(
        quiz_id=quiz_quad.id,
        question_text="For the equation 2x² + 4x - 6 = 0, what is the product of the roots?",
        topic="Quadratic Equations",
        option_a="-3",
        option_b="3",
        option_c="-2",
        option_d="2",
        correct_option="A",
        explanation="Product of roots = c/a = -6/2 = -3."
    )
    quad_q2 = QuizQuestion(
        quiz_id=quiz_quad.id,
        question_text="Solve by quadratic formula: x² + 2x - 8 = 0.",
        topic="Quadratic Equations",
        option_a="x = 2, -4",
        option_b="x = -2, 4",
        option_c="x = 1, -8",
        option_d="x = -1, 8",
        correct_option="A",
        explanation="x = (-2 ± √(4 - 4(1)(-8))) / 2 = (-2 ± √36)/2 = (-2 ± 6)/2 -> x = 2 or -4."
    )

    sci_q1 = QuizQuestion(
        quiz_id=quiz_sci_pre.id,
        question_text="A 5 kg mass accelerates at 3 m/s². What net force was applied?",
        topic="Newton's Laws",
        option_a="15 N",
        option_b="8 N",
        option_c="1.67 N",
        option_d="45 N",
        correct_option="A",
        explanation="F = m * a = 5 kg * 3 m/s² = 15 N."
    )
    sci_q2 = QuizQuestion(
        quiz_id=quiz_sci_pre.id,
        question_text="Which law explains why passengers jerk forward when a bus suddenly brakes?",
        topic="Newton's Laws",
        option_a="Newton's First Law (Inertia)",
        option_b="Newton's Second Law",
        option_c="Newton's Third Law",
        option_d="Law of Universal Gravitation",
        correct_option="A",
        explanation="Due to inertia, the body tends to maintain its state of uniform forward motion."
    )
    sci_q3 = QuizQuestion(
        quiz_id=quiz_sci_pre.id,
        question_text="What type of reaction is 2H₂ + O₂ -> 2H₂O?",
        topic="Chemical Reactions",
        option_a="Combination Reaction",
        option_b="Decomposition Reaction",
        option_c="Displacement Reaction",
        option_d="Double Displacement Reaction",
        correct_option="A",
        explanation="Two reactants combine to produce a single product."
    )
    sci_q4 = QuizQuestion(
        quiz_id=quiz_sci_pre.id,
        question_text="In the reaction Zn + CuSO₄ -> ZnSO₄ + Cu, what is being oxidized?",
        topic="Chemical Reactions",
        option_a="Zinc (Zn)",
        option_b="Copper (Cu)",
        option_c="Sulfate (SO₄)",
        option_d="Oxygen",
        correct_option="A",
        explanation="Zinc loses 2 electrons to form Zn²⁺, which is oxidation."
    )

    sci_post_q1 = QuizQuestion(
        quiz_id=quiz_sci_post.id,
        question_text="If a net force of 20 N acts on a 4 kg object, what is its acceleration?",
        topic="Newton's Laws",
        option_a="5 m/s²",
        option_b="80 m/s²",
        option_c="0.2 m/s²",
        option_d="16 m/s²",
        correct_option="A",
        explanation="a = F / m = 20 / 4 = 5 m/s²."
    )
    sci_post_q2 = QuizQuestion(
        quiz_id=quiz_sci_post.id,
        question_text="Action and reaction forces according to Newton's 3rd Law:",
        topic="Newton's Laws",
        option_a="Act on two different bodies and are equal in magnitude",
        option_b="Act on the same body and cancel each other out",
        option_c="Are unequal in magnitude",
        option_d="Act in the same direction",
        correct_option="A",
        explanation="Action and reaction forces act on different bodies and never cancel each other out."
    )
    sci_post_q3 = QuizQuestion(
        quiz_id=quiz_sci_post.id,
        question_text="When calcium carbonate is heated to produce calcium oxide and carbon dioxide (CaCO₃ -> CaO + CO₂), it is an example of:",
        topic="Chemical Reactions",
        option_a="Thermal Decomposition Reaction",
        option_b="Combination Reaction",
        option_c="Displacement Reaction",
        option_d="Neutralization Reaction",
        correct_option="A",
        explanation="A single compound breaks down into two substances upon heating."
    )
    sci_post_q4 = QuizQuestion(
        quiz_id=quiz_sci_post.id,
        question_text="Loss of electrons during a chemical reaction is defined as:",
        topic="Chemical Reactions",
        option_a="Oxidation",
        option_b="Reduction",
        option_c="Precipitation",
        option_d="Combustion",
        correct_option="A",
        explanation="Oxidation is the loss of electrons."
    )

    all_questions = [
        math_q1, math_q2, math_q3, math_q4, math_q5,
        math_post_q1, math_post_q2, math_post_q3, math_post_q4, math_post_q5,
        quad_q1, quad_q2,
        sci_q1, sci_q2, sci_q3, sci_q4,
        sci_post_q1, sci_post_q2, sci_post_q3, sci_post_q4
    ]
    db_session.add_all(all_questions)
    db_session.commit()

    print("Creating Realistic Student Quiz Attempts & Pre/Post Assessment Data...")
    student_records = [
        (
            student_users[0][0], # Alex Johnson
            [True, False, True, False, False], # Pre Math: 40%
            [True, True, True, True, False],    # Post Math: 80%
            [True, False, False, True],         # Pre Sci: 50%
            [True, True, True, True]            # Post Sci: 100%
        ),
        (
            student_users[1][0], # Priya Sharma
            [True, True, True, False, True],    # Pre Math: 80%
            [True, True, True, True, True],     # Post Math: 100%
            [True, True, True, False],          # Pre Sci: 75%
            [True, True, True, True]            # Post Sci: 100%
        ),
        (
            student_users[2][0], # Rahul Verma
            [False, False, True, False, False], # Pre Math: 20%
            [True, False, True, True, False],   # Post Math: 60%
            [False, False, True, False],        # Pre Sci: 25%
            [True, False, True, True]           # Post Sci: 75%
        ),
        (
            student_users[3][0], # Anita Desai
            [True, False, True, True, False],   # Pre Math: 60%
            [True, True, True, True, False],    # Post Math: 80%
            [True, False, True, True],          # Pre Sci: 75%
            [True, True, True, True]            # Post Sci: 100%
        ),
        (
            student_users[4][0], # David Lee
            [False, True, True, False, False],  # Pre Math: 40%
            [True, True, True, False, True],    # Post Math: 80%
            [False, True, False, True],         # Pre Sci: 50%
            [True, True, False, True]           # Post Sci: 75%
        )
    ]

    for student, pre_m, post_m, pre_s, post_s in student_records:
        pre_att_m = QuizAttempt(
            quiz_id=quiz_math_pre.id,
            student_id=student.id,
            score=sum(pre_m),
            total_questions=len(pre_m),
            percentage=(sum(pre_m) / len(pre_m)) * 100.0,
            time_spent_seconds=720,
            assessment_type="pre_test",
            completed_at=datetime.now(timezone.utc) - timedelta(days=14)
        )
        db_session.add(pre_att_m)
        db_session.flush()

        math_pre_questions = [math_q1, math_q2, math_q3, math_q4, math_q5]
        for q, is_corr in zip(math_pre_questions, pre_m):
            sel_opt = q.correct_option if is_corr else ('B' if q.correct_option != 'B' else 'C')
            db_session.add(QuizAnswer(
                attempt_id=pre_att_m.id,
                question_id=q.id,
                selected_option=sel_opt,
                is_correct=is_corr,
                topic=q.topic
            ))

        post_att_m = QuizAttempt(
            quiz_id=quiz_math_post.id,
            student_id=student.id,
            score=sum(post_m),
            total_questions=len(post_m),
            percentage=(sum(post_m) / len(post_m)) * 100.0,
            time_spent_seconds=640,
            assessment_type="post_test",
            completed_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db_session.add(post_att_m)
        db_session.flush()

        math_post_questions = [math_post_q1, math_post_q2, math_post_q3, math_post_q4, math_post_q5]
        for q, is_corr in zip(math_post_questions, post_m):
            sel_opt = q.correct_option if is_corr else ('C' if q.correct_option != 'C' else 'D')
            db_session.add(QuizAnswer(
                attempt_id=post_att_m.id,
                question_id=q.id,
                selected_option=sel_opt,
                is_correct=is_corr,
                topic=q.topic
            ))

        pre_att_s = QuizAttempt(
            quiz_id=quiz_sci_pre.id,
            student_id=student.id,
            score=sum(pre_s),
            total_questions=len(pre_s),
            percentage=(sum(pre_s) / len(pre_s)) * 100.0,
            time_spent_seconds=600,
            assessment_type="pre_test",
            completed_at=datetime.now(timezone.utc) - timedelta(days=12)
        )
        db_session.add(pre_att_s)
        db_session.flush()

        sci_pre_questions = [sci_q1, sci_q2, sci_q3, sci_q4]
        for q, is_corr in zip(sci_pre_questions, pre_s):
            sel_opt = q.correct_option if is_corr else ('B' if q.correct_option != 'B' else 'C')
            db_session.add(QuizAnswer(
                attempt_id=pre_att_s.id,
                question_id=q.id,
                selected_option=sel_opt,
                is_correct=is_corr,
                topic=q.topic
            ))

        post_att_s = QuizAttempt(
            quiz_id=quiz_sci_post.id,
            student_id=student.id,
            score=sum(post_s),
            total_questions=len(post_s),
            percentage=(sum(post_s) / len(post_s)) * 100.0,
            time_spent_seconds=550,
            assessment_type="post_test",
            completed_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db_session.add(post_att_s)
        db_session.flush()

        sci_post_questions = [sci_post_q1, sci_post_q2, sci_post_q3, sci_post_q4]
        for q, is_corr in zip(sci_post_questions, post_s):
            sel_opt = q.correct_option if is_corr else ('B' if q.correct_option != 'B' else 'A')
            db_session.add(QuizAnswer(
                attempt_id=post_att_s.id,
                question_id=q.id,
                selected_option=sel_opt,
                is_correct=is_corr,
                topic=q.topic
            ))

    db_session.commit()

    print("Computing ML Student Profiles & Personalized Recommendations...")
    all_materials = db_session.query(Material).all()

    for student, att, hrs, asgn in student_users:
        attempts = db_session.query(QuizAttempt).filter_by(student_id=student.id).all()
        avg_quiz = sum(a.percentage for a in attempts) / len(attempts) if attempts else 60.0
        quiz_count = len(attempts)

        pred_score, risk_lvl = ml_engine.predict_performance(att, hrs, asgn, avg_quiz, quiz_count)

        profile = StudentProfile(
            student_id=student.id,
            attendance_rate=att,
            study_hours_per_week=hrs,
            assignments_completed_pct=asgn,
            predicted_score=pred_score,
            risk_level=risk_lvl,
            last_evaluated=datetime.now(timezone.utc)
        )
        db_session.add(profile)

        answers = db_session.query(QuizAnswer).join(QuizAttempt).filter(QuizAttempt.student_id == student.id).all()
        topic_stats, weak_topics = ml_engine.analyze_student_topics(answers)

        recs = ml_engine.generate_recommendations(student.id, weak_topics, all_materials)
        for r in recs:
            rec_obj = Recommendation(
                student_id=student.id,
                subject_id=math.id if "Quadratic" in r['topic'] or "Trig" in r['topic'] else science.id,
                topic=r['topic'],
                material_id=r['material_id'],
                reason=r['reason'],
                priority=r['priority'],
                status='Pending'
            )
            db_session.add(rec_obj)

    db_session.commit()
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed_database()
