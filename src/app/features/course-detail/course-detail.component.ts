import { Component, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../services/course.service';
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

  course = signal<Course | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  notFound = signal(false);
  isDeleting = signal(false);

  isFull = computed(() => {
    const c = this.course();
    return c ? c.enrollmentCount >= c.maxCapacity : false;
  });

  availableSpots = computed(() => {
    const c = this.course();
    return c ? c.maxCapacity - c.enrollmentCount : 0;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

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
    if (!this.course()) return;
    
    if (confirm(`Are you sure you want to delete "${this.course()?.code} - ${this.course()?.title}"?`)) {
      this.isDeleting.set(true);
      this.courseService.deleteCourse(this.course()!.id).subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.router.navigate(['/courses']);
        },
        error: (err) => {
          this.isDeleting.set(false);
          this.error.set('Failed to delete course. Please try again.');
          console.error('Error deleting course:', err);
        }
      });
    }
  }
}
