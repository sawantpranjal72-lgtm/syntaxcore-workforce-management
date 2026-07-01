import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";

interface QOption { id: string; text: string; isCorrect?: boolean; }
interface CandidateAnswer { questionId: string; mcqOptionId?: string; textAnswer?: string; codeAnswer?: string; }
interface QReview {
  questionId: string; type: string; text: string; marks: number;
  options?: QOption[]; expectedAnswer?: string; codeTemplate?: string; testCases?: string;
  candidateAnswer?: CandidateAnswer | null;
  awardedMarks?: number | null;
  questionFeedback?: string | null;
}
interface AttemptDetail {
  attemptId: string; examTitle: string; totalMarks: number; passingMarks: number;
  candidateName: string; candidateRole: string; candidateEmail: string;
  status: string; score: number; passed: boolean; violations: number; timeTaken: number;
  submittedAt: string; instructorFeedback?: string; gradedBy?: string; gradedAt?: string;
  questions: QReview[];
}

@Component({
  selector: "app-exam-grade", standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-4xl mx-auto fade-in">

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <a [routerLink]="['/exams', examId(), 'results']" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none">
      <mat-icon>arrow_back</mat-icon>
    </a>
    <div style="flex:1;min-width:0">
      <h1 style="font-size:1.35rem;font-weight:700;color:var(--text-primary)">Grade Submission</h1>
      <p style="font-size:13px;color:var(--text-muted)">{{detail()?.examTitle}}</p>
    </div>
    @if (detail()?.status === 'GRADED') {
      <span class="sc-badge badge-completed" style="font-size:12px">✓ Graded</span>
    } @else {
      <span class="sc-badge badge-in-progress" style="font-size:12px">⏳ Pending Review</span>
    }
  </div>

  @if (loading()) {
    <div style="display:flex;justify-content:center;padding:60px"><mat-spinner diameter="36"></mat-spinner></div>
  } @else if (detail()) {

    <!-- Candidate summary card -->
    <div class="sc-card" style="padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div class="sc-avatar sc-avatar-lg" [style.background]="avColor(detail()!.candidateName)">
        {{detail()!.candidateName.charAt(0)}}
      </div>
      <div style="flex:1;min-width:160px">
        <p style="font-size:16px;font-weight:700;color:var(--text-primary)">{{detail()!.candidateName}}</p>
        <p style="font-size:12px;color:var(--text-muted)">{{detail()!.candidateRole.replace('_',' ')}} · {{detail()!.candidateEmail}}</p>
      </div>
      <div style="text-align:center">
        <p style="font-size:22px;font-weight:800;color:var(--text-primary)">{{totalAwarded()}}<span style="font-size:14px;color:var(--text-muted)">/{{detail()!.totalMarks}}</span></p>
        <p style="font-size:11px;color:var(--text-muted)">Current Total</p>
      </div>
      @if (detail()!.violations > 0) {
        <span class="sc-badge badge-rejected" style="font-size:11px">{{detail()!.violations}} violation{{detail()!.violations!==1?'s':''}}</span>
      }
    </div>

    <!-- Per-question review -->
    <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px">
      @for (q of detail()!.questions; track q.questionId; let qi=$index) {
        <div class="sc-card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;background:var(--page-bg);border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px">
            <div style="width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff" [style.background]="qColor(q.type)">{{qi+1}}</div>
            <span class="sc-badge" [class]="qBadge(q.type)" style="font-size:10px">{{q.type}}</span>
            <span style="flex:1"></span>
            <span style="font-size:12px;color:var(--text-muted)">Max: {{q.marks}}</span>
          </div>

          <div style="padding:16px">
            <p style="font-size:14px;color:var(--text-primary);line-height:1.6;margin-bottom:14px;white-space:pre-wrap">{{q.text}}</p>

            <!-- MCQ: show all options, highlight correct + candidate's pick -->
            @if (q.type === 'MCQ') {
              <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
                @for (opt of q.options; track opt.id) {
                  <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1.5px solid"
                       [style.border-color]="opt.isCorrect ? '#10b981' : (opt.id===q.candidateAnswer?.mcqOptionId ? '#ef4444' : 'var(--border-color)')"
                       [style.background]="opt.isCorrect ? '#f0fdf4' : (opt.id===q.candidateAnswer?.mcqOptionId ? '#fef2f2' : 'transparent')">
                    <mat-icon style="font-size:16px" [style.color]="opt.isCorrect ? '#16a34a' : (opt.id===q.candidateAnswer?.mcqOptionId ? '#dc2626' : 'var(--text-muted)')">
                      {{opt.isCorrect ? 'check_circle' : (opt.id===q.candidateAnswer?.mcqOptionId ? 'cancel' : 'radio_button_unchecked')}}
                    </mat-icon>
                    <span style="font-size:13px;color:var(--text-primary)">{{opt.text}}</span>
                    @if (opt.isCorrect) { <span style="font-size:11px;color:#16a34a;font-weight:600;margin-left:auto">Correct Answer</span> }
                    @else if (opt.id===q.candidateAnswer?.mcqOptionId) { <span style="font-size:11px;color:#dc2626;font-weight:600;margin-left:auto">Candidate's Answer</span> }
                  </div>
                }
                @if (!q.candidateAnswer?.mcqOptionId) {
                  <p style="font-size:12px;color:var(--text-muted);font-style:italic">No answer selected</p>
                }
              </div>
            }

            <!-- SHORT / LONG: candidate text vs model answer -->
            @if (q.type === 'SHORT' || q.type === 'LONG') {
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <div>
                  <p class="sc-label" style="margin-bottom:6px">Candidate's Answer</p>
                  <div style="padding:10px 12px;background:var(--hover-bg);border-radius:8px;font-size:13px;color:var(--text-primary);min-height:60px;white-space:pre-wrap">
                    {{q.candidateAnswer?.textAnswer || '(No answer provided)'}}
                  </div>
                </div>
                @if (q.expectedAnswer) {
                  <div>
                    <p class="sc-label" style="margin-bottom:6px">Model Answer</p>
                    <div style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#166534;min-height:60px;white-space:pre-wrap">
                      {{q.expectedAnswer}}
                    </div>
                  </div>
                }
              </div>
            }

            <!-- CODING: candidate code vs reference solution -->
            @if (q.type === 'CODING') {
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
                <div>
                  <p class="sc-label" style="margin-bottom:6px">Candidate's Code</p>
                  <pre style="padding:10px 12px;background:#0a0f1e;border-radius:8px;font-size:12px;color:#e2e8f0;min-height:80px;white-space:pre-wrap;font-family:'DM Mono',monospace;overflow-x:auto">{{q.candidateAnswer?.codeAnswer || '(No code submitted)'}}</pre>
                </div>
                @if (q.expectedAnswer) {
                  <div>
                    <p class="sc-label" style="margin-bottom:6px">Reference Solution</p>
                    <pre style="padding:10px 12px;background:#0a0f1e;border:1px solid #166534;border-radius:8px;font-size:12px;color:#bbf7d0;min-height:80px;white-space:pre-wrap;font-family:'DM Mono',monospace;overflow-x:auto">{{q.expectedAnswer}}</pre>
                  </div>
                }
              </div>
              @if (q.testCases) {
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Test cases: <code style="background:var(--hover-bg);padding:2px 6px;border-radius:4px">{{q.testCases}}</code></p>
              }
            }

            <!-- Marks input + feedback -->
            <div style="display:flex;gap:10px;align-items:flex-end;padding-top:12px;border-top:1px solid var(--border-color)">
              <div class="sc-field" style="width:100px">
                <label class="sc-label">Marks Awarded</label>
                <input type="number" class="sc-input" [min]="0" [max]="q.marks" step="0.5"
                       [ngModel]="marksMap()[q.questionId] ?? 0"
                       (ngModelChange)="setMarks(q.questionId, $event)"
                       [disabled]="detail()!.status==='GRADED' && !editing()">
              </div>
              <span style="font-size:13px;color:var(--text-muted);padding-bottom:10px">/ {{q.marks}}</span>
              <div class="sc-field" style="flex:1">
                <label class="sc-label">Remarks (optional)</label>
                <input class="sc-input" placeholder="e.g. Partially correct, missing edge case…"
                       [ngModel]="feedbackMap()[q.questionId] ?? ''"
                       (ngModelChange)="setFeedback(q.questionId, $event)"
                       [disabled]="detail()!.status==='GRADED' && !editing()">
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Overall feedback + submit -->
    <div class="sc-card" style="padding:18px 20px">
      <div class="sc-field" style="margin-bottom:14px">
        <label class="sc-label">Overall Feedback (visible to candidate)</label>
        <textarea class="sc-textarea" rows="3" placeholder="Summarize the candidate's performance…"
                  [ngModel]="overallFeedback()" (ngModelChange)="overallFeedback.set($event)"
                  [disabled]="detail()!.status==='GRADED' && !editing()"></textarea>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <p style="font-size:13px;color:var(--text-muted)">
            Total: <strong style="color:var(--text-primary)">{{totalAwarded()}}/{{detail()!.totalMarks}}</strong>
            · Passing: {{detail()!.passingMarks}}
            · Result:
            <strong [style.color]="totalAwarded() >= detail()!.passingMarks ? '#16a34a' : '#dc2626'">
              {{totalAwarded() >= detail()!.passingMarks ? 'PASS' : 'FAIL'}}
            </strong>
          </p>
          @if (detail()!.status==='GRADED' && detail()!.gradedBy) {
            <p style="font-size:12px;color:var(--text-muted);margin-top:3px">Graded by {{detail()!.gradedBy}} on {{fmtDate(detail()!.gradedAt)}}</p>
          }
        </div>
        <div style="display:flex;gap:8px">
          @if (detail()!.status==='GRADED' && !editing()) {
            <button class="sc-btn sc-btn-secondary" (click)="editing.set(true)">
              <mat-icon style="font-size:18px">edit</mat-icon> Edit Grade
            </button>
          } @else {
            <button class="sc-btn sc-btn-primary" (click)="submitGrade()" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon style="font-size:18px">check_circle</mat-icon> }
              {{detail()!.status==='GRADED' ? 'Save Changes' : 'Finalize Grade'}}
            </button>
          }
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [":host{display:block}"]
})
export class ExamGradeComponent implements OnInit {
  examId = signal("");
  detail = signal<AttemptDetail | null>(null);
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);

  marksMap = signal<Record<string, number>>({});
  feedbackMap = signal<Record<string, string>>({});
  overallFeedback = signal("");

  totalAwarded = computed(() => Object.values(this.marksMap()).reduce((s, v) => s + (v || 0), 0));

  constructor(
    private http: HttpClient, private route: ActivatedRoute,
    private router: Router, private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get("id")!;
    const attemptId = this.route.snapshot.paramMap.get("attemptId")!;
    this.examId.set(examId);

    this.http.get<AttemptDetail>(`${environment.apiUrl}/exams/${examId}/attempts/${attemptId}`).subscribe({
      next: d => {
        this.detail.set(d);
        const marks: Record<string, number> = {};
        const feedback: Record<string, string> = {};
        d.questions.forEach(q => {
          marks[q.questionId] = q.awardedMarks ?? 0;
          if (q.questionFeedback) feedback[q.questionId] = q.questionFeedback;
        });
        this.marksMap.set(marks);
        this.feedbackMap.set(feedback);
        this.overallFeedback.set(d.instructorFeedback ?? "");
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open("Failed to load attempt", "", { duration: 3000 }); }
    });
  }

  setMarks(questionId: string, value: number): void {
    const q = this.detail()?.questions.find(q => q.questionId === questionId);
    const max = q?.marks ?? 0;
    const clamped = Math.max(0, Math.min(Number(value) || 0, max));
    this.marksMap.update(m => ({ ...m, [questionId]: clamped }));
  }

  setFeedback(questionId: string, value: string): void {
    this.feedbackMap.update(f => ({ ...f, [questionId]: value }));
  }

  submitGrade(): void {
    const d = this.detail();
    if (!d) return;
    this.saving.set(true);
    const payload = {
      questionScores: this.marksMap(),
      questionFeedback: this.feedbackMap(),
      instructorFeedback: this.overallFeedback()
    };
    this.http.put<any>(`${environment.apiUrl}/exams/${this.examId()}/attempts/${d.attemptId}/grade`, payload).subscribe({
      next: r => {
        this.saving.set(false);
        this.editing.set(false);
        this.detail.update(prev => prev ? { ...prev, status: "GRADED", score: r.score, passed: r.passed } : prev);
        this.snackBar.open("Grade submitted! The candidate has been notified.", "✓", { duration: 3500, panelClass: ["success-snackbar"] });
      },
      error: err => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.message ?? "Failed to save grade", "", { duration: 3000 });
      }
    });
  }

  fmtDate(d?: string): string {
    if (!d) return "";
    return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  }
  avColor(n: string): string {
    const c = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];
    let h = 0; for (const ch of n) h = ch.charCodeAt(0) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  }
  qColor(t: string): string { const m: Record<string,string> = {MCQ:"#6366f1",SHORT:"#3b82f6",LONG:"#10b981",CODING:"#f59e0b"}; return m[t] ?? "#6366f1"; }
  qBadge(t: string): string { const m: Record<string,string> = {MCQ:"badge-in-progress",SHORT:"badge-completed",LONG:"badge-pending",CODING:"badge-under-review"}; return m[t] ?? "badge-pending"; }
}
