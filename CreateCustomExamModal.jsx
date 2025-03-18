// src/pages/CreateCustomExamModal.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateCustomExamModal.css";

export default function CreateCustomExamModal({
  onClose,
  onStartGenerating,    // 新增：开始生成时的回调
  onFinishGenerating    // 新增：结束生成时的回调
}) {
  const navigate = useNavigate();

  // ============ Exam Meta Info ============
  const [examTitle, setExamTitle] = useState("");
  const [topic, setTopic] = useState("ComputerScience");
  const [difficulty, setDifficulty] = useState("Basic");
  const [examTime, setExamTime] = useState(60);
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState("multiple");
  const [scoringStandard, setScoringStandard] = useState("");
  const [references, setReferences] = useState("");
  const [studentLevel, setStudentLevel] = useState("Undergraduate");

  
  async function handleGenerateExam() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in first.");
        return;
      }

      // 通知父组件：开始生成 => 显示动画
      onStartGenerating && onStartGenerating();

      // 组装请求体
      const requestBody = {
        title: examTitle,
        topic,
        difficulty,
        examTime,
        questionCount,
        questionType,
        scoringStandard,
        references,
        studentLevel,
      };

      // 发起后端请求
      const res = await fetch("http://localhost:3000/api/exams/generate-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      // 如果后端报 500 等错误，这里 res.ok 会是 false
      if (!res.ok) {
        // 先尝试解析文本，打印到控制台帮助排查
        const errText = await res.text();
        console.error("Backend error:", errText);
        throw new Error(errText || "Failed to generate custom exam.");
      }

      // 若成功，解析出 data
      const data = await res.json();
      console.log("Generated exam data:", data);

      // 这里才跳转到新页面：/custom-exam/xxx
      // 注意：要在前端路由里配置 <Route path="/custom-exam/:examId" ... >
      navigate(`/custom-exam/${data._id}`);

      // 如果想先关闭弹窗再跳转，也可以先:
      // onClose();
      // navigate(`/custom-exam/${data._id}`);
    } catch (err) {
      // 把错误提示给用户，也在控制台打印
      console.error("Error in handleGenerateExam:", err);
      alert("Error: " + err.message);
    } finally {
      // 不管成功还是失败，都要通知父组件结束 => 隐藏动画
      onFinishGenerating && onFinishGenerating();
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create a Custom AI-Generated Exam</h2>

        {/* Exam Title */}
        <label>Exam Title</label>
        <input
          type="text"
          placeholder="e.g. 'Modern History Quiz'"
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
        />

        {/* Exam Topic (Dropdown) */}
        <label>Exam Topic / Subject</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="ComputerScience">Computer Science / Coding</option>
          <option value="Mathematics">Mathematics</option>
          <option value="Physics">Physics</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Biology">Biology</option>
          <option value="Medicine">Medicine</option>
          <option value="Engineering">Engineering</option>
          <option value="Business">Business / Finance</option>
          <option value="Economics">Economics</option>
          <option value="History">History</option>
          <option value="Literature">Literature</option>
          <option value="Philosophy">Philosophy</option>
          <option value="Psychology">Psychology</option>
          <option value="Sociology">Sociology</option>
          <option value="Architecture">Architecture</option>
          <option value="Art">Art</option>
          <option value="Law">Law</option>
          <option value="Other">Other / Not listed</option>
        </select>

        {/* Difficulty Level */}
        <label>Difficulty Level</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="Basic">Basic</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        {/* Exam Duration */}
        <label>Exam Duration (minutes)</label>
        <input
          type="number"
          min="1"
          value={examTime}
          onChange={(e) => setExamTime(parseInt(e.target.value, 10))}
        />

        {/* Number of Questions */}
        <label>Number of Questions</label>
        <input
          type="number"
          min="1"
          value={questionCount}
          onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
        />

        {/* Preferred Question Type */}
        <label>Preferred Question Type</label>
        <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
          <option value="multiple">Multiple Choice</option>
          <option value="shortAnswer">Short Answer</option>
          <option value="essay">Essay</option>
          <option value="caseStudy">Case Study</option>
          <option value="match">Matching</option>
          <option value="fill">Fill in the Blank</option>
        </select>

        {/* Scoring Standard */}
        <label>Scoring Standard (Optional)</label>
        <textarea
          rows={2}
          placeholder="Any special scoring instructions..."
          value={scoringStandard}
          onChange={(e) => setScoringStandard(e.target.value)}
        />

        {/* References */}
        <label>References / Materials (Optional)</label>
        <textarea
          rows={2}
          placeholder="If there's any specific textbook or reference"
          value={references}
          onChange={(e) => setReferences(e.target.value)}
        />

        {/* Student Level */}
        <label>Student Level / Background</label>
        <input
          type="text"
          placeholder="e.g. 'Undergraduate', 'Beginner', 'Professional'"
          value={studentLevel}
          onChange={(e) => setStudentLevel(e.target.value)}
        />

        <hr />
        <div style={{ textAlign: "right" }}>
          <button onClick={handleGenerateExam}>Generate Exam</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
