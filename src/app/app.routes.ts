import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () =>
      import("./features/student-dashboard/student-dashboard.component").then(
        (m) => m.StudentDashboardComponent,
      ),
  },
  {
    path: "enroll",
    loadComponent: () =>
      import("./features/enrollment-form/enrollment-form.component").then(
        (m) => m.EnrollmentFormComponent,
      ),
  },
  {
    path: "courses",
    loadComponent: () =>
      import("./features/course-list/course-list.component").then(
        (m) => m.CourseListComponent,
      ),
  },
  {
    path: "courses/new",
    loadComponent: () =>
      import("./features/course-form/course-form.component").then(
        (m) => m.CourseFormComponent,
      ),
  },
  {
    path: "courses/edit/:id",
    loadComponent: () =>
      import("./features/course-form/course-form.component").then(
        (m) => m.CourseFormComponent,
      ),
  },
  {
    path: "courses/:id",
    loadComponent: () =>
      import("./features/course-detail/course-detail.component").then(
        (m) => m.CourseDetailComponent,
      ),
  },
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
];
