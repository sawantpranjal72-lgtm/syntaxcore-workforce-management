package com.syntaxcore.workforce.service.impl;

import com.syntaxcore.workforce.dto.response.ChatMessageResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.entity.ChatMessage;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.ChatMessageRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.ChatService;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChatServiceImpl implements ChatService {

    private final ChatMessageRepository  chatMessageRepository;
    private final UserRepository         userRepository;
    private final SimpMessagingTemplate  messagingTemplate;
    private final UserMapper             userMapper;

    @Override
    public ChatMessageResponse sendDirectMessage(String senderEmail, UUID recipientId, String message) {
        return sendDirectMessage(senderEmail, recipientId, message, "TEXT", null, null);
    }

    @Override
    public ChatMessageResponse sendDirectMessage(String senderEmail, UUID recipientId, String message,
                                                 String messageType, String fileUrl, String fileName) {
        User sender    = findByEmail(senderEmail);
        User recipient = userRepository.findById(recipientId)
            .orElseThrow(() -> new ResourceNotFoundException("User", recipientId.toString()));

        String normalizedType = normalizeMessageType(messageType, fileUrl);
        ChatMessage msg = ChatMessage.builder()
            .sender(sender).recipient(recipient)
            .message(normalizeMessage(message, fileName)).channelType("DIRECT").messageType(normalizedType)
            .fileUrl(fileUrl)
            .fileName(fileName)
            .read(false).edited(false)
            .build();

        ChatMessage saved = chatMessageRepository.save(msg);
        ChatMessageResponse response = toResponse(saved);

        messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", response);
        messagingTemplate.convertAndSendToUser(sender.getEmail(),    "/queue/messages", response);
        return response;
    }

    @Override
    public ChatMessageResponse sendChannelMessage(String senderEmail, UUID channelId,
                                                   String channelType, String message) {
        User sender = findByEmail(senderEmail);
        ChatMessage msg = ChatMessage.builder()
            .sender(sender).channelId(channelId).channelType(channelType)
            .message(message).messageType("TEXT").edited(false)
            .build();
        ChatMessage saved = chatMessageRepository.save(msg);
        ChatMessageResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/channel/" + channelId, response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMessageResponse> getDirectMessages(String userEmail, UUID recipientId, Pageable pageable) {
        User user = findByEmail(userEmail);
        Page<ChatMessage> page = chatMessageRepository.findDirectMessages(user.getId(), recipientId, pageable);
        return PagedResponse.from(page.map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ChatMessageResponse> getChannelMessages(UUID channelId, Pageable pageable) {
        return PagedResponse.from(chatMessageRepository.findByChannelId(channelId, pageable).map(this::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(String userEmail) {
        User user = findByEmail(userEmail);
        return chatMessageRepository.countUnreadForUser(user.getId());
    }

    @Override
    public void markAsRead(String userEmail, UUID senderId) {
        User recipient = findByEmail(userEmail);
        chatMessageRepository.markAsReadBySender(senderId, recipient.getId());
    }

    // ── Helper ──────────────────────────────────────────────

    private ChatMessageResponse toResponse(ChatMessage msg) {
        return ChatMessageResponse.builder()
            .id(msg.getId())
            .sender(userMapper.toSummaryResponse(msg.getSender()))
            .recipient(msg.getRecipient() != null ? userMapper.toSummaryResponse(msg.getRecipient()) : null)
            .channelId(msg.getChannelId())
            .channelType(msg.getChannelType())
            .message(msg.getMessage())
            .messageType(msg.getMessageType())
            .fileUrl(msg.getFileUrl())
            .fileName(msg.getFileName())
            .reactions(msg.getReactions())
            .edited(msg.isEdited())
            .read(msg.isRead())
            .replyToId(msg.getReplyTo() != null ? msg.getReplyTo().getId() : null)
            .replyToMessage(msg.getReplyTo() != null ? msg.getReplyTo().getMessage() : null)
            .createdAt(msg.getCreatedAt())
            .build();
    }

    private User findByEmail(String email) {
        return userRepository.findByEmailIgnoreCaseAndDeletedFalse(email)
            .orElseThrow(() -> new ResourceNotFoundException("User", email));
    }

    private String normalizeMessage(String message, String fileName) {
        if (message != null && !message.isBlank()) {
            return message.trim();
        }
        return fileName != null && !fileName.isBlank() ? fileName.trim() : "Attachment";
    }

    private String normalizeMessageType(String messageType, String fileUrl) {
        if (messageType != null && !messageType.isBlank()) {
            return messageType.trim().toUpperCase();
        }
        return fileUrl == null || fileUrl.isBlank() ? "TEXT" : "FILE";
    }
}
