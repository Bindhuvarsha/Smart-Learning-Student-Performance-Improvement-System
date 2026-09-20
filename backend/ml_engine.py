import os
import numpy as np
import pandas as pd
from datetime import datetime
import joblib

# Paths for saved models inside backend directory
MODEL_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models_saved')
os.makedirs(MODEL_DIR, exist_ok=True)
REG_MODEL_PATH = os.path.join(MODEL_DIR, 'score_predictor.joblib')
CLS_MODEL_PATH = os.path.join(MODEL_DIR, 'risk_classifier.joblib')

class AcademicMLEngine:
    def __init__(self):
        self.regressor = None
        self.classifier = None
        self._load_or_train_models()

    def _generate_synthetic_training_data(self, n_samples=1200):
        """Generates realistic synthetic academic data for training the ML models."""
        np.random.seed(42)
        
        # Features:
        # 1. Attendance rate (50% to 100%)
        # 2. Study hours per week (2 to 25 hours)
        # 3. Assignment completion % (40% to 100%)
        # 4. Average quiz score (30% to 100%)
        # 5. Quiz attempts count (1 to 20)
        attendance = np.random.uniform(50.0, 100.0, n_samples)
        study_hours = np.random.uniform(2.0, 25.0, n_samples)
        assignments = np.random.uniform(40.0, 100.0, n_samples)
        avg_quiz = np.random.uniform(30.0, 100.0, n_samples)
        quiz_count = np.random.randint(1, 21, n_samples)

        # Ground truth score computation with realistic noise and feature weights
        raw_score = (
            0.20 * attendance +
            1.20 * study_hours +
            0.18 * assignments +
            0.42 * avg_quiz +
            0.40 * quiz_count +
            np.random.normal(0, 4.0, n_samples)
        )
        
        scores = np.clip(raw_score, 25.0, 99.0)

        def categorize(s):
            if s < 50:
                return 'High Risk'
            elif s < 70:
                return 'Moderate Risk'
            elif s < 85:
                return 'Good Standing'
            else:
                return 'Excellent'

        risk_levels = [categorize(s) for s in scores]

        df = pd.DataFrame({
            'attendance': attendance,
            'study_hours': study_hours,
            'assignments': assignments,
            'avg_quiz': avg_quiz,
            'quiz_count': quiz_count,
            'final_score': scores,
            'risk_level': risk_levels
        })
        return df

    def _load_or_train_models(self):
        """Loads models if they exist, otherwise trains and saves them."""
        try:
            from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
            
            if os.path.exists(REG_MODEL_PATH) and os.path.exists(CLS_MODEL_PATH):
                self.regressor = joblib.load(REG_MODEL_PATH)
                self.classifier = joblib.load(CLS_MODEL_PATH)
            else:
                data = self._generate_synthetic_training_data()
                X = data[['attendance', 'study_hours', 'assignments', 'avg_quiz', 'quiz_count']]
                y_reg = data['final_score']
                y_cls = data['risk_level']

                self.regressor = RandomForestRegressor(n_estimators=100, random_state=42)
                self.regressor.fit(X, y_reg)
                joblib.dump(self.regressor, REG_MODEL_PATH)

                self.classifier = RandomForestClassifier(n_estimators=100, random_state=42)
                self.classifier.fit(X, y_cls)
                joblib.dump(self.classifier, CLS_MODEL_PATH)
        except Exception:
            self.regressor = None
            self.classifier = None

    def predict_performance(self, attendance, study_hours, assignments, avg_quiz, quiz_count):
        """Predicts student final score and risk level using the ML model or robust fallback."""
        if self.regressor is not None and self.classifier is not None:
            try:
                features = pd.DataFrame(
                    [[attendance, study_hours, assignments, avg_quiz, quiz_count]],
                    columns=['attendance', 'study_hours', 'assignments', 'avg_quiz', 'quiz_count']
                )
                pred_score = float(self.regressor.predict(features)[0])
                pred_risk = str(self.classifier.predict(features)[0])
                return round(pred_score, 1), pred_risk
            except Exception:
                pass

        # Heuristic fallback calculation
        score = (0.20 * attendance + 1.20 * study_hours + 0.18 * assignments + 0.42 * avg_quiz + 0.40 * quiz_count)
        score = max(20.0, min(99.0, score))
        if score < 50:
            risk = 'High Risk'
        elif score < 70:
            risk = 'Moderate Risk'
        elif score < 85:
            risk = 'Good Standing'
        else:
            risk = 'Excellent'
        return round(score, 1), risk

    def analyze_student_topics(self, student_answers):
        """
        Analyzes a list of QuizAnswer objects or dicts for a student.
        Returns:
            topic_stats: dict of topic -> {correct, total, percentage, status}
            weak_topics: list of topics with percentage < 70%
        """
        topic_counts = {}
        for ans in student_answers:
            topic = ans.topic if hasattr(ans, 'topic') else ans.get('topic')
            is_corr = ans.is_correct if hasattr(ans, 'is_correct') else ans.get('is_correct')
            if not topic:
                continue
            if topic not in topic_counts:
                topic_counts[topic] = {'correct': 0, 'total': 0}
            topic_counts[topic]['total'] += 1
            if is_corr:
                topic_counts[topic]['correct'] += 1

        topic_stats = {}
        weak_topics = []
        for topic, counts in topic_counts.items():
            pct = (counts['correct'] / counts['total']) * 100.0 if counts['total'] > 0 else 0.0
            if pct < 50.0:
                status = 'Weak'
                weak_topics.append({'topic': topic, 'percentage': round(pct, 1), 'severity': 'High'})
            elif pct < 70.0:
                status = 'Developing'
                weak_topics.append({'topic': topic, 'percentage': round(pct, 1), 'severity': 'Medium'})
            else:
                status = 'Mastered'

            topic_stats[topic] = {
                'correct': counts['correct'],
                'total': counts['total'],
                'percentage': round(pct, 1),
                'status': status
            }

        weak_topics.sort(key=lambda x: x['percentage'])
        return topic_stats, weak_topics

    def generate_recommendations(self, student_id, weak_topics, available_materials):
        """
        Generates personalized recommendations based on identified weak topics
        and available learning materials in the database.
        """
        recs = []
        for item in weak_topics:
            topic = item['topic']
            severity = item['severity']
            pct = item['percentage']

            matching_mat = None
            for mat in available_materials:
                if mat.topic.lower() == topic.lower():
                    matching_mat = mat
                    break

            if severity == 'High':
                priority = 'High'
                reason = f"Urgent review required: Mastery is only {pct}%. Review foundational study material."
            else:
                priority = 'Medium'
                reason = f"Recommended practice: Current mastery is {pct}%. Review study notes and take a quiz."

            recs.append({
                'student_id': student_id,
                'topic': topic,
                'material_id': matching_mat.id if matching_mat else None,
                'priority': priority,
                'reason': reason
            })
        return recs

    def compute_assessment_comparison(self, pre_attempts, post_attempts):
        """
        Computes before-and-after assessment analytics.
        Pre-test vs Post-test comparison.
        Calculates Hake's normalized gain: g = (post - pre) / (100 - pre)
        """
        pre_dict = {att.student_id: att.percentage for att in pre_attempts}
        post_dict = {att.student_id: att.percentage for att in post_attempts}

        common_students = set(pre_dict.keys()).intersection(set(post_dict.keys()))
        comparisons = []
        
        pre_total = 0.0
        post_total = 0.0
        gains = []

        for sid in common_students:
            pre_score = pre_dict[sid]
            post_score = post_dict[sid]
            diff = post_score - pre_score

            denom = 100.0 - pre_score
            norm_gain = (diff / denom) if denom > 0 else 0.0
            norm_gain = max(0.0, min(1.0, norm_gain))

            pre_total += pre_score
            post_total += post_score
            gains.append(diff)

            comparisons.append({
                'student_id': sid,
                'pre_score': round(pre_score, 1),
                'post_score': round(post_score, 1),
                'delta': round(diff, 1),
                'normalized_gain': round(norm_gain * 100, 1)
            })

        count = len(common_students)
        avg_pre = round(pre_total / count, 1) if count > 0 else 0.0
        avg_post = round(post_total / count, 1) if count > 0 else 0.0
        avg_gain = round((avg_post - avg_pre), 1) if count > 0 else 0.0

        return {
            'comparisons': comparisons,
            'avg_pre': avg_pre,
            'avg_post': avg_post,
            'avg_gain': avg_gain,
            'student_count': count
        }


# Singleton instance
ml_engine = AcademicMLEngine()
