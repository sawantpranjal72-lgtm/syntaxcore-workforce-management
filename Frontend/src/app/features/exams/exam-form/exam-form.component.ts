import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type QType = 'MCQ'|'SHORT'|'LONG'|'CODING';
interface Option   { id:string; text:string; isCorrect:boolean; }
interface Question { id:string; type:QType; text:string; marks:number; order:number; options:Option[]; expectedAnswer?:string; codeTemplate?:string; testCases?:string; }

@Component({
  selector: 'app-exam-form', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-4xl mx-auto fade-in">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <a routerLink="/exams" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none"><mat-icon>arrow_back</mat-icon></a>
    <div>
      <h1 style="font-size:1.35rem;font-weight:700;color:var(--text-primary)">{{isEdit()?'Edit Exam':'Create Exam'}}</h1>
      <p style="font-size:13px;color:var(--text-muted)">Build question paper with answers and marks</p>
    </div>
  </div>

  <div style="display:flex;gap:4px;margin-bottom:20px;background:var(--page-bg);border-radius:10px;padding:4px;border:1px solid var(--border-color)">
    @for (s of steps; track s.key) {
      <button (click)="step=s.key" style="flex:1;padding:8px 6px;border:none;cursor:pointer;border-radius:8px;font-size:12px;font-weight:600;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px"
              [style.background]="step===s.key?'var(--card-bg)':'transparent'"
              [style.color]="step===s.key?'var(--brand-600)':'var(--text-muted)'"
              [style.box-shadow]="step===s.key?'var(--shadow-sm)':'none'">
        <mat-icon style="font-size:15px">{{s.icon}}</mat-icon><span>{{s.label}}</span>
      </button>
    }
  </div>

  @if (step==='details') {
    <div class="sc-card" style="padding:0">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border-color)"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)">Exam Details</p></div>
      <form [formGroup]="form" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div class="sc-field"><label class="sc-label">Title *</label><input formControlName="title" class="sc-input" placeholder="e.g. JavaScript Fundamentals"></div>
        <div class="sc-field"><label class="sc-label">Description</label><textarea formControlName="description" class="sc-textarea" rows="2" placeholder="What this exam covers…"></textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="sc-field"><label class="sc-label">Subject</label><input formControlName="subject" class="sc-input" placeholder="e.g. JavaScript"></div>
          <div class="sc-field"><label class="sc-label">Duration (min) *</label><input formControlName="durationMinutes" type="number" min="5" class="sc-input"></div>
          <div class="sc-field"><label class="sc-label">Total Marks *</label><input formControlName="totalMarks" type="number" min="1" class="sc-input"></div>
          <div class="sc-field"><label class="sc-label">Passing Marks *</label><input formControlName="passingMarks" type="number" min="1" class="sc-input"></div>
          <div class="sc-field"><label class="sc-label">Start Time (IST)</label><input formControlName="startTime" type="datetime-local" class="sc-input"></div>
          <div class="sc-field"><label class="sc-label">End Time (IST)</label><input formControlName="endTime" type="datetime-local" class="sc-input"></div>
        </div>
        <div class="sc-field">
          <label class="sc-label">Target Roles</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            @for (r of roles; track r.value) {
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:8px;border:1.5px solid;transition:all .1s"
                     [style.border-color]="selRoles.includes(r.value)?'var(--brand-600)':'var(--border-color)'"
                     [style.background]="selRoles.includes(r.value)?'var(--brand-50)':'transparent'">
                <input type="checkbox" [checked]="selRoles.includes(r.value)" (change)="toggleRole(r.value)" style="width:14px;height:14px;accent-color:var(--brand-600)">
                <span style="font-size:13px;font-weight:500" [style.color]="selRoles.includes(r.value)?'var(--brand-700)':'var(--text-secondary)'">{{r.label}}</span>
              </label>
            }
          </div>
        </div>
        <button type="button" class="sc-btn sc-btn-primary" style="width:fit-content" (click)="step='questions'" [disabled]="form.invalid">Next: Questions <mat-icon style="font-size:18px">arrow_forward</mat-icon></button>
      </form>
    </div>
  }

  @if (step==='questions') {
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <p style="font-size:14px;font-weight:700;color:var(--text-primary)">{{qs().length}} questions · {{totalQMarks()}} marks</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          @for (qt of qTypes; track qt.type) {
            <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="addQ(qt.type)"><mat-icon style="font-size:15px">{{qt.icon}}</mat-icon> {{qt.label}}</button>
          }
        </div>
      </div>

      @for (q of qs(); track q.id; let qi=$index) {
        <div class="sc-card" style="padding:0;margin-bottom:10px;overflow:hidden">
          <div style="padding:10px 14px;background:var(--page-bg);border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px">
            <div style="width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff" [style.background]="qColor(q.type)">{{qi+1}}</div>
            <span class="sc-badge" [class]="qBadge(q.type)" style="font-size:10px">{{q.type}}</span>
            <p style="flex:1;font-size:13px;font-weight:600;color:var(--text-primary)" class="line-clamp-1">{{q.text||'(Untitled)'}}</p>
            <span style="font-size:12px;color:var(--text-muted)">{{q.marks}}m</span>
            <button (click)="rmQ(q.id)" style="background:none;border:none;cursor:pointer"><mat-icon style="font-size:16px;color:#dc2626">delete_outline</mat-icon></button>
          </div>
          <div style="padding:14px">
            <div style="display:grid;grid-template-columns:1fr 90px;gap:10px;margin-bottom:10px">
              <div class="sc-field"><label class="sc-label">Question *</label><textarea [(ngModel)]="q.text" class="sc-textarea" rows="2" placeholder="Enter question…"></textarea></div>
              <div class="sc-field"><label class="sc-label">Marks</label><input [(ngModel)]="q.marks" type="number" min="0.5" step="0.5" class="sc-input"></div>
            </div>
            @if (q.type==='MCQ') {
              <label class="sc-label" style="display:block;margin-bottom:8px">Options (mark the correct one) *</label>
              <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:8px">
                @for (opt of q.options; track opt.id; let oi=$index) {
                  <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:9px;border:1.5px solid"
                       [style.border-color]="opt.isCorrect?'#10b981':'var(--border-color)'"
                       [style.background]="opt.isCorrect?'#f0fdf4':'var(--hover-bg)'">
                    <span style="width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#e2e8f0;color:#475569">{{['A','B','C','D','E'][oi]}}</span>
                    <input [(ngModel)]="opt.text" class="sc-input" style="flex:1;height:34px;padding:0 10px" placeholder="Option {{['A','B','C','D'][oi]}}">
                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;font-size:12px;font-weight:600" [style.color]="opt.isCorrect?'#16a34a':'var(--text-muted)'">
                      <input type="radio" [name]="'cr_'+q.id" [checked]="opt.isCorrect" (change)="setCorrect(q,opt.id)" style="width:14px;height:14px;accent-color:#10b981"> Correct
                    </label>
                    <button (click)="rmOpt(q,opt.id)" style="background:none;border:none;cursor:pointer"><mat-icon style="font-size:15px;color:var(--text-muted)">close</mat-icon></button>
                  </div>
                }
              </div>
              <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="addOpt(q)"><mat-icon style="font-size:15px">add</mat-icon> Add Option</button>
            }
            @if (q.type==='SHORT'||q.type==='LONG') {
              <div class="sc-field"><label class="sc-label">Model Answer</label><textarea [(ngModel)]="q.expectedAnswer" class="sc-textarea" [rows]="q.type==='LONG'?4:2" placeholder="Model/expected answer for marking reference…"></textarea></div>
            }
            @if (q.type==='CODING') {
              <div style="display:flex;flex-direction:column;gap:10px">
                <div class="sc-field"><label class="sc-label">Starter Code</label><textarea [(ngModel)]="q.codeTemplate" class="sc-textarea" rows="4" style="font-family:'DM Mono',monospace;font-size:12px" placeholder="// Starter code for candidates"></textarea></div>
                <div class="sc-field"><label class="sc-label">Test Cases (JSON)</label><textarea [(ngModel)]="q.testCases" class="sc-textarea" rows="2" style="font-family:'DM Mono',monospace;font-size:12px" placeholder='[{"input":"5","expected":"25"}]'></textarea><p class="sc-hint">Array of input/expected pairs</p></div>
                <div class="sc-field"><label class="sc-label">Model Solution</label><textarea [(ngModel)]="q.expectedAnswer" class="sc-textarea" rows="4" style="font-family:'DM Mono',monospace;font-size:12px" placeholder="// Reference solution"></textarea></div>
              </div>
            }
          </div>
        </div>
      }

      @if (!qs().length) {
        <div style="padding:36px;text-align:center;background:var(--hover-bg);border-radius:14px;border:2px dashed var(--border-color)">
          <mat-icon style="font-size:40px;color:var(--border-color);display:block;margin:0 auto 8px">quiz</mat-icon>
          <p style="font-size:14px;font-weight:600;color:var(--text-muted)">Use the buttons above to add questions</p>
        </div>
      }
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="sc-btn sc-btn-secondary" (click)="step='details'"><mat-icon style="font-size:18px">arrow_back</mat-icon> Back</button>
        <button class="sc-btn sc-btn-primary" (click)="step='security'">Security & Publish <mat-icon style="font-size:18px">arrow_forward</mat-icon></button>
      </div>
    </div>
  }

  @if (step==='security') {
    <div class="sc-card" style="padding:0">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border-color)"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted)">Anti-Cheat & Publish</p></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">
        <div>
          <p style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:10px">🔒 Security Controls</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            @for (s of secSettings; track s.key) {
              <label style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:10px;border:1.5px solid;cursor:pointer;transition:all .1s"
                     [style.border-color]="sec[s.key]?'var(--brand-400)':'var(--border-color)'"
                     [style.background]="sec[s.key]?'var(--brand-50)':'transparent'">
                <input type="checkbox" [(ngModel)]="sec[s.key]" style="width:15px;height:15px;accent-color:var(--brand-600);margin-top:2px">
                <div>
                  <p style="font-size:13px;font-weight:600" [style.color]="sec[s.key]?'var(--brand-700)':'var(--text-primary)'">{{s.label}}</p>
                  <p style="font-size:12px;color:var(--text-muted);margin-top:2px">{{s.desc}}</p>
                </div>
              </label>
            }
          </div>
        </div>
        <div style="padding:14px;background:var(--hover-bg);border-radius:10px;border:1px solid var(--border-color)">
          <p style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">⚙️ Exam Options</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            @for (o of examOpts; track o.key) {
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" [(ngModel)]="opts[o.key]" style="width:14px;height:14px;accent-color:var(--brand-600)">
                <span style="font-size:13px;color:var(--text-primary)">{{o.label}}</span>
              </label>
            }
          </div>
        </div>
        @if (saveErr()) { <div class="sc-alert sc-alert-error"><mat-icon>error_outline</mat-icon><span>{{saveErr()}}</span></div> }
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="sc-btn sc-btn-secondary" (click)="save('DRAFT')" [disabled]="saving()">
            @if (saving()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon style="font-size:18px">save</mat-icon> } Save Draft
          </button>
          <button class="sc-btn sc-btn-primary" (click)="save('PUBLISHED')" [disabled]="saving()||!qs().length">
            @if (saving()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon style="font-size:18px">publish</mat-icon> } Publish Exam
          </button>
          <button class="sc-btn sc-btn-secondary" (click)="step='questions'"><mat-icon style="font-size:18px">arrow_back</mat-icon> Back</button>
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [':host{display:block}']
})
export class ExamFormComponent implements OnInit {
  form: FormGroup; qs = signal<Question[]>([]); saving = signal(false); saveErr = signal(''); isEdit = signal(false);
  step = 'details'; selRoles = ['EMPLOYEE','INTERN','STUDENT'];
  sec: Record<string,boolean> = { fullscreen:true, tabSwitch:true, copyPaste:true, rightClick:true, devTools:true, faceDetection:false };
  opts: Record<string,boolean> = { shuffleQuestions:true, shuffleOptions:true, showResult:true, allowReview:false, negativeMarking:false, autoSubmit:true };

