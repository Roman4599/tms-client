import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { EnrollmentStore } from '../../store/enrollment.store';
import { AnalyticsChartComponent } from '../../ui/analytics-chart/analytics-chart';

@Component({
  imports: [AnalyticsChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'tms-instructor-dashboard',
  styleUrl: './instructor-dashboard.css',
  templateUrl: './instructor-dashboard.html',
})
export class InstructorDashboardComponent implements OnInit {
  store = inject(EnrollmentStore);

  ngOnInit() {
    this.store.loadEnrollments();
  }
}