import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { AccessControlService } from '../../core/services/access-control.service';
import { UserSummary, ROLE_LABELS } from '../../core/models';
import { environment } from '../../../environments/environment';

interface SystemStat { label: string; value: number | string; icon: string; color: string; bg: string; }
interface FeatureFlag { key: string; label: string; description: string; enabled: boolean; category: string; }
interface MenuAccess { role: string; label: string; menus: { key: string; label: string; icon: string; allowed: boolean }[]; }
interface ExamPermissionRow { role: string; label: string; canManage: boolean; canTake: boolean; }

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTabsModule, MatProgressSpinnerModule, MatSlideToggleModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">

  <!-- Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
          <mat-icon class="text-white text-base">shield</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Super Admin Console</h1>
      </div>
      <p class="text-slate-500 text-sm">Full system control — role management, features, security and audit</p>
    </div>
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full" style="background:#fef3c7;border:1px solid #fde047">
      <mat-icon class="text-yellow-600 text-sm">warning</mat-icon>
      <span class="text-xs font-semibold text-yellow-700">Super Admin Only</span>
    </div>
  </div>

  <!-- System Stats -->
  @if (stats().length) {
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      @for (s of stats(); track s.label) {
        <div class="rounded-2xl border p-3.5" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center mb-2" [ngClass]="s.bg">
            <mat-icon class="text-sm" [ngClass]="s.color">{{s.icon}}</mat-icon>
          </div>
          <p class="text-xl font-bold text-slate-900 dark:text-white">{{s.value}}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{s.label}}</p>
        </div>
      }
    </div>
  }

  <!-- Tabs -->
  <div class="rounded-2xl border overflow-hidden" style="border-color:var(--border-color,#e2e8f0)">
    <mat-tab-group animationDuration="200ms">

      <!-- ── USER MANAGEMENT TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">manage_accounts</mat-icon>Users</ng-template>
        <div class="p-4" style="background:var(--card-bg,#fff)">
          <!-- Search & Filter -->
          <div class="flex flex-wrap gap-3 mb-4">
            <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-1 min-w-52"
                 style="background:var(--page-bg,#f8fafc);border-color:var(--border-color,#e2e8f0)">
              <mat-icon class="text-slate-400 text-sm">search</mat-icon>
              <input [(ngModel)]="userSearch" placeholder="Search name, email, employee ID..."
                     class="flex-1 bg-transparent text-sm outline-none" style="color:var(--text-primary)">
            </div>
            <select [(ngModel)]="roleFilter"
                    class="px-4 py-2.5 rounded-xl border text-sm outline-none"
                    style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
              <option value="">All Roles</option>
              @for (r of allRoles; track r.value) {
                <option [value]="r.value">{{r.label}}</option>
              }
            </select>
            <button (click)="loadUsers()" mat-stroked-button class="flex items-center gap-1">
              <mat-icon class="text-sm">refresh</mat-icon> Refresh
            </button>
          </div>

          @if (loadingUsers()) {
            <div class="flex justify-center py-10"><mat-spinner diameter="36"></mat-spinner></div>
          } @else {
            <div class="overflow-x-auto rounded-xl border" style="border-color:var(--border-color,#e2e8f0)">
              <table class="w-full text-sm">
                <thead>
                  <tr style="background:var(--page-bg,#f8fafc);border-bottom:1px solid var(--border-color,#e2e8f0)">
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Employee</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Role</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Department</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of filteredUsers(); track u.id) {
                    <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        style="border-color:var(--border-color,#e2e8f0)">
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                               [style.background]="avatarBg(u.fullName)">
                            {{u.firstName[0]}}{{u.lastName[0]}}
                          </div>
                          <div class="min-w-0">
                            <p class="font-medium truncate" style="color:var(--text-primary)">{{u.fullName}}</p>
                            <p class="text-xs text-slate-400 truncate">{{u.email}}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3">
                        <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)"
                                class="px-2.5 py-1.5 rounded-lg border text-xs outline-none font-medium"
                                [ngClass]="roleBadge(u.role)"
                                style="border-color:transparent">
                          @for (r of allRoles; track r.value) {
                            <option [value]="r.value">{{r.label}}</option>
                          }
                        </select>
                      </td>
                      <td class="px-4 py-3 text-xs text-slate-500">{{u.departmentName ?? '—'}}</td>
                      <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                              [ngClass]="u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                          {{u.active ? 'Active' : 'Inactive'}}
                        </span>
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-center gap-1">
                          <button (click)="toggleActive(u)"
                                  class="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                                  [ngClass]="u.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'">
                            {{u.active ? 'Deactivate' : 'Activate'}}
                          </button>
                          <button (click)="resetPassword(u)"
                                  class="px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                            Reset Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="text-xs text-slate-400 mt-2 text-right">{{filteredUsers().length}} of {{users().length}} users</p>
          }
        </div>
      </mat-tab>

      <!-- ── ROLE & MENU ACCESS TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">key</mat-icon>Role Access</ng-template>
        <div class="p-4 space-y-4" style="background:var(--card-bg,#fff)">
          <p class="text-sm text-slate-500 mb-4">Configure which menu items each role can access. Changes are saved immediately.</p>
          @for (access of menuAccess(); track access.role) {
            <div class="rounded-xl border overflow-hidden" style="border-color:var(--border-color,#e2e8f0)">
              <div class="px-4 py-3 flex items-center justify-between"
                   style="background:var(--page-bg,#f8fafc);border-bottom:1px solid var(--border-color,#e2e8f0)">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold" [ngClass]="roleBadge(access.role)">
                    {{access.label}}
                  </span>
                  <span class="text-xs text-slate-400">
                    {{enabledMenuCount(access)}} / {{access.menus.length}} menus enabled
                  </span>
                </div>
                <div class="flex gap-2">
                  <button (click)="enableAll(access)"
                          class="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">
                    Enable All
                  </button>
                  <button (click)="disableAll(access)"
                          class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    Disable All
                  </button>
                </div>
              </div>
              <div class="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (menu of access.menus; track menu.key) {
                  <div class="flex items-center justify-between p-3 rounded-xl border transition-all"
                       [style.border-color]="menu.allowed ? '#86efac' : 'var(--border-color,#e2e8f0)'"
                       [style.background]="menu.allowed ? '#f0fdf4' : 'var(--page-bg,#f8fafc)'">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-sm" [class]="menu.allowed ? 'text-green-500' : 'text-slate-400'">{{menu.icon}}</mat-icon>
                      <span class="text-xs font-medium" style="color:var(--text-primary)">{{menu.label}}</span>
                    </div>
                    <mat-slide-toggle [checked]="menu.allowed" (change)="setMenuAllowed(access.role, menu.key, $event.checked)"
                                     [color]="'primary'" class="scale-75">
                    </mat-slide-toggle>
                  </div>
                }
              </div>
            </div>
          }
          <button (click)="saveMenuAccess()"
                  class="px-6 py-3 rounded-xl text-white font-semibold text-sm"
                  style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
            <mat-icon class="text-base mr-1">save</mat-icon>
            Save Access Configuration
          </button>
        </div>
      </mat-tab>

      <!-- ── EXAM PERMISSIONS TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">quiz</mat-icon>Exam Permissions</ng-template>
        <div class="p-4 space-y-4" style="background:var(--card-bg,#fff)">
          <p class="text-sm text-slate-500 mb-4">
            Decide which roles can <strong>create / edit / delete / publish</strong> exams (set the question paper, marks, and correct answers)
            versus which roles may only <strong>take / solve</strong> exams. Super Admin always retains exam-management rights as a safeguard against accidental lockout.
          </p>
          <div class="rounded-xl border overflow-hidden" style="border-color:var(--border-color,#e2e8f0)">
            <table class="w-full text-sm">
              <thead>
                <tr style="background:var(--page-bg,#f8fafc);border-bottom:1px solid var(--border-color,#e2e8f0)">
                  <th class="text-left px-4 py-3 font-semibold" style="color:var(--text-primary)">Role</th>
                  <th class="text-center px-4 py-3 font-semibold" style="color:var(--text-primary)">
                    Can Create / Edit / Delete Exams
                  </th>
                  <th class="text-center px-4 py-3 font-semibold" style="color:var(--text-primary)">
                    Can Take / Solve Exams
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (perm of examPermissions(); track perm.role) {
                  <tr style="border-bottom:1px solid var(--border-color,#e2e8f0)">
                    <td class="px-4 py-3">
                      <span class="px-2.5 py-1 rounded-full text-xs font-bold" [ngClass]="roleBadge(perm.role)">
                        {{perm.label}}
                      </span>
                      @if (perm.role === 'SUPER_ADMIN') {
                        <span class="text-xs text-slate-400 ml-2">(always enabled)</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-center">
                      <mat-slide-toggle [checked]="perm.canManage" [disabled]="perm.role === 'SUPER_ADMIN'"
                                       (change)="setExamPermission(perm.role, 'canManage', $event.checked)"
                                       color="primary">
                      </mat-slide-toggle>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <mat-slide-toggle [checked]="perm.canTake" [disabled]="perm.role === 'SUPER_ADMIN'"
                                       (change)="setExamPermission(perm.role, 'canTake', $event.checked)"
                                       color="primary">
                      </mat-slide-toggle>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <button (click)="saveExamPermissions()"
                  class="px-6 py-3 rounded-xl text-white font-semibold text-sm"
                  style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
            <mat-icon class="text-base mr-1">save</mat-icon>
            Save Exam Permissions
          </button>
        </div>
      </mat-tab>

      <!-- ── FEATURE FLAGS TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">toggle_on</mat-icon>Features</ng-template>
        <div class="p-4" style="background:var(--card-bg,#fff)">
          <p class="text-sm text-slate-500 mb-4">Enable or disable platform features globally. Toggle changes apply immediately for all users.</p>
          @for (cat of featureCategories(); track cat) {
            <div class="mb-5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">{{cat}}</h3>
              <div class="space-y-2">
                @for (f of featuresByCategory(cat); track f.key) {
                  <div class="flex items-center justify-between p-4 rounded-xl border transition-all"
                       [style.border-color]="f.enabled ? '#bfdbfe' : 'var(--border-color,#e2e8f0)'"
                       [style.background]="f.enabled ? '#eff6ff' : 'var(--page-bg,#f8fafc)'">
                    <div>
                      <p class="font-medium text-sm" style="color:var(--text-primary)">{{f.label}}</p>
                      <p class="text-xs text-slate-400 mt-0.5">{{f.description}}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <span class="text-xs font-medium" [class]="f.enabled ? 'text-blue-600' : 'text-slate-400'">
                        {{f.enabled ? 'ON' : 'OFF'}}
                      </span>
                      <mat-slide-toggle [(ngModel)]="f.enabled" (change)="setFeatureFlag(f.key, $event.checked)" [color]="'primary'"></mat-slide-toggle>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ── SECURITY TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">security</mat-icon>Security</ng-template>
        <div class="p-4 space-y-4" style="background:var(--card-bg,#fff)">
          <div class="grid sm:grid-cols-2 gap-4">
            @for (s of securitySettings; track s.label) {
              <div class="rounded-xl border p-4" style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc)">
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" [ngClass]="s.bg">
                    <mat-icon class="text-sm" [ngClass]="s.color">{{s.icon}}</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold text-sm" style="color:var(--text-primary)">{{s.label}}</p>
                    <p class="text-xs text-slate-400 mt-0.5 mb-3">{{s.description}}</p>
                    @if (s.type === 'toggle') {
                      <mat-slide-toggle [(ngModel)]="s.value" color="primary">
                        <span class="text-xs text-slate-600">{{s.value ? 'Enabled' : 'Disabled'}}</span>
                      </mat-slide-toggle>
                    } @else if (s.type === 'number') {
                      <div class="flex items-center gap-2">
                        <input [(ngModel)]="s.value" type="number"
                               class="w-20 px-3 py-2 rounded-xl border text-sm outline-none text-center"
                               style="border-color:var(--border-color,#e2e8f0);background:var(--card-bg,#fff)">
                        <span class="text-xs text-slate-400">{{s.unit}}</span>
                      </div>
                    } @else if (s.type === 'select') {
                      <select [(ngModel)]="s.value"
                              class="px-3 py-2 rounded-xl border text-sm outline-none"
                              style="border-color:var(--border-color,#e2e8f0);background:var(--card-bg,#fff);color:var(--text-primary)">
                        @for (opt of s.options; track opt) {
                          <option [value]="opt">{{opt}}</option>
                        }
                      </select>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          <button (click)="saveSecuritySettings()"
                  class="px-6 py-3 rounded-xl text-white font-semibold text-sm"
                  style="background:linear-gradient(135deg,#ef4444,#dc2626)">
            <mat-icon class="text-base mr-1">security</mat-icon>
            Apply Security Settings
          </button>
        </div>
      </mat-tab>

      <!-- ── SESSIONS TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">devices</mat-icon>Sessions</ng-template>
        <div class="p-4" style="background:var(--card-bg,#fff)">
          <!-- Filter bar -->
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
            <p class="text-sm text-slate-500" style="flex:1;min-width:120px">Active user sessions across the platform</p>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <label style="font-size:12px;color:var(--text-muted);font-weight:500">From</label>
              <input type="date" class="sc-input" style="font-size:12px;padding:6px 10px;width:150px"
                     [(ngModel)]="sessionFilterFrom" (change)="applySessionFilter()">
              <label style="font-size:12px;color:var(--text-muted);font-weight:500">To</label>
              <input type="date" class="sc-input" style="font-size:12px;padding:6px 10px;width:150px"
                     [(ngModel)]="sessionFilterTo" (change)="applySessionFilter()">
              <input class="sc-input" placeholder="Search user or location…" style="font-size:12px;padding:6px 10px;width:180px"
                     [(ngModel)]="sessionSearchQ" (input)="applySessionFilter()">
              @if (sessionFilterFrom || sessionFilterTo || sessionSearchQ) {
                <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="clearSessionFilter()">Clear</button>
              }
              <button (click)="loadSessions()" mat-stroked-button>
                <mat-icon class="text-sm">refresh</mat-icon>
              </button>
            </div>
          </div>

          @if (loadingSessions()) {
            <div class="flex justify-center py-10"><mat-spinner diameter="32"></mat-spinner></div>
          } @else {
            <div class="space-y-2">
              @for (s of filteredSessions(); track s.id) {
                <div class="flex items-start gap-4 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                     style="border-color:var(--border-color,#e2e8f0)">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
                       [style.background]="avatarBg(s.userName ?? 'User')">
                    {{(s.userName ?? 'U')[0]}}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-sm" style="color:var(--text-primary)">{{s.userName ?? 'Unknown'}}</p>
                    <!-- Location + IP row -->
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      @if (s.location) {
                        <span style="display:flex;align-items:center;gap:3px;font-size:12px;color:var(--text-primary);font-weight:500">
                          <mat-icon style="font-size:13px;color:#6366f1">location_on</mat-icon>
                          {{s.location}}
                        </span>
                      }
                      @if (s.ipAddress) {
                        <span style="font-size:11px;color:var(--text-muted);font-family:'DM Mono',monospace">
                          {{s.ipAddress}}
                        </span>
                      }
                      @if (s.deviceType) {
                        <span class="sc-badge badge-pending" style="font-size:10px;padding:2px 7px">{{s.deviceType}}</span>
                      }
                    </div>
                    <!-- Timestamps row -->
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      @if (s.createdAt) {
                        <span style="font-size:11px;color:var(--text-muted)">
                          Started: {{s.createdAt | date:'d MMM y, h:mm a'}}
                        </span>
                      }
                      @if (s.lastActivity) {
                        <span style="font-size:11px;color:var(--text-muted)">
                          · Last active: {{s.lastActivity | date:'d MMM y, h:mm a'}}
                        </span>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="flex items-center gap-1">
                      <div class="w-2 h-2 rounded-full" [class]="s.active ? 'bg-green-400 animate-pulse' : 'bg-slate-300'"></div>
                      <span class="text-xs" style="color:var(--text-muted)">{{s.active ? 'Active' : 'Idle'}}</span>
                    </div>
                    <button (click)="revokeSession(s)"
                            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      Revoke
                    </button>
                  </div>
                </div>
              }
              @if (!filteredSessions().length) {
                <div class="text-center py-12 text-slate-400 text-sm">
                  {{sessions().length ? 'No sessions match the current filters' : 'No active sessions found'}}
                </div>
              }
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin-top:12px">
              Showing {{filteredSessions().length}} of {{sessions().length}} sessions
            </p>
          }
        </div>
      </mat-tab>

      <!-- ── AUDIT LOG TAB ── -->
      <mat-tab>
        <ng-template mat-tab-label><mat-icon class="mr-1.5 text-sm">history</mat-icon>Audit Log</ng-template>
        <div class="p-4" style="background:var(--card-bg,#fff)">
          @if (loadingLogs()) {
            <div class="flex justify-center py-10"><mat-spinner diameter="32"></mat-spinner></div>
          } @else {
            <div class="space-y-2">
              @for (log of auditLogs(); track log.id) {
                <div class="flex items-start gap-3 p-3.5 rounded-xl border"
                     style="border-color:var(--border-color,#e2e8f0)">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                       style="background:var(--page-bg,#f8fafc)">
                    <mat-icon class="text-sm text-slate-400">{{actionIcon(log.action)}}</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                            [ngClass]="actionChip(log.action)">{{log.action}}</span>
                      <span class="text-xs text-slate-400">{{log.entityType}}</span>
                    </div>
                    <p class="text-sm mt-1" style="color:var(--text-primary)">{{log.description}}</p>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-xs text-slate-400">{{log.user?.fullName ?? 'System'}}</span>
                      <span class="text-xs text-slate-300">•</span>
                      <span class="text-xs text-slate-400">{{log.createdAt | date:'medium'}}</span>
                    </div>
                  </div>
                </div>
              }
              @if (!auditLogs().length) {
                <div class="text-center py-12 text-slate-400 text-sm">No audit logs found</div>
              }
            </div>
          }
        </div>
      </mat-tab>

    </mat-tab-group>
  </div>
</div>
  `,
  styles: [`:host{display:block}`]
})
export class AdminComponent implements OnInit {
  users           = signal<UserSummary[]>([]);
  sessions        = signal<any[]>([]);
  sessionFilterFrom = '';
  sessionFilterTo   = '';
  sessionSearchQ    = '';
  filteredSessions  = signal<any[]>([]);

  applySessionFilter(): void {
    let list = [...this.sessions()];
    if (this.sessionSearchQ.trim()) {
      const q = this.sessionSearchQ.toLowerCase();
      list = list.filter(s =>
        (s.userName ?? '').toLowerCase().includes(q) ||
        (s.location ?? '').toLowerCase().includes(q) ||
        (s.ipAddress ?? '').toLowerCase().includes(q)
      );
    }
    if (this.sessionFilterFrom) {
      const from = new Date(this.sessionFilterFrom).getTime();
      list = list.filter(s => s.createdAt && new Date(s.createdAt).getTime() >= from);
    }
    if (this.sessionFilterTo) {
      const to = new Date(this.sessionFilterTo + 'T23:59:59').getTime();
      list = list.filter(s => s.createdAt && new Date(s.createdAt).getTime() <= to);
    }
    this.filteredSessions.set(list);
  }

  clearSessionFilter(): void {
    this.sessionFilterFrom = '';
    this.sessionFilterTo   = '';
    this.sessionSearchQ    = '';
    this.filteredSessions.set([...this.sessions()]);
  }


  auditLogs       = signal<any[]>([]);
  stats           = signal<SystemStat[]>([]);
  menuAccess      = signal<MenuAccess[]>([]);
  examPermissions = signal<ExamPermissionRow[]>([]);
  loadingUsers    = signal(false);
  loadingSessions = signal(false);
  loadingLogs     = signal(false);
  userSearch      = '';
  roleFilter      = '';

  allRoles = [
    { value: 'SUPER_ADMIN',    label: 'Super Admin' },
    { value: 'ADMINISTRATOR',  label: 'Administrator' },
    { value: 'PROJECT_MANAGER',label: 'Project Manager' },
    { value: 'HR_MANAGER',     label: 'HR Manager' },
    { value: 'EMPLOYEE',       label: 'Employee' },
    { value: 'INTERN',         label: 'Intern' },
    { value: 'STUDENT',        label: 'Student' },
  ];

  allMenus = [
    { key: 'dashboard',  label: 'Dashboard',       icon: 'dashboard' },
    { key: 'analytics',  label: 'Analytics',        icon: 'bar_chart' },
    { key: 'ai',         label: 'AI Assistant',     icon: 'auto_awesome' },
    { key: 'my-tasks',   label: 'My Tasks',         icon: 'task_alt' },
    { key: 'all-tasks',  label: 'All Tasks',        icon: 'format_list_bulleted' },
    { key: 'projects',   label: 'Projects',         icon: 'folder_open' },
    { key: 'employees',  label: 'Employees',        icon: 'people_outline' },
    { key: 'attendance', label: 'Attendance',       icon: 'schedule' },
    { key: 'daily-report', label: 'Daily Attendance', icon: 'fact_check' },
    { key: 'leaves',     label: 'Leave Requests',   icon: 'event_busy' },
    { key: 'metrics',    label: 'Team Metrics',     icon: 'leaderboard' },
    { key: 'chat',       label: 'Chat',             icon: 'chat_bubble_outline' },
    { key: 'notifications',label:'Notifications',   icon: 'notifications_none' },
    { key: 'admin',      label: 'Super Admin',      icon: 'shield' },
    { key: 'departments',label: 'Departments',      icon: 'business' },
    { key: 'reports',    label: 'Reports',          icon: 'assessment' },
    { key: 'task-approvals',   label: 'Task Approvals',       icon: 'fact_check' },
    { key: 'working-schedule', label: 'Working Schedule',     icon: 'work_history' },
    { key: 'exams',            label: 'Exam Portal',          icon: 'quiz' },
    { key: 'leave-email-config', label: 'Leave Email Config', icon: 'mark_email_read' },
  ];

  defaultMenuAccessMap: Record<string, string[]> = {
    SUPER_ADMIN:     ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','admin','departments','reports','exams','leave-email-config'],
    ADMINISTRATOR:   ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','departments','reports','exams','leave-email-config'],
    PROJECT_MANAGER: ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','leaves','metrics','chat','notifications','exams'],
    HR_MANAGER:      ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','departments','reports','exams','leave-email-config'],
    EMPLOYEE:        ['dashboard','ai','my-tasks','all-tasks','projects','attendance','leaves','chat','notifications','exams'],
    INTERN:          ['dashboard','ai','my-tasks','all-tasks','attendance','chat','notifications','exams'],
    STUDENT:         ['dashboard','attendance','notifications','exams'],
  };

  features = signal<FeatureFlag[]>([
    { key:'chat',          label:'Real-Time Chat',       description:'WebSocket-based direct messaging between employees', enabled:true,  category:'Communication' },
    { key:'ai',            label:'AI Assistant',         description:'Claude-powered AI for tasks and insights',           enabled:true,  category:'Intelligence' },
    { key:'websocket',     label:'WebSocket Live Updates',description:'Real-time push updates for tasks and notifications', enabled:true,  category:'Communication' },
    { key:'email_notif',   label:'Email Notifications',  description:'Automated email alerts for tasks and leaves',        enabled:true,  category:'Communication' },
    { key:'attendance',    label:'Attendance Tracking',  description:'Check-in/out tracking with location support',        enabled:true,  category:'HR' },
    { key:'leave_mgmt',    label:'Leave Management',     description:'Leave request and approval workflow',                enabled:true,  category:'HR' },
    { key:'reports',       label:'Report Downloads',     description:'CSV/Excel report generation and download',           enabled:true,  category:'Analytics' },
    { key:'analytics',     label:'Analytics Dashboard',  description:'Charts and metrics for managers',                   enabled:true,  category:'Analytics' },
    { key:'2fa',           label:'Two-Factor Auth',      description:'TOTP-based 2FA for enhanced security',              enabled:false, category:'Security' },
    { key:'audit',         label:'Audit Logging',        description:'Track all admin and user actions',                  enabled:true,  category:'Security' },
    { key:'password_exp',  label:'Password Expiry',      description:'Force password change after N days',                enabled:false, category:'Security' },
    { key:'self_register', label:'Self Registration',    description:'Allow employees to self-register accounts',         enabled:false, category:'Security' },
  ]);

  featureCategories = computed(() => [...new Set(this.features().map(f => f.category))]);
  featuresByCategory(cat: string): FeatureFlag[] { return this.features().filter(f => f.category === cat); }

  securitySettings: any[] = [
    { icon:'lock_clock',  color:'text-red-500',    bg:'bg-red-50',    label:'Session Timeout',      description:'Auto-logout after inactivity',              type:'number',  value:60,     unit:'minutes' },
    { icon:'password',    color:'text-amber-500',  bg:'bg-amber-50',  label:'Min Password Length',  description:'Minimum characters for user passwords',     type:'number',  value:8,      unit:'chars' },
    { icon:'history',     color:'text-blue-500',   bg:'bg-blue-50',   label:'Password History',     description:'Prevent reuse of last N passwords',         type:'number',  value:3,      unit:'passwords' },
    { icon:'login',       color:'text-red-500',    bg:'bg-red-50',    label:'Max Login Attempts',   description:'Lock account after N failed attempts',      type:'number',  value:5,      unit:'attempts' },
    { icon:'verified_user',color:'text-green-500', bg:'bg-green-50',  label:'Email Verification',   description:'Require email verification on signup',      type:'toggle',  value:true,   unit:'' },
    { icon:'vpn_lock',    color:'text-violet-500', bg:'bg-violet-50', label:'IP Whitelist',         description:'Restrict access to specific IP ranges',     type:'toggle',  value:false,  unit:'' },
    { icon:'security',    color:'text-indigo-500', bg:'bg-indigo-50', label:'Force HTTPS',          description:'Redirect all HTTP to HTTPS',                type:'toggle',  value:true,   unit:'' },
    { icon:'schedule',    color:'text-teal-500',   bg:'bg-teal-50',   label:'Token Expiry',         description:'JWT access token lifetime',                 type:'select',  value:'24h',  options:['1h','6h','12h','24h','7d'] },
  ];

  filteredUsers = computed(() => {
    const q = this.userSearch.toLowerCase();
    return this.users().filter(u =>
      (!this.roleFilter || u.role === this.roleFilter) &&
      (!q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.employeeId ?? '').toLowerCase().includes(q))
    );
  });

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public authService: AuthService,
    private accessControl: AccessControlService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadUsers();
    this.loadSessions();
    this.loadAuditLogs();
    this.accessControl.loadSettings().subscribe({
      next: () => { this.buildMenuAccess(); this.buildExamPermissions(); },
      error: () => { this.buildMenuAccess(); this.buildExamPermissions(); }
    });
  }

  loadStats(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/system-stats`).subscribe({
      next: s => this.stats.set([
        { label:'Total Users',    value: s.totalUsers    ?? 0, icon:'people',       color:'text-blue-600',   bg:'bg-blue-50' },
        { label:'Active Users',   value: s.activeUsers   ?? 0, icon:'person_check', color:'text-green-600',  bg:'bg-green-50' },
        { label:'Live Sessions',  value: s.activeSessions?? 0, icon:'devices',      color:'text-violet-600', bg:'bg-violet-50' },
        { label:'System Status',  value: s.systemStatus  ?? 'OK', icon:'health_and_safety', color:'text-teal-600', bg:'bg-teal-50' },
        { label:'Projects',       value: s.totalProjects ?? 0, icon:'folder_open',  color:'text-indigo-600', bg:'bg-indigo-50' },
        { label:'Open Tasks',     value: s.pendingTasks  ?? 0, icon:'task_alt',     color:'text-amber-600',  bg:'bg-amber-50' },
      ]),
      error: () => {}
    });
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/users?size=200`).subscribe({
      next: r => { this.users.set(r.content ?? []); this.loadingUsers.set(false); },
      error: () => { this.loadingUsers.set(false); }
    });
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/sessions?size=200`).subscribe({
      next: r => {
        this.sessions.set(r.content ?? []);
        this.applySessionFilter(); // apply any active filters to the fresh data
        this.loadingSessions.set(false);
      },
      error: () => this.loadingSessions.set(false)
    });
  }

  loadAuditLogs(): void {
    this.loadingLogs.set(true);
    this.http.get<any>(`${environment.apiUrl}/admin/activity-logs?size=100`).subscribe({
      next: r => { this.auditLogs.set(r.content ?? []); this.loadingLogs.set(false); },
      error: () => this.loadingLogs.set(false)
    });
  }

  buildMenuAccess(): void {
    const saved = this.accessControl.menuAccess();
    const access = this.allRoles.map(role => ({
      role: role.value, label: role.label,
      menus: this.allMenus.map(menu => ({
        ...menu,
        allowed: saved[role.value] ? saved[role.value].includes(menu.key) : this.defaultMenuAccessMap[role.value]?.includes(menu.key) ?? false
      }))
    }));
    this.menuAccess.set(access);
    this.applySavedFeatureFlags();
  }

  changeRole(user: UserSummary, newRole: string): void {
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/role`, { role: newRole }).subscribe({
      next: () => {
        this.users.update(us => us.map(u => u.id === user.id ? { ...u, role: newRole as any } : u));
        this.snackBar.open(`Role updated to ${ROLE_LABELS[newRole]}`, '', { duration: 2500 });
      },
      error: err => this.snackBar.open(err?.error?.message ?? 'Failed to update role', 'Close', { duration: 3000 })
    });
  }

  toggleActive(user: UserSummary): void {
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/activate`, { active: !user.active }).subscribe({
      next: () => {
        this.users.update(us => us.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
        this.snackBar.open(`User ${user.active ? 'deactivated' : 'activated'}`, '', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }

  resetPassword(user: UserSummary): void {
    const np = prompt(`New password for ${user.fullName} (min 8 chars):`);
    if (!np || np.length < 8) { if (np !== null) this.snackBar.open('Password too short', '', { duration: 2000 }); return; }
    this.http.patch(`${environment.apiUrl}/admin/users/${user.id}/reset-password`, { newPassword: np }).subscribe({
      next: () => this.snackBar.open('Password reset and sessions revoked', '', { duration: 3000 }),
      error: () => this.snackBar.open('Failed to reset password', 'Close', { duration: 3000 })
    });
  }

  revokeSession(session: any): void {
    this.http.delete(`${environment.apiUrl}/admin/sessions/user/${session.userId}`).subscribe({
      next: () => {
        this.sessions.update(ss => ss.filter(s => s.id !== session.id));
        this.snackBar.open('Session revoked', '', { duration: 2000 });
      },
      error: () => this.snackBar.open('Failed to revoke session', 'Close', { duration: 3000 })
    });
  }

  enableAll(access: MenuAccess): void {
    this.menuAccess.update(items => items.map(item =>
      item.role === access.role
        ? { ...item, menus: item.menus.map(menu => ({ ...menu, allowed: true })) }
        : item
    ));
  }

  disableAll(access: MenuAccess): void {
    this.menuAccess.update(items => items.map(item =>
      item.role === access.role
        ? {
            ...item,
            menus: item.menus.map(menu => ({
              ...menu,
              allowed: menu.key === 'dashboard' || (item.role === 'SUPER_ADMIN' && menu.key === 'admin')
            }))
          }
        : item
    ));
  }
  enabledMenuCount(access: MenuAccess): number { return access.menus.filter(m => m.allowed).length; }

  saveMenuAccess(): void {
    const config: Record<string, string[]> = {};
    this.menuAccess().forEach(a => { config[a.role] = a.menus.filter(m => m.allowed).map(m => m.key); });
    this.accessControl.setMenuAccess(config).subscribe({
      next: () => {
        this.buildMenuAccess();
        this.snackBar.open('Menu access configuration saved!', '', { duration: 2500 });
      },
      error: () => this.snackBar.open('Failed to save menu access', 'Close', { duration: 3000 })
    });
  }

  setMenuAllowed(role: string, menuKey: string, allowed: boolean): void {
    this.menuAccess.update(items => items.map(item =>
      item.role === role
        ? {
            ...item,
            menus: item.menus.map(menu =>
              menu.key === menuKey
                ? { ...menu, allowed: menuKey === 'dashboard' || (role === 'SUPER_ADMIN' && menuKey === 'admin') || allowed }
                : menu
            )
          }
        : item
    ));
  }

  buildExamPermissions(): void {
    const saved = this.accessControl.examPermissions();
    const defaults = this.accessControl.defaultExamPermissions;
    this.examPermissions.set(this.allRoles.map(r => {
      const perm = saved[r.value] ?? defaults[r.value] ?? { canManage: false, canTake: true };
      // Super Admin safeguard: always shown as fully enabled regardless of stored state
      const canManage = r.value === 'SUPER_ADMIN' ? true : perm.canManage;
      const canTake    = r.value === 'SUPER_ADMIN' ? true : perm.canTake;
      return { role: r.value, label: r.label, canManage, canTake };
    }));
  }

  setExamPermission(role: string, field: 'canManage' | 'canTake', value: boolean): void {
    if (role === 'SUPER_ADMIN') return; // safeguard against accidental lockout
    this.examPermissions.update(items => items.map(item =>
      item.role === role ? { ...item, [field]: value } : item
    ));
  }

  saveExamPermissions(): void {
    const config: Record<string, { canManage: boolean; canTake: boolean }> = {};
    this.examPermissions().forEach(p => {
      config[p.role] = { canManage: p.role === 'SUPER_ADMIN' ? true : p.canManage, canTake: p.role === 'SUPER_ADMIN' ? true : p.canTake };
    });
    this.accessControl.setExamPermissions(config).subscribe({
      next: () => {
        this.buildExamPermissions();
        this.snackBar.open('Exam permissions saved! Changes apply immediately, including for already-logged-in users.', '', { duration: 4000 });
      },
      error: () => this.snackBar.open('Failed to save exam permissions', 'Close', { duration: 3000 })
    });
  }

  setFeatureFlag(key: string, enabled: boolean): void {
    const config = this.features().reduce<Record<string, boolean>>((acc, feature) => {
      acc[feature.key] = feature.key === key ? enabled : feature.enabled;
      return acc;
    }, {});
    this.accessControl.setFeatureFlags(config).subscribe({
      next: () => {
        this.applySavedFeatureFlags();
        this.snackBar.open('Feature setting saved', '', { duration: 1500 });
      },
      error: () => this.snackBar.open('Failed to save feature setting', 'Close', { duration: 3000 })
    });
  }

  applySavedFeatureFlags(): void {
    const saved = this.accessControl.featureFlags();
    this.features.update(items => items.map(feature => ({
      ...feature,
      enabled: saved[feature.key] ?? feature.enabled
    })));
  }

  saveSecuritySettings(): void {
    this.snackBar.open('Security settings applied. Restart required for some changes.', '', { duration: 4000 });
  }

  avatarBg(name: string): string {
    const c = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return c[(name?.charCodeAt(0) ?? 0) % c.length];
  }
  roleBadge(role: string): string {
    return { SUPER_ADMIN:'bg-red-100 text-red-700', ADMINISTRATOR:'bg-violet-100 text-violet-700', PROJECT_MANAGER:'bg-blue-100 text-blue-700', HR_MANAGER:'bg-green-100 text-green-700', EMPLOYEE:'bg-slate-100 text-slate-600', INTERN:'bg-yellow-100 text-yellow-700', STUDENT:'bg-orange-100 text-orange-700' }[role] ?? 'bg-slate-100 text-slate-600';
  }
  actionIcon(action: string): string {
    return { CREATE:'add_circle', UPDATE:'edit', DELETE:'delete', LOGIN:'login', LOGOUT:'logout' }[action] ?? 'info';
  }
  actionChip(action: string): string {
    return { CREATE:'bg-green-100 text-green-700', UPDATE:'bg-blue-100 text-blue-700', DELETE:'bg-red-100 text-red-600', LOGIN:'bg-slate-100 text-slate-600', LOGOUT:'bg-slate-100 text-slate-500' }[action] ?? 'bg-slate-100 text-slate-500';
  }
}