  steps = [{key:'details',label:'Details',icon:'info'},{key:'questions',label:'Questions',icon:'quiz'},{key:'security',label:'Security',icon:'security'}];
  roles = [{value:'SUPER_ADMIN',label:'Super Admin'},{value:'ADMINISTRATOR',label:'Admin'},{value:'PROJECT_MANAGER',label:'PM'},{value:'HR_MANAGER',label:'HR'},{value:'EMPLOYEE',label:'Employee'},{value:'INTERN',label:'Intern'},{value:'STUDENT',label:'Student'}];
  qTypes = [{type:'MCQ' as QType,label:'MCQ',icon:'radio_button_checked'},{type:'SHORT' as QType,label:'Short Ans',icon:'short_text'},{type:'LONG' as QType,label:'Long Ans',icon:'subject'},{type:'CODING' as QType,label:'Coding',icon:'code'}];
  secSettings = [
    {key:'fullscreen',   label:'Force Fullscreen',       desc:'Exam opens fullscreen; exit records a violation'},
    {key:'tabSwitch',    label:'Block Tab Switching',    desc:'Records violation when candidate switches tabs/windows'},
    {key:'copyPaste',    label:'Disable Copy/Paste',     desc:'Prevents Ctrl+C/V/X during exam'},
    {key:'rightClick',   label:'Disable Right-Click',    desc:'Prevents context menu during exam'},
    {key:'devTools',     label:'Detect DevTools',        desc:'Alerts if developer tools are opened'},
    {key:'faceDetection',label:'Webcam Presence Check', desc:'Periodic snapshots to verify candidate presence (camera required)'},
  ];
  examOpts = [{key:'shuffleQuestions',label:'Shuffle question order'},{key:'shuffleOptions',label:'Shuffle MCQ options'},{key:'showResult',label:'Show result after submit'},{key:'allowReview',label:'Allow answer review'},{key:'negativeMarking',label:'Negative marking (-25%)'},{key:'autoSubmit',label:'Auto-submit on timeout'}];

