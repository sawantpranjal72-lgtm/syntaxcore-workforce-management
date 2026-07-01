package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.dto.response.ChatMessageResponse;
import com.syntaxcore.workforce.dto.response.PagedResponse;
import com.syntaxcore.workforce.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Direct messaging and team channels")
public class ChatController {

    private final ChatService chatService;

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    /** GET history of direct messages between current user and recipient */
    @GetMapping("/direct/{recipientId}")
    @Operation(summary = "Get direct message history")
    public ResponseEntity<PagedResponse<ChatMessageResponse>> getDirectMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID recipientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(chatService.getDirectMessages(
                userDetails.getUsername(), recipientId, PageRequest.of(page, size)));
    }

    /** POST a direct message via HTTP (WebSocket fallback) */
    @PostMapping("/direct/{recipientId}")
    @Operation(summary = "Send a direct message via HTTP (WebSocket fallback)")
    public ResponseEntity<ChatMessageResponse> sendDirectMessage(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID recipientId,
            @RequestBody Map<String, String> body) {
        String text = body.get("message");
        String fileUrl = body.get("fileUrl");
        String fileName = body.get("fileName");
        String messageType = body.get("messageType");
        if ((text == null || text.isBlank()) && (fileUrl == null || fileUrl.isBlank())) {
            return ResponseEntity.badRequest().build();
        }
        ChatMessageResponse msg = chatService.sendDirectMessage(
            userDetails.getUsername(), recipientId, text, messageType, fileUrl, fileName);
        return ResponseEntity.status(HttpStatus.CREATED).body(msg);
    }

    @PostMapping("/attachments")
    @Operation(summary = "Upload a chat attachment")
    public ResponseEntity<Map<String, String>> uploadAttachment(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is required"));
        }
        try {
            Path dir = Paths.get(uploadDir, "chat").toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String originalName = file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename();
            String safeName = originalName.replaceAll("[^A-Za-z0-9._-]", "_");
            String storedName = UUID.randomUUID() + "_" + safeName;
            Path target = dir.resolve(storedName).normalize();
            Files.copy(file.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "fileUrl", "/uploads/chat/" + storedName,
                "fileName", originalName,
                "messageType", isImage(originalName) ? "IMAGE" : "FILE"
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to upload attachment"));
        }
    }

    /** GET channel message history */
    @GetMapping("/channel/{channelId}")
    @Operation(summary = "Get channel message history")
    public ResponseEntity<PagedResponse<ChatMessageResponse>> getChannelMessages(
            @PathVariable UUID channelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(chatService.getChannelMessages(channelId, PageRequest.of(page, size)));
    }

    /** GET unread message count */
    @GetMapping("/unread-count")
    @Operation(summary = "Get unread message count for current user")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        long count = chatService.getUnreadCount(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /** PATCH mark messages from a sender as read */
    @PatchMapping("/direct/{senderId}/read")
    @Operation(summary = "Mark messages from a sender as read")
    public ResponseEntity<Map<String, String>> markAsRead(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID senderId) {
        chatService.markAsRead(userDetails.getUsername(), senderId);
        return ResponseEntity.ok(Map.of("message", "Messages marked as read"));
    }

    private boolean isImage(String fileName) {
        String lower = fileName.toLowerCase();
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            || lower.endsWith(".gif") || lower.endsWith(".webp");
    }
}
