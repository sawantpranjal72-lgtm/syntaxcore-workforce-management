import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";

interface R { id:string; candidateName:string; candidateRole:string; status:string; score:number; totalMarks:number; passingMarks:number; passed:boolean; answeredCount:number; totalQuestions:number; violations:number; submittedAt:string; timeTaken:number; }

@Component({ selector:"app-exam-results", standalone:true,
  imports:[CommonModule,RouterLink,FormsModule,MatIconModule,MatProgressSpinnerModule],
  template:`
<div class="p-4 sm:p-6 max-w-5xl mx-auto fade-in">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:12px">
      <a routerLink="/exams" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none"><mat-icon>arrow_back</mat-icon></a>
      <div><h1 style="font-size:1.35rem;font-weight:700;color:var(--text-primary)">Exam Results</h1><p style="font-size:13px;color:var(--text-muted)">{{title()}}</p></div>
    </div>
    <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="csv()"><mat-icon style="font-size:16px">download</mat-icon> Export CSV</button>
  </div>

  @if (loading()) { <div style="display:flex;justify-content:center;padding:60px"><mat-spinner diameter="36"></mat-spinner></div>
  } @else {
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      @for (s of stats(); track s.label) {
        <div class="sc-card" style="padding:16px 18px">
          <p style="font-size:22px;font-weight:800;color:var(--text-primary)">{{s.v}}</p>
          <p style="font-size:12px;color:var(--text-muted);margin-top:3px">{{s.label}}</p>
          @if (s.sub) { <p style="font-size:11px;margin-top:2px" [style.color]="s.c??'var(--text-muted)'">{{s.sub}}</p> }
        </div>
      }
    </div>

    <div class="sc-filter-bar">
      <div class="sc-filter-search" style="flex:1;max-width:220px"><mat-icon>search</mat-icon><input [(ngModel)]="q" placeholder="Search name…" (input)="apply()"></div>
      <div class="sc-filter-item"><span class="sc-filter-label">Result</span>
        <select class="sc-filter-select" [(ngModel)]="fr" (change)="apply()"><option value="">All</option><option value="pending">Pending Review</option><option value="passed">Passed</option><option value="failed">Failed</option></select>
      </div>
      <div class="sc-filter-item"><span class="sc-filter-label">Sort</span>
        <select class="sc-filter-select" [(ngModel)]="sort" (change)="apply()">
          <option value="desc">Score High→Low</option><option value="asc">Score Low→High</option>
          <option value="name">Name A–Z</option><option value="time">Latest First</option>
        </select>
      </div>
    </div>

    <div class="sc-table-wrap">
      <table class="sc-table">
        <thead><tr><th>#</th><th>Candidate</th><th>Status</th><th>Score</th><th>%</th><th>Result</th><th>Answered</th><th>Violations</th><th>Submitted</th><th></th></tr></thead>
        <tbody>
          @for (r of filtered(); track r.id; let i=$index) {
            <tr>
              <td style="color:var(--text-muted);font-weight:600">{{i+1}}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="sc-avatar sc-avatar-sm" [style.background]="avColor(r.candidateName)">{{r.candidateName.charAt(0)}}</div>
                  <div>
                    <p style="font-weight:600;font-size:13px;color:var(--text-primary)">{{r.candidateName}}</p>
                    <p style="font-size:11px;color:var(--text-muted)">{{r.candidateRole.replace("_"," ")}}</p>
                  </div>
                </div>
              </td>
              <td>
                @if (r.status==='GRADED') { <span class="sc-badge badge-completed" style="font-size:11px">✓ Graded</span> }
                @else { <span class="sc-badge badge-in-progress" style="font-size:11px">⏳ Pending Review</span> }
              </td>
              <td>
                @if (r.status==='GRADED') {
                  <span style="font-size:15px;font-weight:800" [style.color]="r.passed?'#16a34a':'#dc2626'">{{r.score}}</span><span style="font-size:12px;color:var(--text-muted)"> /{{r.totalMarks}}</span>
                } @else {
                  <span style="font-size:12px;color:var(--text-muted);font-style:italic">Not graded</span>
                }
              </td>
              <td>
                @if (r.status==='GRADED') {
                  <div style="display:flex;align-items:center;gap:6px">
                    <div style="flex:1;height:5px;background:var(--border-color);border-radius:99px;overflow:hidden;min-width:44px">
                      <div style="height:100%;border-radius:99px" [style.width]="(r.score/r.totalMarks*100)+'%'" [style.background]="r.passed?'#10b981':'#ef4444'"></div>
                    </div>
                    <span style="font-size:12px;font-weight:600;min-width:32px" [style.color]="r.passed?'#16a34a':'#dc2626'">{{(r.score/r.totalMarks*100).toFixed(0)}}%</span>
                  </div>
                } @else { <span style="font-size:12px;color:var(--text-muted)">—</span> }
              </td>
              <td>
                @if (r.status==='GRADED') {
                  <span class="sc-badge" [class]="r.passed?'badge-completed':'badge-rejected'" style="font-size:11px">{{r.passed?"✅ Passed":"❌ Failed"}}</span>
                } @else { <span style="font-size:12px;color:var(--text-muted)">—</span> }
              </td>
              <td style="font-size:13px">{{r.answeredCount}}/{{r.totalQuestions}}</td>
              <td>
                @if (r.violations>0) { <span class="sc-badge badge-rejected" style="font-size:11px">{{r.violations}}</span> }
                @else { <span style="font-size:13px;color:#16a34a;font-weight:600">0</span> }
              </td>
              <td style="font-size:12px;color:var(--text-muted)">{{fmtDate(r.submittedAt)}}</td>
              <td>
                <a [routerLink]="['/exams', examId(), 'attempts', r.id]" class="sc-btn sc-btn-sm" [class]="r.status==='GRADED' ? 'sc-btn-secondary' : 'sc-btn-primary'" style="text-decoration:none;white-space:nowrap">
                  <mat-icon style="font-size:14px">{{r.status==='GRADED' ? 'visibility' : 'rate_review'}}</mat-icon>
                  {{r.status==='GRADED' ? 'View' : 'Grade'}}
                </a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (!filtered().length) { <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">No results match filters</div> }
  }
</div>`,
  styles:[":host{display:block}"]
})
export class ExamResultsComponent implements OnInit {
  examId=signal("");
  all=signal<R[]>([]); filtered=signal<R[]>([]); loading=signal(true); title=signal(""); q=""; fr=""; sort="desc";
  stats=computed(()=>{
    const r=this.all(); if(!r.length)return[];
    const graded=r.filter(x=>x.status==='GRADED');
    const pending=r.length-graded.length;
    const p=graded.filter(x=>x.passed).length;
    const avg=graded.length ? graded.reduce((s,x)=>s+x.score,0)/graded.length : 0;
    return[
      {label:"Total Attempts",v:r.length,sub:pending>0?pending+" pending review":undefined,c:pending>0?"#f59e0b":undefined},
      {label:"Pass Rate",v:graded.length?p+"/"+graded.length:"—",sub:graded.length?((p/graded.length)*100).toFixed(0)+"% of graded":"No graded attempts yet",c:graded.length&&p/graded.length>=.5?"#16a34a":undefined},
      {label:"Avg Score",v:graded.length?avg.toFixed(1):"—",sub:graded.length?"out of "+r[0]?.totalMarks:undefined,c:undefined},
      {label:"Highest",v:graded.length?Math.max(...graded.map(x=>x.score)):"—",sub:graded.length?"Avg violations: "+(r.reduce((s,x)=>s+x.violations,0)/r.length).toFixed(1):undefined,c:undefined},
    ];
  });
  constructor(private http:HttpClient,private route:ActivatedRoute){}
  ngOnInit():void{
    const id=this.route.snapshot.paramMap.get("id")!;
    this.examId.set(id);
    this.http.get<{title:string;results:R[]}>(`${environment.apiUrl}/exams/${id}/results`).subscribe({
      next:r=>{this.title.set(r.title);this.all.set(r.results);this.apply();this.loading.set(false);},
      error:()=>{this.title.set("JavaScript Fundamentals");this.all.set(this.mock());this.apply();this.loading.set(false);}
    });
  }
  apply():void{
    let list=[...this.all()];
    if(this.fr==="passed")list=list.filter(r=>r.status==='GRADED'&&r.passed);
    if(this.fr==="failed")list=list.filter(r=>r.status==='GRADED'&&!r.passed);
    if(this.fr==="pending")list=list.filter(r=>r.status!=='GRADED');
    if(this.q.trim()){const q=this.q.toLowerCase();list=list.filter(r=>r.candidateName.toLowerCase().includes(q));}
    switch(this.sort){case"desc":list.sort((a,b)=>b.score-a.score);break;case"asc":list.sort((a,b)=>a.score-b.score);break;case"name":list.sort((a,b)=>a.candidateName.localeCompare(b.candidateName));break;case"time":list.sort((a,b)=>new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime());break;}
    this.filtered.set(list);
  }
  csv():void{
    const rows=[["Name","Role","Status","Score","Total","%","Result","Answered","Violations","Submitted"]];
    this.filtered().forEach(r=>rows.push([
      r.candidateName,r.candidateRole,
      r.status==='GRADED'?'Graded':'Pending Review',
      r.status==='GRADED'?r.score.toString():'—',
      r.totalMarks.toString(),
      r.status==='GRADED'?(r.score/r.totalMarks*100).toFixed(1)+"%":'—',
      r.status==='GRADED'?(r.passed?"PASSED":"FAILED"):'—',
      r.answeredCount+"/"+r.totalQuestions,r.violations.toString(),this.fmtDate(r.submittedAt)
    ]));
    const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${this.title()}-results.csv`;a.click();
  }
  fmtDate(d:string):string{return new Date(d).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:true});}
  fmtDur(s:number):string{const m=Math.floor(s/60);return `${m}m ${s%60}s`;}
  avColor(n:string):string{const c=["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];let h=0;for(const ch of n)h=ch.charCodeAt(0)+((h<<5)-h);return c[Math.abs(h)%c.length];}
  mock():R[]{return[
    {id:"1",candidateName:"Arjun Mehta",candidateRole:"EMPLOYEE",status:"GRADED",score:16,totalMarks:20,passingMarks:10,passed:true,answeredCount:5,totalQuestions:5,violations:0,submittedAt:"2026-06-10T11:32:00",timeTaken:1820},
    {id:"2",candidateName:"Priya Singh",candidateRole:"EMPLOYEE",status:"SUBMITTED",score:6,totalMarks:20,passingMarks:10,passed:false,answeredCount:5,totalQuestions:5,violations:1,submittedAt:"2026-06-10T11:41:00",timeTaken:2340},
    {id:"3",candidateName:"Dev Gupta",candidateRole:"INTERN",status:"GRADED",score:8,totalMarks:20,passingMarks:10,passed:false,answeredCount:4,totalQuestions:5,violations:2,submittedAt:"2026-06-10T11:55:00",timeTaken:2680},
    {id:"4",candidateName:"Rahul Sharma",candidateRole:"STUDENT",status:"SUBMITTED",score:8,totalMarks:20,passingMarks:10,passed:false,answeredCount:5,totalQuestions:5,violations:0,submittedAt:"2026-06-10T11:28:00",timeTaken:1580},
    {id:"5",candidateName:"Mita Joshi",candidateRole:"EMPLOYEE",status:"GRADED",score:11,totalMarks:20,passingMarks:10,passed:true,answeredCount:5,totalQuestions:5,violations:0,submittedAt:"2026-06-10T11:47:00",timeTaken:2100},
  ];}
}
