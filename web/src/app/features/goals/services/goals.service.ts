import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddGoalContributionRequest,
  CreateGoalRequest,
  GetGoalsResponse,
  GoalCategory,
  GoalDetail,
  GoalPriority,
  GoalStatus,
  UpdateGoalRequest
} from '../models/goal.model';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/goals';

  getGoals(params?: {
    status?: GoalStatus | null;
    category?: GoalCategory | null;
    priority?: GoalPriority | null;
    search?: string | null;
  }): Observable<GetGoalsResponse> {
    let httpParams = new HttpParams();

    if (params?.status != null) {
      httpParams = httpParams.set('status', params.status.toString());
    }
    if (params?.category != null) {
      httpParams = httpParams.set('category', params.category.toString());
    }
    if (params?.priority != null) {
      httpParams = httpParams.set('priority', params.priority.toString());
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<GetGoalsResponse>(this.baseUrl, { params: httpParams });
  }

  getGoalById(id: string): Observable<GoalDetail> {
    return this.http.get<GoalDetail>(`${this.baseUrl}/${id}`);
  }

  createGoal(payload: CreateGoalRequest): Observable<GoalDetail> {
    return this.http.post<GoalDetail>(this.baseUrl, payload);
  }

  updateGoal(id: string, payload: UpdateGoalRequest): Observable<GoalDetail> {
    return this.http.put<GoalDetail>(`${this.baseUrl}/${id}`, payload);
  }

  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addContribution(goalId: string, payload: AddGoalContributionRequest): Observable<GoalDetail> {
    return this.http.post<GoalDetail>(`${this.baseUrl}/${goalId}/contributions`, payload);
  }

  deleteContribution(goalId: string, contributionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${goalId}/contributions/${contributionId}`);
  }

  changeGoalStatus(id: string, status: GoalStatus): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, status, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

