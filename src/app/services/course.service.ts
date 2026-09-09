import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Course, CourseDetail, PagedResponse } from "../models/course.model";

@Injectable({ providedIn: "root" })
export class CourseService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/courses`;

  getAll(): Observable<Course[]> {
    // GET {apiUrl}/courses → items[] carries the rows (catalogue envelope).
    return this.http
      .get<PagedResponse<Course>>(this.base, {
        params: { page: "1", pageSize: "50" },
      })
      .pipe(map((p) => p.items));
  }

  getCourses(page = 1, pageSize = 10): Observable<PagedResponse<Course>> {
    return this.http.get<PagedResponse<Course>>(this.base, {
      params: { page: String(page), pageSize: String(pageSize) },
    });
  }

  getCourseById(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${this.base}/${id}`);
  }

  createCourse(course: Omit<Course, "id">): Observable<Course> {
    return this.http.post<Course>(this.base, course);
  }

  updateCourse(id: number, course: Partial<Course>): Observable<Course> {
    return this.http.put<Course>(`${this.base}/${id}`, course);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}