import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { exhaustMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GradeService, GradePayload } from '../../services/grade.service';

@Component({
  selector: 'tms-grade-submission',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './grade-submission.component.html',
  styleUrl: './grade-submission.component.scss',
})
export class GradeSubmissionComponent {
  private api = inject(GradeService);
  private fb = inject(FormBuilder);

  gradeForm = this.fb.group({
    studentId: [101, [Validators.required, Validators.min(1)]],
    courseId: [302, [Validators.required, Validators.min(1)]],
    score: [88, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  isSubmitting = false;
  submissionStatus = '';
  submitted = false;
  failed = false;

  // A Subject is a manual event stream - template clicks push payloads in.
  private submitClick$ = new Subject<GradePayload>();

  constructor() {
    this.submitClick$
      .pipe(
        // exhaustMap: while the inner HTTP observable is active, ALL new
        // emissions are silently dropped. 50 clicks -> ONE POST request.
        exhaustMap((payload) => {
          this.isSubmitting = true;
          this.submitted = false;
          this.failed = false;
          this.submissionStatus = 'Submitting grade to server...';
          return this.api.postGrade(payload);
        }),
        // Auto-unsubscribes when the component is destroyed (leak-free).
        // Runs inside the constructor to inherit the injection context.
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          this.submitted = true;
          this.failed = false;
          this.submissionStatus = `Grade saved successfully! Record ID: ${result.id}`;
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitted = true;
          this.failed = true;
          this.submissionStatus = `Submission failed: ${err.message || 'Server error'}`;
        },
      });
  }

  onSubmit() {
    if (this.gradeForm.valid) {
      const rawValue = this.gradeForm.getRawValue();
      this.submitClick$.next({
        studentId: Number(rawValue.studentId),
        courseId: Number(rawValue.courseId),
        score: Number(rawValue.score),
      });
    }
  }
}