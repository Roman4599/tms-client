import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { Course, PagedResponse } from '../models/course.model';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'https://localhost:5001/api/courses';

  // Mock data for development
  private mockCourses: Course[] = [
    { id: 1, code: 'CS101', title: 'Introduction to Computer Science', maxCapacity: 30, enrollmentCount: 25 },
    { id: 2, code: 'MATH201', title: 'Calculus I', maxCapacity: 35, enrollmentCount: 32 },
    { id: 3, code: 'PHYS101', title: 'Physics I', maxCapacity: 30, enrollmentCount: 18 },
    { id: 4, code: 'CHEM101', title: 'Chemistry I', maxCapacity: 25, enrollmentCount: 20 },
    { id: 5, code: 'ENG101', title: 'English Composition', maxCapacity: 30, enrollmentCount: 28 },
    { id: 6, code: 'CS202', title: 'Data Structures', maxCapacity: 30, enrollmentCount: 30 },
    { id: 7, code: 'MATH202', title: 'Calculus II', maxCapacity: 30, enrollmentCount: 15 },
    { id: 8, code: 'CS301', title: 'Algorithms', maxCapacity: 25, enrollmentCount: 22 }
  ];

  constructor(private http: HttpClient) { }

  getCourses(page: number = 1, pageSize: number = 10): Observable<PagedResponse<Course>> {
    const mockData: PagedResponse<Course> = {
      items: this.mockCourses,
      totalCount: this.mockCourses.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(this.mockCourses.length / pageSize),
      hasPrevious: page > 1,
      hasNext: page < Math.ceil(this.mockCourses.length / pageSize)
    };
    
    return of(mockData).pipe(delay(500));
  }

  getCourseById(id: number): Observable<Course> {
    const course = this.mockCourses.find(c => c.id === id);
    if (course) {
      return of({...course}).pipe(delay(300));
    } else {
      return throwError(() => ({ status: 404, message: 'Course not found' }));
    }
  }

  createCourse(course: Omit<Course, 'id'>): Observable<Course> {
    const newCourse = {
      ...course,
      id: Math.max(...this.mockCourses.map(c => c.id)) + 1
    };
    this.mockCourses.push(newCourse);
    return of(newCourse).pipe(delay(500));
  }

  updateCourse(id: number, course: Partial<Course>): Observable<Course> {
    const index = this.mockCourses.findIndex(c => c.id === id);
    if (index !== -1) {
      this.mockCourses[index] = { ...this.mockCourses[index], ...course };
      return of(this.mockCourses[index]).pipe(delay(500));
    } else {
      return throwError(() => ({ status: 404, message: 'Course not found' }));
    }
  }

  deleteCourse(id: number): Observable<void> {
    const index = this.mockCourses.findIndex(c => c.id === id);
    if (index !== -1) {
      this.mockCourses.splice(index, 1);
      return of(void 0).pipe(delay(500));
    } else {
      return throwError(() => ({ status: 404, message: 'Course not found' }));
    }
  }
}
