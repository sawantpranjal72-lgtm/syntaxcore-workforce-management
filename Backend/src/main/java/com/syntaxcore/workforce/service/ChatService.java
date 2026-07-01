package com.syntaxcore.workforce.service;

import com.syntaxcore.workforce.dto.response.ChatMessageResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ChatService {
    ChatMessageResponse sendDirectMessage(String senderEmail, UUID recipientId, String message);
    ChatMessageResponse sendDirectMessage(String senderEmail, UUID recipientId, String message,
                                          String messageType, String fileUrl, String fileName);
    ChatMessageResponse sendChannelMessage(String senderEmail, UUID channelId, String channelType, String message);
    PagedResponse<ChatMessageResponse> getDirectMessages(String userEmail, UUID recipientId, Pageable pageable);
    PagedResponse<ChatMessageResponse> getChannelMessages(UUID channelId, Pageable pageable);
    long getUnreadCount(String userEmail);
    void markAsRead(String userEmail, UUID senderId);
}
