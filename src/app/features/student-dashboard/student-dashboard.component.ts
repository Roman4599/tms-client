import { Component, signal, computed, inject } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { CourseCardComponent } from "../../ui/course-card/course-card.component";
import { CourseService } from "../../services/course.service";
import { Course } from "../../models/course.model";

@Component({
  selector: "app-student-dashboard",
  standalone: true,
  imports: [CourseCardComponent],
  templateUrl: "./student-dashboard.component.html",
  styleUrl: "./student-dashboard.component.scss",
})
export class StudentDashboardComponent {
  private api = inject(CourseService);

  // Create reactive signals
  studentName = signal("Liya Kebede");
  earnedCredits = signal(45);

  // Computed signal - automatically updates when earnedCredits changes
  graduationStatus = computed(() => {
    return this.earnedCredits() >= 120 ? "Eligible for Graduation" : "In Progress";
  });

  // Method to update credits
  registerForClass() {
    this.earnedCredits.update((c) => c + 3);
  }

  // --- Course catalog (Exercise 6: live API via rxResource) ---
  selectedCourse = signal<Course | null>(null);

  // rxResource wraps the HTTP call into managed signals:
  // - coursesResource.isLoading() → true while waiting for the server response
  // - coursesResource.error() → the error object if the request fails
  // - coursesResource.value() → the Course[] array when the request succeeds
  coursesResource = rxResource({
    stream: () => this.api.getAll(),
  });

  handleEnroll(course: Course) {
    this.selectedCourse.set(course);
    console.log("Enrollment requested for:", course.title);
  }
}