import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Attendance, PagedResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly API = `${environment.apiUrl}/attendance`;
  constructor(private http: HttpClient) {}
  checkIn(location: string, remote: boolean): Observable<Attendance> { return this.http.post<Attendance>(`${this.API}/check-in`, { location, remote }); }
  checkOut(): Observable<Attendance> { return this.http.post<Attendance>(`${this.API}/check-out`, {}); }
  getToday(): Observable<Attendance> { return this.http.get<Attendance>(`${this.API}/today`); }
  getHistory(page = 0, size = 30): Observable<PagedResponse<Attendance>> {
    return this.http.get<PagedResponse<Attendance>>(`${this.API}/history?page=${page}&size=${size}`);
  }
}
