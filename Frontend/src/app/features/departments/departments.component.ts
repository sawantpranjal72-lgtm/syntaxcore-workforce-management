import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

// Use model from models.ts


@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-6xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Departments</h1>
      <p class="text-slate-500 text-sm mt-0.5">Manage organizational departments</p>
    </div>
    <button (click)="showForm.set(true)"
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
            style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
      <mat-icon class="text-base">add</mat-icon> Add Department
    </button>
  </div>

  <!-- Add form -->
  @if (showForm()) {
    <div class="rounded-2xl border p-5 mb-5" style="background:#f0fdf4;border-color:#86efac">
      <h3 class="font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <mat-icon class="text-green-500">add_business</mat-icon> New Department
      </h3>
      <div class="grid sm:grid-cols-3 gap-3 mb-3">
        <input [(ngModel)]="newDept.name" placeholder="Department Name *"
               class="px-4 py-3 rounded-xl border text-sm outline-none"
               style="border-color:#86efac;background:#fff">
        <input [(ngModel)]="newDept.code" placeholder="Code (e.g. ENG)"
               class="px-4 py-3 rounded-xl border text-sm outline-none font-mono"
               style="border-color:#86efac;background:#fff">
        <input [(ngModel)]="newDept.description" placeholder="Description"
               class="px-4 py-3 rounded-xl border text-sm outline-none"
               style="border-color:#86efac;background:#fff">
      </div>
      <div class="flex gap-2">
        <button (click)="createDept()" [disabled]="!newDept.name.trim() || saving()"
                class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                style="background:#22c55e">
          @if (saving()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon class="text-base">add</mat-icon> }
          Create
        </button>
        <button (click)="showForm.set(false); newDept = {name:'',code:'',description:''}"
                class="px-5 py-2.5 rounded-xl text-sm font-medium border"
                style="border-color:#86efac;color:#16a34a">Cancel</button>
      </div>
    </div>
  }

  <!-- Search -->
  <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-5 max-w-sm"
       style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
    <mat-icon class="text-slate-400 text-base">search</mat-icon>
    <input [(ngModel)]="search" placeholder="Search departments..."
           class="flex-1 text-sm bg-transparent outline-none" style="color:var(--text-primary)">
  </div>

  @if (loading()) {
    <div class="flex justify-center py-16"><mat-spinner diameter="40"></mat-spinner></div>
  } @else {
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (d of filtered(); track d.id) {
        <div class="rounded-2xl border p-5 hover:shadow-md transition-shadow"
             style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                   [style.background]="avatarBg(d.name)">
                {{d.code ?? d.name[0]}}
              </div>
              <div>
                <p class="font-semibold text-slate-900 dark:text-white">{{d.name}}</p>
                <p class="text-xs text-slate-400">{{d.code ?? '—'}}</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [ngClass]="d.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
              {{d.active ? 'Active' : 'Inactive'}}
            </span>
          </div>
          @if (d.description) {
            <p class="text-xs text-slate-400 mb-3 line-clamp-2">{{d.description}}</p>
          }
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-xs text-slate-500">
              <mat-icon class="text-sm">people</mat-icon>
              {{d.employeeCount ?? 0}} employees
            </div>
            @if (d.managerName) {
              <div class="flex items-center gap-1.5 text-xs text-slate-500">
                <mat-icon class="text-sm">manage_accounts</mat-icon>
                {{d.managerName.split(' ')[0]}}
              </div>
            }
          </div>
        </div>
      }
      @if (!filtered().length) {
        <div class="col-span-3 text-center py-16 text-slate-400 text-sm">
          <mat-icon class="text-4xl text-slate-200 mb-2">business</mat-icon>
          <p>No departments found</p>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [':host{display:block}']
})
export class DepartmentsComponent implements OnInit {
  depts    = signal<any[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  showForm = signal(false);
  search   = '';
  newDept  = { name: '', code: '', description: '' };

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.depts().filter(d => !q || d.name.toLowerCase().includes(q) || (d.code ?? '').toLowerCase().includes(q));
  });

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/departments`).subscribe({
      next: r => { this.depts.set(Array.isArray(r) ? r : (r.content ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  createDept(): void {
    if (!this.newDept.name.trim()) return;
    this.saving.set(true);
    this.http.post<any>(`${environment.apiUrl}/departments`, this.newDept).subscribe({
      next: d => {
        this.depts.update(ds => [d, ...ds]);
        this.newDept = { name: '', code: '', description: '' };
        this.showForm.set(false); this.saving.set(false);
        this.snackBar.open('Department created!', '', { duration: 2500 });
      },
      error: err => { this.snackBar.open(err?.error?.message ?? 'Failed to create', 'Close', { duration: 3000 }); this.saving.set(false); }
    });
  }

  avatarBg(name: string): string {
    const c = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return c[(name?.charCodeAt(0) ?? 0) % c.length];
  }
}
