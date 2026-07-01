package com.syntaxcore.workforce.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private UUID id;
    private UserSummaryResponse sender;
    private UserSummaryResponse recipient;
    private UUID channelId;
    private String channelType;
    private String message;
    private String messageType;
    private String fileUrl;
    private String fileName;
    private String reactions;
    private boolean edited;
    private boolean read;
    private UUID replyToId;
    private String replyToMessage;
    private LocalDateTime createdAt;
}
