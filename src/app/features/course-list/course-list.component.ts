import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { Course } from '../../models/course.model';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss'
})
export class CourseListComponent implements OnInit {
  courses = signal<Course[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  totalCourses = computed(() => this.courses().length);

  constructor(private courseService: CourseService) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.courseService.getCourses(1, 10).subscribe({
      next: (response) => {
        this.courses.set(response.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load courses. Please try again.');
        this.loading.set(false);
        console.error('Error loading courses:', err);
      }
    });
  }
}
