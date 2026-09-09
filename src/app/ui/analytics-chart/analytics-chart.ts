import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Enrollment } from '../../models/enrollment.model';

@Component({
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'tms-analytics-chart',
  styleUrl: './analytics-chart.css',
  templateUrl: './analytics-chart.html',
})
export class AnalyticsChartComponent {
  @Input() data: Enrollment[] = [];

  get pending() {
    return this.data.filter((e) => e.status === 'Pending').length;
  }

  get approved() {
    return this.data.filter((e) => e.status === 'Approved').length;
  }

  get rejected() {
    return this.data.filter((e) => e.status === 'Rejected').length;
  }

  pct(value: number) {
    return this.data.length ? Math.round((value / this.data.length) * 100) : 0;
  }
}