import unittest
import json
from app import app
from models import db_session, User, Quiz, QuizQuestion, QuizAttempt, StudentProfile, Material
from seed_data import seed_database
from ml_engine import ml_engine

class SmartSchoolBackendTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        seed_database()

    def setUp(self):
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def tearDown(self):
        db_session.remove()

    def test_01_api_demo_login(self):
        """Test API demo login returns user and sets session."""
        res = self.client.get('/api/auth/demo-login/student')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['username'], 'student_alex')

    def test_02_api_student_dashboard(self):
        """Test student dashboard API endpoint."""
        self.client.get('/api/auth/demo-login/student')
        res = self.client.get('/api/student/dashboard')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('student', data)
        self.assertIn('recommendations', data)
        self.assertIn('topic_stats', data)
        self.assertIn('quizzes', data)

    def test_03_api_quiz_submission(self):
        """Test submitting quiz answers via REST API."""
        self.client.get('/api/auth/demo-login/student')
        quiz = db_session.query(Quiz).first()
        questions = db_session.query(QuizQuestion).filter_by(quiz_id=quiz.id).all()

        answers = {str(q.id): q.correct_option for q in questions}
        payload = {
            'answers': answers,
            'time_spent_seconds': 110
        }
        res = self.client.post(f'/api/quizzes/{quiz.id}/submit', json=payload)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['score'], len(questions))
        self.assertEqual(data['percentage'], 100.0)

    def test_04_api_teacher_dashboard(self):
        """Test teacher dashboard API."""
        self.client.get('/api/auth/demo-login/teacher')
        res = self.client.get('/api/teacher/dashboard')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('students', data)
        self.assertIn('weak_topics', data)
        self.assertIn('risk_counts', data)

    def test_05_api_admin_dashboard(self):
        """Test admin dashboard API."""
        self.client.get('/api/auth/demo-login/admin')
        res = self.client.get('/api/admin/dashboard')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('stats', data)
        self.assertIn('users', data)
        self.assertIn('classes', data)

    def test_06_api_analytics(self):
        """Test analytics overview and Chart.js endpoints."""
        self.client.get('/api/auth/demo-login/teacher')
        res = self.client.get('/api/analytics/overview')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertIn('math_comparison', data)
        self.assertIn('sci_comparison', data)

        res_chart = self.client.get('/api/analytics/assessment-comparison')
        self.assertEqual(res_chart.status_code, 200)
        chart_data = json.loads(res_chart.data)
        self.assertIn('pre_scores', chart_data)
        self.assertIn('post_scores', chart_data)

    def test_07_ml_prediction(self):
        score, risk = ml_engine.predict_performance(90.0, 14.0, 85.0, 80.0, 5)
        self.assertTrue(0 <= score <= 100)
        self.assertIn(risk, ['High Risk', 'Moderate Risk', 'Good Standing', 'Excellent'])

if __name__ == '__main__':
    unittest.main()
