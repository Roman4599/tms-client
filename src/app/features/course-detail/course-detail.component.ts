import { Component, signal, computed, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { CourseStore } from '../../store/course.store';
import { Course } from '../../models/course.model';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-detail.component.html',
  styleUrl: './course-detail.component.scss'
})
export class CourseDetailComponent implements OnInit {
  @Input() id!: string;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private courseService = inject(CourseService);
  private store = inject(CourseStore);

  course = signal<Course | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  notFound = signal(false);
  isDeleting = signal(false);

  // Optimistic delete rolls back into this when the server rejects (409).
  deleteError = this.store.deleteError;

  isFull = computed(() => {
    const c = this.course();
    return c ? c.enrollmentCount >= c.maxCapacity : false;
  });

  availableSpots = computed(() => {
    const c = this.course();
    return c ? c.maxCapacity - c.enrollmentCount : 0;
  });

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadCourse(+id);
      }
    });
  }

  loadCourse(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.notFound.set(false);

    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          this.error.set('Failed to load course details. Please try again.');
        }
        this.loading.set(false);
        console.error('Error loading course:', err);
      }
    });
  }

  deleteCourse(): void {
    const course = this.course();
    if (!course) return;

    if (confirm(`Are you sure you want to delete "${course.code} - ${course.title}"?`)) {
      this.isDeleting.set(true);
      this.store.deleteCourse(course.id).subscribe({
        next: (ok) => {
          this.isDeleting.set(false);
          this.store.clearDeleteError();
          if (ok) {
            this.router.navigate(['/courses']);
          }
        },
      });
    }
  }
}
