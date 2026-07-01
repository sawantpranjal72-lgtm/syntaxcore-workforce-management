import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, PagedResponse, ProjectStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly API = `${environment.apiUrl}/projects`;
  constructor(private http: HttpClient) {}

  createProject(request: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(this.API, request);
  }

  getAllProjects(filters: { status?: ProjectStatus; search?: string; page?: number; size?: number } = {}): Observable<PagedResponse<Project>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params = params.set(k, String(v)); });
    return this.http.get<PagedResponse<Project>>(this.API, { params });
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.API}/${id}`);
  }

  updateProject(id: string, request: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.API}/${id}`, request);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  getMyProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.API}/my-projects`);
  }

  addMember(projectId: string, userId: string): Observable<Project> {
    return this.http.post<Project>(`${this.API}/${projectId}/members/${userId}`, {});
  }

  removeMember(projectId: string, userId: string): Observable<Project> {
    return this.http.delete<Project>(`${this.API}/${projectId}/members/${userId}`);
  }
}
