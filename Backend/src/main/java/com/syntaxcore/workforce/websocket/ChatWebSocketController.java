package com.syntaxcore.workforce.websocket;

import com.syntaxcore.workforce.dto.response.ChatMessageResponse;
import com.syntaxcore.workforce.entity.ChatMessage;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.repository.ChatMessageRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.util.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository        userRepository;
    private final UserMapper            userMapper;

    @MessageMapping("/chat.sendDirect")
    public void sendDirect(@Payload Map<String, String> payload, Principal principal) {
        try {
            String senderEmail = principal.getName();
            String recipientId = payload.get("recipientId");
            String text        = payload.get("message");
            String fileUrl     = payload.get("fileUrl");
            String fileName    = payload.get("fileName");
            String type        = payload.get("messageType");
            if (recipientId == null || ((text == null || text.isBlank()) && (fileUrl == null || fileUrl.isBlank()))) return;

            User sender    = userRepository.findByEmailIgnoreCaseAndDeletedFalse(senderEmail).orElseThrow();
            User recipient = userRepository.findById(UUID.fromString(recipientId)).orElseThrow();

            ChatMessage msg = ChatMessage.builder()
                .sender(sender).recipient(recipient)
                .message(text != null && !text.isBlank() ? text.trim() : (fileName != null ? fileName : "Attachment"))
                .messageType(type != null && !type.isBlank() ? type.trim().toUpperCase() : (fileUrl == null ? "TEXT" : "FILE"))
                .fileUrl(fileUrl)
                .fileName(fileName)
                .channelType("DIRECT")
                .read(false).edited(false)
                .build();
            chatMessageRepository.save(msg);

            ChatMessageResponse response = toResponse(msg);
            messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/messages", response);
            messagingTemplate.convertAndSendToUser(sender.getEmail(),    "/queue/messages", response);
        } catch (Exception e) {
            log.error("sendDirect error: {}", e.getMessage());
        }
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload Map<String, String> payload, Principal principal) {
        try {
            String recipientId = payload.get("recipientId");
            if (recipientId == null) return;
            User sender = userRepository.findByEmailIgnoreCaseAndDeletedFalse(principal.getName()).orElseThrow();
            User recipient = userRepository.findById(UUID.fromString(recipientId)).orElseThrow();
            messagingTemplate.convertAndSendToUser(recipient.getEmail(), "/queue/typing",
                Map.of("senderId", sender.getId().toString(), "senderName", sender.getFullName()));
        } catch (Exception e) {
            log.debug("typing error: {}", e.getMessage());
        }
    }

    private ChatMessageResponse toResponse(ChatMessage msg) {
        return ChatMessageResponse.builder()
            .id(msg.getId())
            .message(msg.getMessage())
            .messageType(msg.getMessageType())
            .channelType(msg.getChannelType())
            .fileUrl(msg.getFileUrl())
            .fileName(msg.getFileName())
            .reactions(msg.getReactions())
            .edited(msg.isEdited())
            .read(msg.isRead())
            .createdAt(msg.getCreatedAt())
            .sender(userMapper.toSummaryResponse(msg.getSender()))
            .recipient(msg.getRecipient() != null ? userMapper.toSummaryResponse(msg.getRecipient()) : null)
            .build();
    }
}
