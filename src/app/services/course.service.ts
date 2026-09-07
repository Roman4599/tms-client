import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Course, CourseDetail, PagedResponse } from "../models/course.model";

@Injectable({ providedIn: "root" })
export class CourseService {
  private http = inject(HttpClient);
  private baseUrl = "https://localhost:5001/api/courses";

  getAll(): Observable<Course[]> {
    // GET /api/courses → items[] carries the rows (M6 catalogue envelope).
    // Switch to map((p) => p.data) if your base URL is /api/v2/courses.
    return this.http
      .get<PagedResponse<Course>>(this.baseUrl, {
        params: { page: "1", pageSize: "50" },
      })
      .pipe(map((p) => p.items));
  }

  getCourses(page = 1, pageSize = 10): Observable<PagedResponse<Course>> {
    return this.http.get<PagedResponse<Course>>(this.baseUrl, {
      params: { page: String(page), pageSize: String(pageSize) },
    });
  }

  getCourseById(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${this.baseUrl}/${id}`);
  }

  createCourse(course: Omit<Course, "id">): Observable<Course> {
    return this.http.post<Course>(this.baseUrl, course);
  }

  updateCourse(id: number, course: Partial<Course>): Observable<Course> {
    return this.http.put<Course>(`${this.baseUrl}/${id}`, course);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}