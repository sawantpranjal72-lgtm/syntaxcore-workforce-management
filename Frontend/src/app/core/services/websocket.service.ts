import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import SockJS from 'sockjs-client';
import { Client, IMessage } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { ChatMessage, Notification } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  connected = signal(false);
  message$ = new Subject<ChatMessage>();
  typing$ = new Subject<{ senderId: string; senderName: string }>();
  notification$ = new Subject<Notification>();

  private stompClient: Client | null = null;
  private reconnectTimer: any;
  private reconnectDelay = 3000;

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.stompClient?.connected || this.stompClient?.active) return;
    this.tryConnect();
  }

  private tryConnect(): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    try {
      // environment.wsUrl always holds the COMPLETE WebSocket endpoint
      // (e.g. 'http://localhost:8080/ws' in dev, '/ws' in prod behind a
      // reverse proxy) — it must be used as-is. Previously this appended
      // '/ws' a second time (`${wsBaseUrl}/ws`), which in production built
      // '/ws/ws' — a path that never resolves, so the SockJS handshake
      // silently failed forever and the app fell back to relying entirely
      // on full-page reloads to pick up new notifications/messages.
      const wsEndpoint = environment.wsUrl ?? `${environment.apiUrl.replace('/api/v1', '')}/ws`;
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(wsEndpoint),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 0,
        debug: () => {},
        onConnect: () => {
          this.reconnectDelay = 3000;
          this.connected.set(true);
          this.subscribeToTopics();
        },
        onStompError: () => {
          this.connected.set(false);
          this.scheduleReconnect();
        },
        onWebSocketClose: () => {
          this.connected.set(false);
          this.scheduleReconnect();
        },
        onWebSocketError: () => {
          this.connected.set(false);
          this.scheduleReconnect();
        }
      });
      this.stompClient.activate();
    } catch {
      this.connected.set(false);
      this.startPollingFallback();
    }
  }

  private subscribeToTopics(): void {
    if (!this.stompClient?.connected) return;

    this.stompClient.subscribe('/user/queue/messages', (frame: IMessage) => {
      try {
        this.message$.next(JSON.parse(frame.body));
      } catch {}
    });

    this.stompClient.subscribe('/user/queue/typing', (frame: IMessage) => {
      try {
        this.typing$.next(JSON.parse(frame.body));
      } catch {}
    });

    this.stompClient.subscribe('/user/queue/notifications', (frame: IMessage) => {
      try {
        this.notification$.next(JSON.parse(frame.body));
      } catch {}
    });

    this.stompClient.subscribe('/topic/broadcast', (frame: IMessage) => {
      try {
        this.notification$.next(JSON.parse(frame.body));
      } catch {}
    });
  }

  sendDirectMessage(recipientId: string, message: string, messageType = 'TEXT', fileUrl?: string, fileName?: string): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: '/app/chat.sendDirect',
      body: JSON.stringify({ recipientId, message, messageType, fileUrl, fileName })
    });
  }

  sendTyping(recipientId: string): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ recipientId })
    });
  }

  private startPollingFallback(): void {
    this.connected.set(false);
  }

  private scheduleReconnect(): void {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.authService.isAuthenticated()) this.tryConnect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.stompClient) {
      try { this.stompClient.deactivate(); } catch {}
      this.stompClient = null;
    }
    this.connected.set(false);
    this.reconnectDelay = 3000;
  }
}
