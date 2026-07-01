import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Notification, PagedResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  unreadCount = signal(0);
  private readonly API = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(page = 0, size = 20): Observable<PagedResponse<Notification>> {
    return this.http.get<PagedResponse<Notification>>(`${this.API}?page=${page}&size=${size}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.API}/unread-count`).pipe(
      tap(r => this.unreadCount.set(r.count ?? 0))
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.patch(`${this.API}/${id}/read`, {}).pipe(
      tap(() => this.unreadCount.update(c => Math.max(0, c - 1)))
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.API}/mark-all-read`, {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  incrementUnread(): void { this.unreadCount.update(c => c + 1); }
}
