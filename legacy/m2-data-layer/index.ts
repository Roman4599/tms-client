import { Temporal } from "@js-temporal/polyfill";
import { Student, isStudent } from "./models/student.model.js";
import { CourseStatus, describeCourse } from "./models/course.model.js";
import { EnrollmentStatus, describeEnrollment } from "./models/enrollment.model.js";
import { AssessmentItem, calculateGrade } from "./models/assessment.model.js";
import { ApiResponse, renderResponse } from "./models/api-response.model.js";
import { Course } from "./models/course.model.js";
// ===== STUDENT =====
const student: Student = {
  id: "STU-001",
  name: "Abeba Tadesse",
  enrollmentDate: Temporal.Now.instant(),
  gpa: 3.8,
};
console.log(`Student: ${student.name}, GPA: ${student.gpa}`);

// ===== TYPE GUARD =====
const raw: unknown = JSON.parse('{"id":"STU-002","name":"Dawit"}');
if (isStudent(raw)) {
  console.log(`Parsed student: ${raw.name}`);
}

// ===== ASSESSMENT =====
const quiz: AssessmentItem = {
  id: "QUIZ-001",
  kind: "quiz",
  title: "C# Basics",
  correctAnswers: 8,
  totalQuestions: 10,
};
const lab: AssessmentItem = {
  id: "LAB-001",
  kind: "lab",
  title: "REST API Project",
  functionalityScore: 85,
  codeQualityScore: 90,
};
console.log(`Quiz grade: ${calculateGrade(quiz)}%`);
console.log(`Lab grade: ${calculateGrade(lab)}%`);

// ===== ENROLLMENT STATUS =====
const pending: EnrollmentStatus = {
  status: "PENDING",
  requestedAt: Temporal.Now.instant(),
  studentId: "STU-001",
  courseId: "CRS-101",
};
console.log(describeEnrollment(pending));

// ===== COURSE STATUS =====
const activeCourse: CourseStatus = {
  status: "ACTIVE",
  enrolledCount: 28,
  startDate: Temporal.PlainDate.from("2026-09-01"),
};
console.log(describeCourse(activeCourse));

// ===== API RESPONSE =====
const studentRes: ApiResponse<Student> = {
  status: "success",
  data: student,
  fetchedAt: Temporal.Now.instant(),
};
console.log(renderResponse(studentRes, (s) => `${s.name} GPA: ${s.gpa ?? "N/A"}`));

const courseListRes: ApiResponse<Course[]> = {
  status: "success",
  data: [{ id: "CRS-101", title: "Web Development", capacity: 30 }],
  fetchedAt: Temporal.Now.instant(),
};
console.log(renderResponse(courseListRes, (courses) => courses.map((c) => c.title).join(", ")));

// ===== TEMPORAL =====
const approvedAt = Temporal.Now.instant();
console.log(`Approved at (UTC): ${approvedAt}`);
const addisTime = approvedAt.toZonedDateTimeISO("Africa/Addis_Ababa");
const londonTime = approvedAt.toZonedDateTimeISO("Europe/London");
console.log(`Addis: ${addisTime.toPlainTime()}`);
console.log(`London: ${londonTime.toPlainTime()}`);
const courseStart = Temporal.PlainDate.from("2026-09-01");
const today = Temporal.Now.plainDateISO();
const daysUntilStart = today.until(courseStart).total({ unit: "days" });
console.log(`${Math.floor(daysUntilStart)} days until course starts`);