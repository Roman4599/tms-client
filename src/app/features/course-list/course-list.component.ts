import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseStore } from '../../store/course.store';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.scss'
})
export class CourseListComponent implements OnInit {
  private store = inject(CourseStore);

  courses = computed(() => this.store.entities());
  loading = this.store.loading;
  error = this.store.loadError;
  totalCourses = computed(() => this.store.entities().length);

  ngOnInit(): void {
    if (!this.store.loaded()) {
      this.store.loadCourses();
    }
  }
}