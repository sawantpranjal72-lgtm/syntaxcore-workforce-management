import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { UserSummary, Department, Role, PagedResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatSelectModule, MatMenuModule, MatChipsModule, MatProgressSpinnerModule, MatPaginatorModule, MatTooltipModule
  ],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">

  <!-- Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
      <p class="text-slate-500 text-sm mt-0.5">{{totalElements()}} team members</p>
    </div>
    <button mat-flat-button color="primary" routerLink="/employees/new">
      <mat-icon>person_add</mat-icon> Add Employee
    </button>
  </div>

  <!-- Filters bar -->
  <div class="sc-filter-bar">
    <div class="sc-filter-search" style="flex:1;max-width:260px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="search" (ngModelChange)="onSearch($event)" placeholder="Search by name or email…">
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Role</span>
      <select class="sc-filter-select" [(ngModel)]="selectedRole" (change)="load()">
        <option value="">All Roles</option>
        @for (r of roles; track r.value) { <option [value]="r.value">{{r.label}}</option> }
      </select>
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Department</span>
      <select class="sc-filter-select" [(ngModel)]="selectedDept" (change)="load()">
        <option value="">All Departments</option>
        @for (d of departments(); track d.id) { <option [value]="d.id">{{d.name}}</option> }
      </select>
    </div>
    <div style="display:flex;gap:4px;margin-left:auto">
      <button class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm"
              [style.background]="viewMode()==='grid'?'var(--brand-50)':''"
              [style.color]="viewMode()==='grid'?'var(--brand-600)':''"
              (click)="viewMode.set('grid')" title="Grid view">
        <mat-icon style="font-size:18px">grid_view</mat-icon>
      </button>
      <button class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm"
              [style.background]="viewMode()==='list'?'var(--brand-50)':''"
              [style.color]="viewMode()==='list'?'var(--brand-600)':''"
              (click)="viewMode.set('list')" title="List view">
        <mat-icon style="font-size:18px">view_list</mat-icon>
      </button>
    </div>
  </div>

  @if (loading()) {
    <div class="flex justify-center py-16"><mat-spinner diameter="36"></mat-spinner></div>
  } @else {

    <!-- Grid view -->
    @if (viewMode() === 'grid') {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-5">
        @for (emp of employees(); track emp.id) {
          <div class="rounded-2xl border p-5 flex flex-col items-center gap-3 text-center hover:shadow-md transition-shadow cursor-pointer group"
               style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)"
               [routerLink]="['/employees', emp.id]">

            <!-- Avatar -->
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold"
                 style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
              {{emp.firstName[0]}}{{emp.lastName[0]}}
            </div>

            <div class="w-full">
              <p class="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                {{emp.fullName}}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">{{emp.jobTitle ?? 'No title'}}</p>
            </div>

            <span class="px-3 py-1 rounded-full text-xs font-medium" [ngClass]="roleChip(emp.role)">
              {{emp.role.replace('_',' ')}}
            </span>

            @if (emp.departmentName) {
              <div class="flex items-center gap-1.5 text-xs text-slate-400">
                <mat-icon class="text-xs">business</mat-icon>
                {{emp.departmentName}}
              </div>
            }

            <div class="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button mat-stroked-button class="text-xs px-3 py-1" [routerLink]="['/employees',emp.id]"
                      (click)="$event.stopPropagation()">View</button>
              <button mat-stroked-button class="text-xs px-3 py-1" [routerLink]="['/employees',emp.id,'edit']"
                      (click)="$event.stopPropagation()">Edit</button>
            </div>

            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full" [class]="emp.active ? 'bg-green-400' : 'bg-slate-300'"></div>
              <span class="text-xs text-slate-400">{{emp.active ? 'Active' : 'Inactive'}}</span>
            </div>
          </div>
        }

        @if (!employees().length) {
          <div class="col-span-full text-center py-16">
            <mat-icon class="text-5xl text-slate-200 mb-3">people_outline</mat-icon>
            <p class="text-slate-400">No employees found</p>
          </div>
        }
      </div>

    <!-- List view -->
    } @else {
      <div class="rounded-2xl border overflow-hidden mb-5"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        @for (emp of employees(); track emp.id) {
          <div class="flex items-center gap-4 px-5 py-4 border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
               style="border-color:var(--border-color,#e2e8f0)"
               [routerLink]="['/employees', emp.id]">

            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium flex-shrink-0"
                 style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
              {{emp.firstName[0]}}{{emp.lastName[0]}}
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-medium text-slate-900 dark:text-white truncate">{{emp.fullName}}</p>
              <p class="text-xs text-slate-400">{{emp.email}}</p>
            </div>

            <div class="hidden sm:block text-xs text-slate-500">{{emp.jobTitle ?? '—'}}</div>
            <div class="hidden md:block">
              <span class="px-2.5 py-1 rounded-full text-xs font-medium" [ngClass]="roleChip(emp.role)">
                {{emp.role.replace('_',' ')}}
              </span>
            </div>
            <div class="hidden lg:block text-xs text-slate-400">{{emp.departmentName ?? '—'}}</div>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full" [class]="emp.active ? 'bg-green-400' : 'bg-slate-300'"></div>
            </div>

            <button mat-icon-button [matMenuTriggerFor]="empMenu" (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #empMenu>
              <a mat-menu-item [routerLink]="['/employees',emp.id]"><mat-icon>visibility</mat-icon>View Profile</a>
              <a mat-menu-item [routerLink]="['/employees',emp.id,'edit']"><mat-icon>edit</mat-icon>Edit</a>
              <button mat-menu-item (click)="toggleStatus(emp)">
                <mat-icon>{{emp.active ? 'block' : 'check_circle'}}</mat-icon>
                {{emp.active ? 'Deactivate' : 'Activate'}}
              </button>
            </mat-menu>
          </div>
        }

        @if (!employees().length) {
          <div class="text-center py-16">
            <mat-icon class="text-5xl text-slate-200 mb-3">people_outline</mat-icon>
            <p class="text-slate-400">No employees found</p>
          </div>
        }
      </div>
    }

    <mat-paginator
      [length]="totalElements()"
      [pageSize]="pageSize"
      [pageSizeOptions]="[12, 24, 48]"
      (page)="onPage($event)"
      class="rounded-2xl border"
      style="border-color:var(--border-color,#e2e8f0)">
    </mat-paginator>
  }
