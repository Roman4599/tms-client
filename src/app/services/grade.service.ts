import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GradePayload {
  studentId: number;
  courseId: number;
  score: number;
}

export interface GradeResult {
  id: string;
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class GradeService {
  private http = inject(HttpClient);

  postGrade(payload: GradePayload): Observable<GradeResult> {
    return this.http.post<GradeResult>('/api/grades', payload);
  }
}