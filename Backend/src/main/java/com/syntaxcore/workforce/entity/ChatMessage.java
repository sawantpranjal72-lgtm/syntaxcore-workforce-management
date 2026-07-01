package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_sender", columnList = "sender_id"),
    @Index(name = "idx_chat_channel", columnList = "channel_id"),
    @Index(name = "idx_chat_recipient", columnList = "recipient_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Column(name = "channel_id")
    private UUID channelId;

    @Column(name = "channel_type")
    private String channelType; // DIRECT, TEAM, PROJECT, TASK

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "message_type")
    @Builder.Default
    private String messageType = "TEXT"; // TEXT, IMAGE, FILE, SYSTEM

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "reactions", columnDefinition = "TEXT")
    private String reactions;

    @Column(name = "is_edited")
    @Builder.Default
    private boolean edited = false;

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to_id")
    private ChatMessage replyTo;
}
