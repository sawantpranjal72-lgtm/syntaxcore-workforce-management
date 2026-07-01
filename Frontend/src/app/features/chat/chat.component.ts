import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatMessage, UserSummary, PagedResponse, ROLE_LABELS } from '../../core/models';
import { environment } from '../../../environments/environment';

interface Conversation {
  user: UserSummary;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatProgressSpinnerModule, MatBadgeModule],
  template: `
<div class="flex h-full" style="height:calc(100vh - 56px)">

  <!-- ── CONTACTS SIDEBAR ── -->
  <div class="border-r flex flex-col flex-shrink-0 transition-all"
       [class]="(selectedUser() && isMobile()) ? 'hidden' : ''"
       [style.width]="isMobile() ? '100%' : '300px'"
       style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">

    <!-- Header -->
    <div class="px-4 py-4 border-b" style="border-color:var(--border-color,#e2e8f0)">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-slate-900 dark:text-white">Messages</h2>
        <span class="text-xs text-slate-400">{{users().length}} people</span>
      </div>
      <div class="flex items-center gap-2 px-3 py-2 rounded-xl"
           style="background:var(--page-bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0)">
        <mat-icon class="text-slate-400 text-base">search</mat-icon>
        <input [(ngModel)]="search" placeholder="Search by name, role..."
               class="bg-transparent text-sm flex-1 outline-none"
               style="color:var(--text-primary)">
        @if (search) {
          <button (click)="search=''" class="text-slate-400 hover:text-slate-600">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        }
      </div>
    </div>

    <!-- User list -->
    <div class="flex-1 overflow-y-auto">
      @if (loadingUsers()) {
        <div class="flex justify-center py-10"><mat-spinner diameter="32"></mat-spinner></div>
      }
      @for (u of filteredUsers(); track u.id) {
        <div (click)="selectUser(u)"
             class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b"
             [class]="selectedUser()?.id === u.id
               ? 'bg-blue-50 dark:bg-blue-900/20'
               : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'"
             style="border-color:var(--border-color,#e2e8f0)">
          <!-- Avatar with online dot -->
          <div class="relative flex-shrink-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                 [style.background]="avatarBg(u.fullName)">
              {{u.firstName[0]}}{{u.lastName[0]}}
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-400"></div>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" style="color:var(--text-primary)">{{u.fullName}}</p>
            <p class="text-xs truncate" style="color:var(--text-muted)">
              {{userSubtitle(u)}}
            </p>
          </div>
          @if (u.departmentName) {
            <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style="background:var(--page-bg,#f8fafc);color:var(--text-muted)">
              {{u.departmentName.split(' ')[0]}}
            </span>
          }
        </div>
      }
      @if (!filteredUsers().length && !loadingUsers()) {
        <div class="text-center py-12 text-slate-400 text-sm">
          <mat-icon class="text-3xl mb-2 text-slate-300">person_search</mat-icon>
          <p>No people found</p>
        </div>
      }
    </div>
  </div>

  <!-- ── CHAT WINDOW ── -->
  <div class="flex-col min-w-0 flex-1"
       [class]="(!selectedUser() && isMobile()) ? 'hidden' : 'flex'"
       style="background:var(--page-bg,#f8fafc)">

    @if (selectedUser()) {
      <!-- Chat header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <button class="sm:hidden" mat-icon-button (click)="selectedUser.set(null)" style="color:var(--text-muted)">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="relative">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
               [style.background]="avatarBg(selectedUser()!.fullName)">
            {{selectedUser()!.firstName[0]}}{{selectedUser()!.lastName[0]}}
          </div>
          <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-green-400"></div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate" style="color:var(--text-primary)">{{selectedUser()!.fullName}}</p>
          <div class="flex items-center gap-2">
            <p class="text-xs" style="color:var(--text-muted)">
              {{userSubtitle(selectedUser()!)}}
              @if (selectedUser()!.departmentName) { · {{selectedUser()!.departmentName}} }
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button mat-icon-button matTooltip="Voice call" style="color:var(--text-muted)">
            <mat-icon>call</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Video call" style="color:var(--text-muted)">
            <mat-icon>videocam</mat-icon>
          </button>
          <button mat-icon-button matTooltip="More" style="color:var(--text-muted)">
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div #msgContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-1"
           style="background:var(--page-bg,#f8fafc)">
        @if (loadingMessages()) {
          <div class="flex justify-center py-10"><mat-spinner diameter="30"></mat-spinner></div>
        }
        @for (msg of messages(); track msg.id) {
          <div class="flex items-end gap-2 mb-2" [class]="isMine(msg) ? 'flex-row-reverse' : ''">
            <!-- Avatar (only for received) -->
            @if (!isMine(msg)) {
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-1"
                   [style.background]="avatarBg(msg.sender.fullName)">
                {{msg.sender.firstName[0]}}
              </div>
            }
            <div class="max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg">
              <!-- Bubble -->
              <div class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words"
                   [class]="isMine(msg) ? 'rounded-br-sm text-white' : 'rounded-bl-sm'"
                   [style]="isMine(msg)
                     ? 'background:linear-gradient(135deg,#3b82f6,#2563eb)'
                     : 'background:var(--card-bg,#fff);border:1px solid var(--border-color,#e2e8f0);color:var(--text-primary)'">
                @if (msg.fileUrl) {
                  @if (isImageMessage(msg)) {
                    <img [src]="assetUrl(msg.fileUrl)" [alt]="msg.fileName ?? 'Attachment'"
                         class="max-w-full rounded-xl mb-2 border border-white/20">
                  } @else {
                    <a [href]="assetUrl(msg.fileUrl)" target="_blank"
                       class="flex items-center gap-2 rounded-xl px-3 py-2 mb-2"
                       [class]="isMine(msg) ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'">
                      <mat-icon class="text-base">attach_file</mat-icon>
                      <span class="truncate">{{msg.fileName ?? 'Attachment'}}</span>
                    </a>
                  }
                }
                @if (msg.message) { <span>{{msg.message}}</span> }
              </div>
              <p class="text-xs mt-1 px-1" style="color:var(--text-muted)"
                 [class]="isMine(msg) ? 'text-right' : ''">
                {{timeAgo(msg.createdAt)}}
                @if (isMine(msg) && msg.read) {
                  <mat-icon class="text-xs text-blue-400 align-middle">done_all</mat-icon>
                }
              </p>
            </div>
          </div>
        }
        <!-- Typing indicator -->
        @if (typing()) {
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                 [style.background]="avatarBg(selectedUser()!.fullName)">
              {{selectedUser()!.firstName[0]}}
            </div>
            <div class="px-4 py-3 rounded-2xl rounded-bl-sm"
                 style="background:var(--card-bg,#fff);border:1px solid var(--border-color,#e2e8f0)">
              <div class="flex gap-1 items-center">
                <span class="text-xs" style="color:var(--text-muted)">typing</span>
                <div class="flex gap-0.5">
                  @for (i of [1,2,3]; track i) {
                    <div class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                         [style.animation-delay]="(i-1)*150+'ms'"></div>
                  }
                </div>
              </div>
            </div>
          </div>
        }
        <!-- Empty state -->
        @if (!messages().length && !loadingMessages()) {
          <div class="flex flex-col items-center justify-center h-full py-20 text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                 style="background:linear-gradient(135deg,#eff6ff,#dbeafe)">
              <mat-icon style="font-size:28px;color:#3b82f6">chat_bubble_outline</mat-icon>
            </div>
            <p class="font-semibold text-slate-900 dark:text-white mb-1">Start the conversation</p>
            <p class="text-sm text-slate-400">Say hello to {{selectedUser()!.firstName}}!</p>
          </div>
        }
      </div>

      <!-- Input area -->
      <div class="px-4 py-3 border-t flex-shrink-0"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)">
        <div class="flex items-center gap-3">
          <button mat-icon-button matTooltip="Attach file" style="color:var(--text-muted)" class="flex-shrink-0"
                  (click)="fileInput.click()" [disabled]="uploading()">
            <mat-icon>attach_file</mat-icon>
          </button>
          <div class="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl relative"
               style="background:var(--page-bg,#f8fafc);border:1px solid var(--border-color,#e2e8f0)">
            <input [(ngModel)]="newMessage"
                   (keyup.enter)="sendMessage()"
                   (input)="onTyping()"
                   placeholder="Type a message to {{selectedUser()!.firstName}}..."
                   class="flex-1 bg-transparent text-sm outline-none"
                   style="color:var(--text-primary)">
            <button mat-icon-button matTooltip="Emoji" style="color:var(--text-muted)" class="flex-shrink-0"
                    (click)="emojiOpen.set(!emojiOpen())">
              <mat-icon>emoji_emotions</mat-icon>
            </button>
            @if (emojiOpen()) {
              <div class="absolute bottom-12 right-2 w-64 rounded-xl border p-2 grid grid-cols-8 gap-1 shadow-lg z-20"
                   style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
                @for (emoji of emojis; track emoji) {
                  <button type="button" class="h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-lg"
                          (click)="insertEmoji(emoji)">
                    {{emoji}}
                  </button>
                }
              </div>
            }
          </div>
          <button mat-icon-button (click)="sendMessage()" [disabled]="!newMessage.trim() || sending()"
                  class="flex-shrink-0 rounded-full"
                  style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white"
                  [style.opacity]="!newMessage.trim() || sending() ? '0.4' : '1'">
            <mat-icon>{{sending() ? 'hourglass_top' : 'send'}}</mat-icon>
          </button>
        </div>
        @if (uploading()) {
          <p class="text-xs mt-2" style="color:var(--text-muted)">Uploading attachment...</p>
        }
      </div>
    } @else {
      <!-- Empty state -->
      <div class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <div class="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
             style="background:linear-gradient(135deg,#eff6ff,#dbeafe)">
          <mat-icon style="font-size:36px;color:#3b82f6">forum</mat-icon>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Your messages</h3>
          <p class="text-sm text-slate-400 mt-1 max-w-sm">
            Select a colleague from the list to start a conversation.
            Messages are delivered in real time via WebSocket.
          </p>
        </div>
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
             style="background:#f0fdf4;border:1px solid #bbf7d0">
          <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span class="text-xs text-green-700 font-medium">{{users().length}} people available to chat</span>
        </div>
      </div>
    }
  </div>
</div>
  `,
  styles: [`:host{display:block;height:100%}`]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgContainer') private msgContainer!: ElementRef;

  users          = signal<UserSummary[]>([]);
  selectedUser   = signal<UserSummary | null>(null);
  messages       = signal<ChatMessage[]>([]);
  typing         = signal(false);
  loadingUsers   = signal(false);
  loadingMessages= signal(false);
  sending        = signal(false);
  uploading      = signal(false);
  emojiOpen      = signal(false);
  newMessage     = '';
  search         = '';
  emojis = ['😀','😁','😂','😊','😍','😎','🤝','👍','🙏','🎉','🔥','✅','💡','📌','🚀','❤️','🙌','👏','😅','🤔','😐','😢','😡','⭐'];
  private sub    = new Subscription();
  private shouldScroll = false;
  private typingTimer: any;

  filteredUsers = computed(() => {
    const q = this.search.toLowerCase();
    return this.users().filter(u =>
      !q || u.fullName.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.jobTitle ?? '').toLowerCase().includes(q) ||
      (u.departmentName ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  });

  isMobile = () => window.innerWidth < 640;

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    // Listen for incoming real-time messages
    this.sub.add(
      this.wsService.message$.subscribe((msg: ChatMessage) => {
        const sel = this.selectedUser();
        if (sel && (msg.sender?.id === sel.id || msg.recipient?.id === sel.id)) {
          this.messages.update(msgs => {
            // Avoid duplicate from optimistic update
            const exists = msgs.some(m => m.id === msg.id);
            return exists ? msgs : [...msgs, msg];
          });
          this.sending.set(false);
          this.shouldScroll = true;
        }
      })
    );
    this.sub.add(
      this.wsService.typing$.subscribe(event => {
        if (event.senderId !== this.selectedUser()?.id) return;
        this.typing.set(true);
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => this.typing.set(false), 1400);
      })
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.http.get<any>(`${environment.apiUrl}/users?size=200&active=true`).subscribe({
      next: r => {
        const me = this.authService.currentUser();
        const all: UserSummary[] = r.content ?? [];
        // Everyone can chat with everyone
        this.users.set(all
          .filter(u => u.id !== me?.id && u.role !== 'SUPER_ADMIN')
          .sort((a,b) => a.fullName.localeCompare(b.fullName)));
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false)
    });
  }

  selectUser(user: UserSummary): void {
    this.selectedUser.set(user);
    this.messages.set([]);
    this.loadHistory(user.id);
  }

  loadHistory(userId: string): void {
    this.loadingMessages.set(true);
    this.http.get<PagedResponse<ChatMessage>>(`${environment.apiUrl}/chat/direct/${userId}?size=100`).subscribe({
      next: r => {
        this.messages.set((r.content ?? []).reverse()); // oldest first
        this.shouldScroll = true;
        this.loadingMessages.set(false);
      },
      error: () => { this.messages.set([]); this.loadingMessages.set(false); }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedUser()) return;
    const text = this.newMessage.trim();
    this.newMessage = '';

    this.sending.set(true);
    if (this.wsService.connected()) {
      this.wsService.sendDirectMessage(this.selectedUser()!.id, text);
    } else {
      this.http.post<ChatMessage>(`${environment.apiUrl}/chat/direct/${this.selectedUser()!.id}`, { message: text }).subscribe({
        next: msg => {
          this.messages.update(msgs => [...msgs, msg]);
          this.shouldScroll = true;
          this.sending.set(false);
        },
        error: () => this.sending.set(false)
      });
    }
  }

  onTyping(): void {
    if (this.selectedUser()) this.wsService.sendTyping(this.selectedUser()!.id);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.selectedUser()) return;
    this.uploading.set(true);
    const data = new FormData();
    data.append('file', file);
    this.http.post<{ fileUrl: string; fileName: string; messageType: string }>(`${environment.apiUrl}/chat/attachments`, data).subscribe({
      next: uploaded => {
        const message = this.newMessage.trim() || uploaded.fileName;
        this.newMessage = '';
        this.uploading.set(false);
        this.sending.set(true);
        if (this.wsService.connected()) {
          this.wsService.sendDirectMessage(this.selectedUser()!.id, message, uploaded.messageType, uploaded.fileUrl, uploaded.fileName);
        } else {
          this.http.post<ChatMessage>(`${environment.apiUrl}/chat/direct/${this.selectedUser()!.id}`, {
            message,
            messageType: uploaded.messageType,
            fileUrl: uploaded.fileUrl,
            fileName: uploaded.fileName
          }).subscribe({
            next: msg => {
              this.messages.update(msgs => [...msgs, msg]);
              this.shouldScroll = true;
              this.sending.set(false);
            },
            error: () => this.sending.set(false)
          });
        }
      },
      error: () => this.uploading.set(false)
    });
  }

  insertEmoji(emoji: string): void {
    this.newMessage = `${this.newMessage}${emoji}`;
    this.emojiOpen.set(false);
    this.onTyping();
  }

  isMine(msg: ChatMessage): boolean {
    return msg.sender?.id === this.authService.currentUser()?.id;
  }

  avatarBg(name: string): string {
    const colors = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  }

  roleLabel(role?: string): string {
    return role ? (ROLE_LABELS[role] ?? role.replace(/_/g, ' ')) : '';
  }

  userSubtitle(user: UserSummary): string {
    return user.jobTitle ?? this.roleLabel(user.role);
  }

  assetUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${environment.wsUrl ?? environment.apiUrl.replace('/api/v1', '')}${url}`;
  }

  isImageMessage(msg: ChatMessage): boolean {
    return msg.messageType === 'IMAGE' || /\.(png|jpe?g|gif|webp)$/i.test(msg.fileName ?? msg.fileUrl ?? '');
  }

  scrollToBottom(): void {
    try { this.msgContainer.nativeElement.scrollTop = this.msgContainer.nativeElement.scrollHeight; } catch {}
  }

  timeAgo(date?: string): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); clearTimeout(this.typingTimer); }
}
