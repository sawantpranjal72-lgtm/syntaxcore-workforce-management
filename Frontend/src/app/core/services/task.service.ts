import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskRequest, PagedResponse, TaskStatus, Priority } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly API = `${environment.apiUrl}/tasks`;
  constructor(private http: HttpClient) {}

  createTask(request: TaskRequest): Observable<Task> {
    return this.http.post<Task>(this.API, request);
  }

  getAllTasks(filters: {
    projectId?: string; assigneeId?: string; status?: TaskStatus;
    priority?: Priority; search?: string; page?: number; size?: number;
  } = {}): Observable<PagedResponse<Task>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params = params.set(k, String(v)); });
    return this.http.get<PagedResponse<Task>>(this.API, { params });
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.API}/${id}`);
  }

  updateTask(id: string, request: Partial<TaskRequest>): Observable<Task> {
    return this.http.put<Task>(`${this.API}/${id}`, request);
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  updateStatus(id: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.API}/${id}/status`, { status });
  }

  /** Marks that the current user has started their own portion of a task.
   * Tracked per-assignee on multi-assignee tasks so it doesn't affect any
   * other assignee's displayed status. */
  startWork(id: string): Observable<Task> {
    return this.http.patch<Task>(`${this.API}/${id}/start`, {});
  }

  getKanban(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API}/kanban`, { params: { projectId } });
  }

  updateBoardOrder(id: string, boardColumn: string, boardOrder: number): Observable<void> {
    return this.http.patch<void>(`${this.API}/${id}/board-order`, { boardColumn, boardOrder });
  }

  getMyTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API}/my-tasks`);
  }

  getOverdueTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API}/overdue`);
  }
}
