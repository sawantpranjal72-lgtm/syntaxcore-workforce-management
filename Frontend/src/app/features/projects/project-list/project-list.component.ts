import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule,
    MatButtonModule, MatProgressSpinnerModule, MatProgressBarModule, MatChipsModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
      <p class="text-slate-500 text-sm mt-0.5">{{projects().length}} projects</p>
    </div>
    <button mat-flat-button color="primary" routerLink="/projects/new">
      <mat-icon>add</mat-icon> New Project
    </button>
  </div>

  <!-- Filter bar -->
  <div class="sc-filter-bar">
    <div class="sc-filter-search" style="flex:1;max-width:280px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="search" placeholder="Search projects…">
    </div>
    @if (statusOptions) {
      <div class="sc-filter-item">
        <span class="sc-filter-label">Status</span>
        <select class="sc-filter-select" [(ngModel)]="filterStatus">
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="PLANNING">Planning</option>
        </select>
      </div>
    }
  </div>

  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="36"></mat-spinner></div>
  } @else {
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (p of filtered(); track p.id) {
        <a [routerLink]="['/projects', p.id]"
           class="rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-all group"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
          <!-- Header -->
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                 [style.background]="p.avatarColor ?? '#0e4da4'">
              {{p.name[0]}}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                {{p.name}}
              </p>
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" [ngClass]="statusChip(p.status)">
                {{p.status}}
              </span>
            </div>
          </div>
          <!-- Description -->
          @if (p.description) {
            <p class="text-xs text-slate-400 leading-relaxed line-clamp-2">{{p.description}}</p>
          }
          <!-- Progress -->
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{{(p.completionPercentage ?? 0).toFixed(0)}}%</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="p.completionPercentage ?? 0" class="rounded-full h-1.5"></mat-progress-bar>
          </div>
          <!-- Footer -->
          <div class="flex items-center justify-between text-xs text-slate-400 pt-1 border-t"
               style="border-color:var(--border-color,#e2e8f0)">
            <span>{{p.totalTasks ?? 0}} tasks</span>
            <span>{{p.members?.length ?? 0}} members</span>
            @if (p.manager) {
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
                     style="background:linear-gradient(135deg,#0e4da4,#1a2f6b)">
                  {{p.manager.firstName[0]}}
                </div>
                <span>{{p.manager.firstName}}</span>
              </div>
            }
          </div>
        </a>
      }
      @if (!filtered().length) {
        <div class="col-span-full text-center py-16">
          <mat-icon class="text-5xl text-slate-200 mb-3">folder_open</mat-icon>
          <p class="text-slate-400">No projects found</p>
          <button mat-flat-button color="primary" routerLink="/projects/new" class="mt-4">Create project</button>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class ProjectListComponent implements OnInit {
  projects = signal<Project[]>([]);
  loading  = signal(true);
  search       = '';
  filterStatus = '';
  statusOptions = true;

  filtered = () => this.projects().filter(p => {
    const matchSearch = !this.search || p.name.toLowerCase().includes(this.search.toLowerCase());
    const matchStatus = !this.filterStatus || p.status === this.filterStatus;
    return matchSearch && matchStatus;
  });

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({
      next: p => { this.projects.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusChip(s: string): string {
    const m: Record<string,string> = {
      PLANNING:'bg-slate-100 text-slate-600', ACTIVE:'bg-green-100 text-green-700',
      ON_HOLD:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-blue-100 text-blue-700',
      CANCELLED:'bg-red-100 text-red-700', ARCHIVED:'bg-slate-100 text-slate-500'
    };
    return m[s] ?? 'bg-slate-100 text-slate-600';
  }
}
