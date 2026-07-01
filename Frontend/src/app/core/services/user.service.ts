import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserDetail, UserSummary, PagedResponse, Role } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}

  getMe(): Observable<UserDetail> { return this.http.get<UserDetail>(`${this.API}/me`); }
  updateMe(data: Partial<UserDetail>): Observable<UserDetail> { return this.http.put<UserDetail>(`${this.API}/me`, data); }
  getById(id: string): Observable<UserDetail> { return this.http.get<UserDetail>(`${this.API}/${id}`); }
  getAll(params: { search?: string; role?: Role; departmentId?: string; page?: number; size?: number } = {}): Observable<PagedResponse<UserSummary>> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p = p.set(k, String(v)); });
    return this.http.get<PagedResponse<UserSummary>>(this.API, { params: p });
  }
  update(id: string, data: any): Observable<UserDetail> { return this.http.put<UserDetail>(`${this.API}/${id}`, data); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.API}/${id}`); }
  toggleStatus(id: string): Observable<any> { return this.http.patch(`${this.API}/${id}/toggle-status`, {}); }
  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ avatarUrl: string }>(`${this.API}/me/avatar`, fd);
  }
}
