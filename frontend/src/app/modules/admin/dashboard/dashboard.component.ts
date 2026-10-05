import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardOverview } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  overview: DashboardOverview | null = null;
  loading = true;
  errorMessage: string | null = null;

  constructor(private readonly dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getOverview().subscribe({
      next: (data) => {
        this.overview = data;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message ?? 'Não foi possível carregar o dashboard.';
        this.loading = false;
      },
    });
  }
}
