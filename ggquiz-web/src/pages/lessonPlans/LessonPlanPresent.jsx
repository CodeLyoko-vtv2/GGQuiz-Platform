import { Navigate, useParams } from "react-router-dom";

function LessonPlanPresent() {
  const { id } = useParams();
  return <Navigate to={`/lesson-plans/${id}`} replace />;
}

export default LessonPlanPresent;
