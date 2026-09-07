import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../services/course.service';
import { Course } from '../../models/course.model';

@Component({
  selector: 'app-course-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './course-form.component.html',
  styleUrl: './course-form.component.scss'
})
export class CourseFormComponent implements OnInit {
  courseForm!: FormGroup;
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);
  isEditMode = signal(false);
  courseId = signal<number | null>(null);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode.set(true);
        this.courseId.set(+id);
        this.loadCourse(+id);
      }
    });
  }

  initForm(): void {
    this.courseForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(10)]],
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      maxCapacity: ['', [Validators.required, Validators.min(1), Validators.max(100)]],
      enrollmentCount: ['', [Validators.required, Validators.min(0)]]
    });
  }

  loadCourse(id: number): void {
    this.isLoading.set(true);
    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.courseForm.patchValue({
          code: course.code,
          title: course.title,
          maxCapacity: course.maxCapacity,
          enrollmentCount: course.enrollmentCount
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.submitError.set('Failed to load course data.');
        this.isLoading.set(false);
        console.error('Error loading course:', err);
      }
    });
  }

  get code() { return this.courseForm.get('code')!; }
  get title() { return this.courseForm.get('title')!; }
  get maxCapacity() { return this.courseForm.get('maxCapacity')!; }
  get enrollmentCount() { return this.courseForm.get('enrollmentCount')!; }

  onSubmit(): void {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    const courseData = this.courseForm.value;

    if (this.isEditMode() && this.courseId()) {
      // Update existing course
      this.courseService.updateCourse(this.courseId()!, courseData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitSuccess.set(true);
          setTimeout(() => this.router.navigate(['/courses']), 2000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set('Failed to update course. Please try again.');
          console.error('Error updating course:', err);
        }
      });
    } else {
      // Create new course
      this.courseService.createCourse(courseData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitSuccess.set(true);
          setTimeout(() => this.router.navigate(['/courses']), 2000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.submitError.set('Failed to create course. Please try again.');
          console.error('Error creating course:', err);
        }
      });
    }
  }

  resetForm(): void {
    this.courseForm.reset();
    this.submitError.set(null);
    this.submitSuccess.set(false);
    if (this.isEditMode() && this.courseId()) {
      this.loadCourse(this.courseId()!);
    }
  }
}
