import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../api/client";
import StudySetEditor from "./StudySetEditor";

function EditSet() {
  const { id } = useParams();
  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStudySet = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/studysets/${id}`);
        if (cancelled) return;
        setStudySet(data.studySet);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err));
          setStudySet(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStudySet();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">
          Đang tải học phần để chỉnh sửa...
        </p>
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">
          Không tải được học phần. Vui lòng thử lại.
        </p>
      </div>
    );
  }

  return <StudySetEditor mode="edit" studySetId={id} initialSet={studySet} />;
}

export default EditSet;