  constructor(private fb:FormBuilder,private http:HttpClient,private router:Router,private route:ActivatedRoute,private snackBar:MatSnackBar) {
    this.form = this.fb.group({ title:['',Validators.required], description:[''], subject:[''], durationMinutes:[60,[Validators.required,Validators.min(5)]], totalMarks:[100,[Validators.required,Validators.min(1)]], passingMarks:[50,[Validators.required,Validators.min(1)]], startTime:[''], endTime:[''] });
  }
  ngOnInit(): void {
    const id=this.route.snapshot.paramMap.get('id');
    if(id&&this.route.snapshot.url.some(s=>s.path==='edit')) { this.isEdit.set(true); this.http.get<any>(`${environment.apiUrl}/exams/${id}`).subscribe({next:e=>{this.form.patchValue(e);this.qs.set(e.questions??[]);this.selRoles=e.targetRoles??['EMPLOYEE'];}}); }
  }
  toggleRole(r:string): void { const i=this.selRoles.indexOf(r); if(i>=0)this.selRoles.splice(i,1); else this.selRoles.push(r); }
  addQ(type:QType): void { this.qs.update(l=>[...l,{id:Date.now().toString(),type,text:'',marks:type==='MCQ'?2:type==='CODING'?10:5,order:l.length+1,options:type==='MCQ'?[{id:'a',text:'',isCorrect:false},{id:'b',text:'',isCorrect:false},{id:'c',text:'',isCorrect:false},{id:'d',text:'',isCorrect:false}]:[]}]); }
  rmQ(id:string): void { this.qs.update(l=>l.filter(q=>q.id!==id)); }
  addOpt(q:Question): void { q.options.push({id:Date.now().toString(),text:'',isCorrect:false}); this.qs.update(l=>[...l]); }
  rmOpt(q:Question,id:string): void { q.options=q.options.filter(o=>o.id!==id); this.qs.update(l=>[...l]); }
  setCorrect(q:Question,id:string): void { q.options.forEach(o=>o.isCorrect=o.id===id); this.qs.update(l=>[...l]); }
  totalQMarks(): number { return this.qs().reduce((s,q)=>s+q.marks,0); }
  save(status:'DRAFT'|'PUBLISHED'): void {
    if(this.form.invalid){this.form.markAllAsTouched();this.step='details';return;}
    if(status==='PUBLISHED'&&!this.qs().length){this.saveErr.set('Add at least one question before publishing');return;}
    this.saving.set(true);this.saveErr.set('');
    const id=this.route.snapshot.paramMap.get('id');
    const payload={...this.form.value,status,targetRoles:this.selRoles,questions:this.qs(),settings:{security:this.sec,options:this.opts}};
    const obs=(this.isEdit()&&id)?this.http.put(`${environment.apiUrl}/exams/${id}`,payload):this.http.post(`${environment.apiUrl}/exams`,payload);
    obs.subscribe({next:()=>{this.snackBar.open(`Exam ${status==='PUBLISHED'?'published':'saved'}!`,'✓',{duration:3000,panelClass:['success-snackbar']});this.router.navigate(['/exams']);},error:err=>{this.saveErr.set(err?.error?.message??'Save failed');this.saving.set(false);}});
  }
  qColor(t:QType):string{const m:Record<string,string>={MCQ:'#6366f1',SHORT:'#3b82f6',LONG:'#10b981',CODING:'#f59e0b'};return m[t]??'#6366f1';}
  qBadge(t:QType):string{const m:Record<string,string>={MCQ:'badge-in-progress',SHORT:'badge-completed',LONG:'badge-pending',CODING:'badge-under-review'};return m[t]??'badge-pending';}
}
