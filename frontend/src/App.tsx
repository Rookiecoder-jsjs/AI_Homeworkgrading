import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import TeacherDashboard from './pages/teacher/Dashboard';
import AssignmentList from './pages/teacher/AssignmentList';
import AssignmentCreate from './pages/teacher/AssignmentCreate';
import AssignmentDetail from './pages/teacher/AssignmentDetail';
import SubmissionReview from './pages/teacher/SubmissionReview';
import ReviewQueue from './pages/teacher/ReviewQueue';
import GradingStyle from './pages/teacher/GradingStyle';
import ClassAnalytics from './pages/teacher/ClassAnalytics';
import StudentDashboard from './pages/student/Dashboard';
import StudentAssignments from './pages/student/AssignmentList';
import SubmitPage from './pages/student/SubmitPage';
import ResultPage from './pages/student/ResultPage';
import ErrorBook from './pages/student/ErrorBook';
import CorrectPage from './pages/student/CorrectPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Teacher */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/assignments" element={<AssignmentList />} />
        <Route path="/teacher/assignments/new" element={<AssignmentCreate />} />
        <Route path="/teacher/assignments/:id" element={<AssignmentDetail />} />
        <Route path="/teacher/submissions/:id" element={<SubmissionReview />} />
        <Route path="/teacher/review-queue" element={<ReviewQueue />} />
        <Route path="/teacher/grading-style" element={<GradingStyle />} />
        <Route path="/teacher/class-analytics" element={<ClassAnalytics />} />
        {/* Student */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/assignments" element={<StudentAssignments />} />
        <Route path="/student/assignments/:id" element={<SubmitPage />} />
        <Route path="/student/submissions/:id" element={<ResultPage />} />
        <Route path="/student/error-book" element={<ErrorBook />} />
        <Route path="/student/submissions/:id/correct" element={<CorrectPage />} />
      </Routes>
    </BrowserRouter>
  );
}
