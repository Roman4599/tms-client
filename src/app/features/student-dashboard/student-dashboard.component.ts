import { Component, signal, computed } from "@angular/core";

@Component({
  selector: "app-student-dashboard",
  standalone: true,
  templateUrl: "./student-dashboard.component.html",
  styleUrl: "./student-dashboard.component.scss",
})
export class StudentDashboardComponent {
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
}
