import { Component, viewChild, effect, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { EnrollmentStore } from '../../store/enrollment.store';
import { Enrollment } from '../../models/enrollment.model';

@Component({
  selector: 'tms-enrollment-list',
  standalone: true,
  imports: [MatTableModule, MatPaginatorModule, MatSortModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enrollment-list.component.html',
  styleUrl: './enrollment-list.component.scss',
})
export class EnrollmentListComponent implements OnInit {
  store = inject(EnrollmentStore);

  displayedColumns = ['studentName', 'courseName', 'status', 'actions'];

  // Bridges the store's array into Material's rendering pipeline.
  dataSource = new MatTableDataSource<Enrollment>();

  // Signal-based replacements for @ViewChild - update reactively.
  readonly paginator = viewChild.required(MatPaginator);
  readonly sort = viewChild.required(MatSort);

  constructor() {
    // Push store entities into the table whenever they change.
    effect(() => {
      this.dataSource.data = this.store.entities();
    });

    // Wire paginator + sort once Angular resolves the view queries.
    effect(() => {
      this.dataSource.paginator = this.paginator();
      this.dataSource.sort = this.sort();
    });
  }

  ngOnInit() {
    this.store.loadEnrollments();
  }
}