</div>
  `,
  styles: [`:host{display:block} mat-form-field{margin-bottom:0}`]
})
export class EmployeeListComponent implements OnInit {
  employees    = signal<UserSummary[]>([]);
  departments  = signal<Department[]>([]);
  loading      = signal(false);
  totalElements= signal(0);
  viewMode     = signal<'grid'|'list'>('grid');
  search       = '';
  selectedRole = '';
  selectedDept = '';
  pageSize     = 12;
  currentPage  = 0;
  private search$ = new Subject<string>();

  roles = [
    { value: 'ADMINISTRATOR',   label: 'Administrator' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'HR_MANAGER',      label: 'HR Manager' },
    { value: 'EMPLOYEE',        label: 'Employee' },
    { value: 'INTERN',          label: 'Intern' },
    { value: 'STUDENT',         label: 'Student' },
  ];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.load();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    let url = `${environment.apiUrl}/users?page=${this.currentPage}&size=${this.pageSize}`;
    if (this.search)       url += `&search=${encodeURIComponent(this.search)}`;
    if (this.selectedRole) url += `&role=${this.selectedRole}`;
    if (this.selectedDept) url += `&departmentId=${this.selectedDept}`;

    this.http.get<PagedResponse<UserSummary>>(url).subscribe({
      next: r => {
        const visible = (r.content ?? []).filter(emp => emp.role !== 'SUPER_ADMIN');
        this.employees.set(visible);
        this.totalElements.set(r.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadDepartments(): void {
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: d => this.departments.set(d), error: () => {}
    });
  }

  onSearch(v: string): void { this.search$.next(v); }
  onPage(e: PageEvent): void { this.currentPage = e.pageIndex; this.pageSize = e.pageSize; this.load(); }

  toggleStatus(emp: UserSummary): void {
    this.http.patch(`${environment.apiUrl}/users/${emp.id}/toggle-status`, {}).subscribe({
      next: () => {
        emp.active = !emp.active;
        this.snackBar.open(`${emp.fullName} ${emp.active ? 'activated' : 'deactivated'}`, '', { duration: 2500 });
      }
    });
  }

  roleChip(role: Role): string {
    const m: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-100 text-red-700',
      ADMINISTRATOR: 'bg-violet-100 text-violet-700',
      PROJECT_MANAGER: 'bg-blue-100 text-blue-700',
      HR_MANAGER: 'bg-green-100 text-green-700',
      EMPLOYEE: 'bg-slate-100 text-slate-600',
      INTERN: 'bg-yellow-100 text-yellow-700',
      STUDENT: 'bg-orange-100 text-orange-700',
    };
    return m[role] ?? 'bg-slate-100 text-slate-600';
  }
}
