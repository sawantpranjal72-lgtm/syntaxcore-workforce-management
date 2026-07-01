import { Component, OnInit, OnDestroy, signal, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";

type QType = "MCQ"|"SHORT"|"LONG"|"CODING";
interface Option   { id:string; text:string; }
interface Question { id:string; type:QType; text:string; marks:number; options:Option[]; }
interface Exam     { id:string; title:string; subject?:string; durationMinutes:number; totalMarks:number; passingMarks:number; questions:Question[]; settings:{security:Record<string,boolean>;options:Record<string,boolean>;}; }
interface Answer   { questionId:string; mcqOptionId?:string; textAnswer?:string; codeAnswer?:string; }

@Component({ selector:"app-exam-take", standalone:true,
  imports:[CommonModule,FormsModule,MatIconModule,MatProgressSpinnerModule],
  template:`
<!-- INSTRUCTIONS -->
@if (phase()==="instructions") {
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a,#1e293b);padding:20px">
    <div style="width:100%;max-width:540px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:60px;height:60px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
          <mat-icon style="font-size:30px;color:#fff">quiz</mat-icon>
        </div>
        <h1 style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:4px">{{exam()?.title}}</h1>
        @if (exam()?.subject) { <p style="font-size:13px;color:#94a3b8">{{exam()!.subject}}</p> }
      </div>
      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;margin-bottom:18px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
          @for (s of examStats(); track s.label) {
            <div style="text-align:center;padding:12px 8px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.08)">
              <mat-icon [style.color]="s.color" style="font-size:20px;display:block;margin:0 auto 4px">{{s.icon}}</mat-icon>
              <p style="font-size:17px;font-weight:800;color:#fff">{{s.value}}</p>
              <p style="font-size:10px;color:#94a3b8">{{s.label}}</p>
            </div>
          }
        </div>
        @if (activeWarnings().length) {
          <div style="background:#1e1a2e;border:1px solid #4f3f8a;border-radius:10px;padding:14px;margin-bottom:14px">
            <p style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:8px;display:flex;align-items:center;gap:5px">
              <mat-icon style="font-size:15px">security</mat-icon>Anti-Cheat Active
            </p>
            @for (w of activeWarnings(); track w) {
              <p style="font-size:11px;color:#c4b5fd;margin-bottom:4px;display:flex;align-items:flex-start;gap:5px">
                <mat-icon style="font-size:12px;color:#7c3aed;flex-shrink:0;margin-top:1px">shield</mat-icon>{{w}}
              </p>
            }
          </div>
        }
        @for (inst of instructions; track inst) {
          <p style="font-size:12px;color:#cbd5e1;margin-bottom:6px;display:flex;align-items:flex-start;gap:7px">
            <mat-icon style="font-size:13px;color:#60a5fa;flex-shrink:0;margin-top:1px">info</mat-icon>{{inst}}
          </p>
        }
      </div>
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:14px;padding:11px 14px;background:rgba(255,255,255,.04);border-radius:10px;border:1px solid rgba(255,255,255,.1)">
        <input type="checkbox" [(ngModel)]="agreed" style="width:17px;height:17px;accent-color:#6366f1">
        <span style="font-size:13px;color:#e2e8f0">I understand the exam rules and academic integrity policy</span>
      </label>
      <button (click)="startExam()" [disabled]="!agreed||loading()"
              style="width:100%;height:50px;border-radius:12px;border:none;font-size:15px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer"
              [style.background]="agreed?'linear-gradient(135deg,#6366f1,#4f46e5)':'#334155'">
        @if (loading()) { <mat-spinner diameter="20"></mat-spinner> Loading… }
        @else { <mat-icon style="font-size:22px">play_circle_filled</mat-icon>Start Exam }
      </button>
    </div>
  </div>
}

<!-- EXAM -->
@if (phase()==="exam") {
  <div style="min-height:100vh;background:#0f172a;display:flex;flex-direction:column">
    <!-- Top bar -->
    <div style="background:#1e293b;border-bottom:1px solid #334155;padding:0 16px;height:58px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:100;flex-shrink:0">
      <div style="flex:1;min-width:0">
        <p style="font-size:13px;font-weight:700;color:#f1f5f9" class="line-clamp-1">{{exam()!.title}}</p>
        <p style="font-size:10px;color:#64748b">Q{{qi()+1}} of {{exam()!.questions.length}}</p>
      </div>
      <!-- Timer -->
      <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9px;flex-shrink:0;border:2px solid"
           [style.background]="timer()<300?'#7f1d1d':timer()<600?'#78350f':'#0f172a'"
           [style.border-color]="timer()<300?'#dc2626':timer()<600?'#f59e0b':'#334155'">
        <mat-icon [style.color]="timer()<300?'#f87171':timer()<600?'#fbbf24':'#94a3b8'" style="font-size:17px">alarm</mat-icon>
        <span style="font-size:17px;font-weight:800;font-variant-numeric:tabular-nums" [style.color]="timer()<300?'#fca5a5':timer()<600?'#fcd34d':'#e2e8f0'">{{fmt(timer())}}</span>
      </div>
      @if (viols()>0) {
        <div style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:#7f1d1d;border:1px solid #dc2626;border-radius:7px;flex-shrink:0">
          <mat-icon style="font-size:14px;color:#f87171">warning</mat-icon>
          <span style="font-size:11px;font-weight:700;color:#fca5a5">{{viols()}} violation{{viols()!==1?"s":""}}</span>
        </div>
      }
      <div style="text-align:right;flex-shrink:0">
        <p style="font-size:10px;color:#64748b">Answered</p>
        <p style="font-size:13px;font-weight:700;color:#e2e8f0">{{answeredCount()}}/{{exam()!.questions.length}}</p>
      </div>
    </div>
    <!-- Progress -->
    <div style="height:3px;background:#334155;flex-shrink:0">
      <div style="height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);transition:width .3s" [style.width]="(answeredCount()/exam()!.questions.length*100)+'%'"></div>
    </div>
    <div style="display:flex;flex:1;min-height:0;overflow:hidden">
      <!-- Navigator -->
      <div style="width:180px;flex-shrink:0;background:#0f172a;border-right:1px solid #1e293b;overflow-y:auto;padding:12px 8px">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-bottom:8px;padding:0 4px">Questions</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
          @for (q of exam()!.questions; track q.id; let i=$index) {
            <button (click)="qi.set(i)" style="width:34px;height:34px;border-radius:7px;border:none;cursor:pointer;font-size:11px;font-weight:700;transition:all .1s"
                    [style.background]="i===qi()?'#6366f1':hasAns(q.id)?'#16a34a':'#1e293b'"
                    [style.color]="i===qi()||hasAns(q.id)?'#fff':'#94a3b8'">{{i+1}}</button>
          }
        </div>
        <div style="margin-top:12px;padding:8px;background:#1e293b;border-radius:7px;font-size:10px;color:#94a3b8;display:flex;flex-direction:column;gap:4px">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:2px;background:#16a34a;flex-shrink:0"></span>Answered</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:2px;background:#6366f1;flex-shrink:0"></span>Current</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;border-radius:2px;background:#1e293b;border:1px solid #475569;flex-shrink:0"></span>Pending</span>
        </div>
      </div>
      <!-- Content -->
      <div style="flex:1;overflow-y:auto;padding:20px">
        @if (curQ()) {
          <div style="max-width:740px;margin:0 auto">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <div style="padding:5px 11px;border-radius:7px;font-size:10px;font-weight:800;color:#fff;letter-spacing:.04em" [style.background]="qColor(curQ()!.type)">Q{{qi()+1}} · {{curQ()!.type}}</div>
              <div style="background:#1e293b;border:1px solid #334155;border-radius:7px;padding:4px 10px"><span style="font-size:11px;font-weight:700;color:#94a3b8">{{curQ()!.marks}} mark{{curQ()!.marks!==1?"s":""}}</span></div>
            </div>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px 20px;margin-bottom:18px">
              <p style="font-size:15px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap">{{curQ()!.text}}</p>
            </div>
            @if (curQ()!.type==="MCQ") {
              <div style="display:flex;flex-direction:column;gap:9px">
                @for (opt of curQ()!.options; track opt.id; let oi=$index) {
                  <label style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-radius:11px;cursor:pointer;transition:all .15s;border:2px solid"
                         [style.border-color]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'#6366f1':'#334155'"
                         [style.background]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'rgba(99,102,241,.15)':'#1e293b'"
                         (click)="selMCQ(curQ()!.id,opt.id)">
                    <div style="width:32px;height:32px;border-radius:50%;border:2px solid;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;transition:all .15s"
                         [style.border-color]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'#6366f1':'#475569'"
                         [style.background]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'#6366f1':'transparent'"
                         [style.color]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'#fff':'#94a3b8'">{{["A","B","C","D","E"][oi]}}</div>
                    <span style="font-size:14px;line-height:1.5" [style.color]="getAns(curQ()!.id)?.mcqOptionId===opt.id?'#e2e8f0':'#cbd5e1'">{{opt.text}}</span>
                  </label>
                }
              </div>
            }
            @if (curQ()!.type==="SHORT"||curQ()!.type==="LONG") {
              <div>
                <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:7px">Your Answer</p>
                <textarea [rows]="curQ()!.type==='LONG'?8:3" [value]="getAns(curQ()!.id)?.textAnswer||''"
                          (input)="setTxt(curQ()!.id,$any($event.target).value)" placeholder="Type your answer here…"
                          style="width:100%;background:#1e293b;border:2px solid #334155;border-radius:11px;padding:13px 15px;font-size:14px;color:#e2e8f0;outline:none;resize:vertical;line-height:1.6;font-family:'DM Sans',sans-serif;transition:border-color .15s;box-sizing:border-box"
                          onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#334155'"></textarea>
              </div>
            }
            @if (curQ()!.type==="CODING") {
              <div>
                <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:7px">Your Code</p>
                <textarea [rows]="13" [value]="getAns(curQ()!.id)?.codeAnswer||''"
                          (input)="setCode(curQ()!.id,$any($event.target).value)" placeholder="// Write your solution here"
                          style="width:100%;background:#0a0f1e;border:2px solid #334155;border-radius:11px;padding:14px;font-size:12px;color:#e2e8f0;outline:none;resize:vertical;line-height:1.6;font-family:'DM Mono',monospace;transition:border-color .15s;box-sizing:border-box"
                          onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#334155'"></textarea>
              </div>
            }
            <!-- Nav buttons -->
            <div style="display:flex;justify-content:space-between;margin-top:20px;gap:8px">
              <button (click)="qi.set(qi()-1)" [disabled]="qi()===0" style="padding:10px 20px;border-radius:9px;border:2px solid #334155;background:#1e293b;color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .15s" onmouseenter="this.style.borderColor='#6366f1'" onmouseleave="this.style.borderColor='#334155'">
                <mat-icon style="font-size:17px">arrow_back</mat-icon>Previous
              </button>
              @if (qi()<exam()!.questions.length-1) {
                <button (click)="qi.set(qi()+1)" style="padding:10px 20px;border-radius:9px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px">
                  Next<mat-icon style="font-size:17px">arrow_forward</mat-icon>
                </button>
              } @else {
                <button (click)="phase.set('confirm')" style="padding:10px 20px;border-radius:9px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:17px">check_circle</mat-icon>Submit Exam
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  </div>
}

<!-- CONFIRM -->
@if (phase()==="confirm") {
  <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="max-width:420px;width:100%;background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px;text-align:center">
      <mat-icon style="font-size:46px;color:#f59e0b;display:block;margin:0 auto 14px">warning_amber</mat-icon>
      <h2 style="font-size:1.2rem;font-weight:800;color:#f1f5f9;margin-bottom:8px">Submit Exam?</h2>
      <p style="font-size:13px;color:#94a3b8;margin-bottom:20px;line-height:1.6">
        Answered <strong style="color:#e2e8f0">{{answeredCount()}}</strong> of <strong style="color:#e2e8f0">{{exam()!.questions.length}}</strong> questions.
        @if (exam()!.questions.length-answeredCount()>0) { <span style="color:#fbbf24"><br>{{exam()!.questions.length-answeredCount()}} unanswered.</span> }
        <br>This cannot be undone.
      </p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button (click)="phase.set('exam')" style="padding:10px 20px;border-radius:9px;border:2px solid #334155;background:transparent;color:#e2e8f0;font-size:13px;font-weight:600;cursor:pointer">Continue</button>
        <button (click)="submitExam()" [disabled]="submitting()" style="padding:10px 20px;border-radius:9px;border:none;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
          @if (submitting()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon style="font-size:16px">check_circle</mat-icon> } Yes, Submit
        </button>
      </div>
    </div>
  </div>
}

<!-- RESULT -->
@if (phase()==="result") {
  <div style="min-height:100vh;background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;align-items:center;justify-content:center;padding:20px">
    <div style="max-width:480px;width:100%;text-align:center">
      <div style="width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;background:linear-gradient(135deg,#6366f1,#4f46e5)">
        <mat-icon style="font-size:38px;color:#fff">task_alt</mat-icon>
      </div>
      <h1 style="font-size:1.6rem;font-weight:800;color:#f1f5f9;margin-bottom:5px">Exam Submitted</h1>
      <p style="font-size:14px;margin-bottom:24px;color:#94a3b8;line-height:1.6">
        Your answers have been recorded and are awaiting review by the instructor.
        You'll be notified as soon as your result is ready.
      </p>
      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;margin-bottom:20px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          @for (s of resultStats(); track s.label) {
            <div style="background:rgba(255,255,255,.04);border-radius:9px;padding:12px">
              <p style="font-size:10px;color:#64748b;margin-bottom:3px">{{s.label}}</p>
              <p style="font-size:18px;font-weight:800" [style.color]="s.color??'#fff'">{{s.value}}</p>
            </div>
          }
        </div>
        <div style="margin-top:16px;padding:12px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:9px;display:flex;align-items:center;gap:8px">
          <mat-icon style="font-size:16px;color:#a5b4fc;flex-shrink:0">hourglass_top</mat-icon>
          <span style="font-size:12px;color:#c7d2fe;text-align:left">Pending instructor review — your score and pass/fail result will appear here once grading is complete.</span>
        </div>
      </div>
      <button (click)="router.navigate(['/exams'])" style="padding:12px 32px;border-radius:11px;border:none;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:14px;font-weight:700;cursor:pointer">Back to Exams</button>
    </div>
  </div>
}`,
  styles:[":host{display:block;height:100vh}"]
})
export class ExamTakeComponent implements OnInit, OnDestroy {
  exam=signal<Exam|null>(null); loading=signal(true); submitting=signal(false);
  phase=signal<"instructions"|"exam"|"confirm"|"result">("instructions");
  result=signal<{answeredCount:number}|null>(null);
  answers=signal<Answer[]>([]); qi=signal(0); timer=signal(0); viols=signal(0);
  agreed=false;
  private _tmr:any; private _dtI:any;

  curQ=()=>this.exam()?.questions[this.qi()]??null;
  answeredCount=()=>this.answers().length;
  examStats=()=>{const e=this.exam();if(!e)return[];return[{label:"Questions",value:e.questions.length,icon:"quiz",color:"#818cf8"},{label:"Duration",value:e.durationMinutes+"m",icon:"timer",color:"#60a5fa"},{label:"Max Marks",value:e.totalMarks,icon:"star",color:"#fbbf24"}];};
  activeWarnings=()=>{const s=this.exam()?.settings?.security??{};const w:string[]=[];if(s["fullscreen"])w.push("Fullscreen required — exit records violation");if(s["tabSwitch"])w.push("Tab switching monitored");if(s["copyPaste"])w.push("Copy & paste disabled");if(s["devTools"])w.push("Dev tools usage monitored");return w;};
  instructions=["Read each question carefully before answering.","Navigate between questions using the left panel.","Green squares = answered questions.","Answers auto-saved as you type.","Click Submit when finished.","Exam auto-submits when timer hits 0."];
  resultStats=()=>[{label:"Answered",value:this.result()?.answeredCount??0,color:undefined},{label:"Total Questions",value:this.exam()?.questions.length??0,color:"#94a3b8"},{label:"Violations",value:this.viols(),color:this.viols()>0?"#fca5a5":"#6ee7b7"},{label:"Status",value:"Pending Review",color:"#a5b4fc"}];

  constructor(private http:HttpClient,private route:ActivatedRoute,public router:Router,private snackBar:MatSnackBar){}

  ngOnInit():void{
    const id=this.route.snapshot.paramMap.get("id")!;
    this.http.get<Exam>(`${environment.apiUrl}/exams/${id}`).subscribe({
      next:e=>{this.exam.set(e);this.timer.set(e.durationMinutes*60);this.loading.set(false);},
      error:()=>{this.exam.set(this.mockExam());this.timer.set(45*60);this.loading.set(false);}
    });
  }
  ngOnDestroy():void{this.stopTimer();this.removeAC();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}

  startExam():void{
    const s=this.exam()?.settings?.security??{};
    if(s["fullscreen"])document.documentElement.requestFullscreen().catch(()=>{});
    if(s["copyPaste"]){document.addEventListener("copy",this._bkCopy);document.addEventListener("paste",this._bkCopy);document.addEventListener("cut",this._bkCopy);}
    if(s["rightClick"])document.addEventListener("contextmenu",this._bkRight);
    if(s["devTools"])this._dtI=setInterval(()=>{if(window.outerWidth-window.innerWidth>160||window.outerHeight-window.innerHeight>160)this.viol("Dev tools detected");},3000);
    this._tmr=setInterval(()=>this.timer.update(t=>{if(t<=1){clearInterval(this._tmr);this.submitExam();return 0;}return t-1;}),1000);
    this.phase.set("exam");
  }
  private stopTimer():void{if(this._tmr)clearInterval(this._tmr);if(this._dtI)clearInterval(this._dtI);}
  private _bkCopy=(e:Event)=>{e.preventDefault();this.viol("Copy/paste blocked");};
  private _bkRight=(e:Event)=>e.preventDefault();
  private removeAC():void{document.removeEventListener("copy",this._bkCopy);document.removeEventListener("paste",this._bkCopy);document.removeEventListener("cut",this._bkCopy);document.removeEventListener("contextmenu",this._bkRight);if(this._dtI)clearInterval(this._dtI);}
  private viol(r:string):void{this.viols.update(v=>v+1);const v=this.viols();this.snackBar.open(`⚠️ Violation #${v}: ${r}${v>=5?" — Auto-submitting":""}`, "OK",{duration:4000,panelClass:["error-snackbar"]});if(v>=5){setTimeout(()=>this.submitExam(),2000);}}

  @HostListener("window:blur") onBlur():void{if(this.phase()==="exam"&&this.exam()?.settings?.security?.["tabSwitch"])this.viol("Tab/window switch detected");}
  @HostListener("document:fullscreenchange") onFS():void{if(this.phase()==="exam"&&!document.fullscreenElement&&this.exam()?.settings?.security?.["fullscreen"]){this.viol("Fullscreen exited");setTimeout(()=>document.documentElement.requestFullscreen().catch(()=>{}),500);}}
  @HostListener("document:keydown",["$event"]) onKey(e:KeyboardEvent):void{if(this.phase()!=="exam")return;const s=this.exam()?.settings?.security??{};if(s["copyPaste"]&&(e.ctrlKey||e.metaKey)&&["c","v","x","a"].includes(e.key.toLowerCase())){e.preventDefault();this.viol("Keyboard shortcut blocked");}if(e.key==="F12"||(e.ctrlKey&&e.shiftKey&&["i","j","c"].includes(e.key.toLowerCase()))){e.preventDefault();if(s["devTools"])this.viol("DevTools shortcut");}}

  hasAns(id:string):boolean{return this.answers().some(a=>a.questionId===id);}
  getAns(id:string):Answer|undefined{return this.answers().find(a=>a.questionId===id);}
  selMCQ(qid:string,oid:string):void{this.answers.update(l=>[...l.filter(a=>a.questionId!==qid),{questionId:qid,mcqOptionId:oid}]);}
  setTxt(qid:string,t:string):void{this.answers.update(l=>{const f=l.filter(a=>a.questionId!==qid);return t.trim()?[...f,{questionId:qid,textAnswer:t}]:f;});}
  setCode(qid:string,c:string):void{this.answers.update(l=>{const f=l.filter(a=>a.questionId!==qid);return c.trim()?[...f,{questionId:qid,codeAnswer:c}]:f;});}

  submitExam():void{
    this.submitting.set(true);this.stopTimer();this.removeAC();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    const id=this.route.snapshot.paramMap.get("id");
    const payload={answers:this.answers(),violations:this.viols(),timeSpent:(this.exam()!.durationMinutes*60)-this.timer()};
    this.http.post<any>(`${environment.apiUrl}/exams/${id}/submit`,payload).subscribe({
      next:()=>{
        this.result.set({answeredCount:this.answers().length});
        this.phase.set("result");this.submitting.set(false);
      },
      error:err=>{
        // Never fabricate a score on failure — marks are decided by the
        // instructor, not computed client-side. Surface the failure and let
        // the candidate retry instead of showing a fake pass/fail result.
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? "Failed to submit your exam. Please check your connection and try again.", "Retry", {duration:6000,panelClass:["error-snackbar"]})
          .onAction().subscribe(()=>this.submitExam());
      }
    });
  }

  fmt(s:number):string{const m=Math.floor(s/60);return `${m.toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
  qColor(t:string):string{const m:Record<string,string>={MCQ:"#6366f1",SHORT:"#3b82f6",LONG:"#10b981",CODING:"#f59e0b"};return m[t]??"#6366f1";}

  mockExam():Exam{return{id:"mock",title:"JavaScript Fundamentals",subject:"JavaScript",durationMinutes:45,totalMarks:20,passingMarks:10,settings:{security:{fullscreen:true,tabSwitch:true,copyPaste:true,rightClick:true,devTools:true},options:{shuffleQuestions:false,showResult:true,autoSubmit:true}},questions:[
    {id:"q1",type:"MCQ",text:"Which keyword declares a variable that cannot be reassigned?",marks:2,options:[{id:"a",text:"var"},{id:"b",text:"let"},{id:"c",text:"const"},{id:"d",text:"define"}]},
    {id:"q2",type:"MCQ",text:"What does === check in JavaScript?",marks:2,options:[{id:"a",text:"Value only"},{id:"b",text:"Type only"},{id:"c",text:"Both value and type"},{id:"d",text:"Neither"}]},
    {id:"q3",type:"SHORT",text:"Explain the difference between null and undefined.",marks:4,options:[]},
    {id:"q4",type:"CODING",text:"Write a function that returns only even numbers from an array.",marks:6,options:[]},
    {id:"q5",type:"LONG",text:"Explain closures in JavaScript with an example.",marks:6,options:[]},
  ]};}
}
