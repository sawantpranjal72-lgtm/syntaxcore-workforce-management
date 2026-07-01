package com.syntaxcore.workforce.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.*;

@RestController
@RequestMapping("/api/v1/ai")
@PreAuthorize("isAuthenticated()")
@Slf4j
@Tag(name = "AI Assistant", description = "AI-powered workforce insights")
public class AiController {

    @Value("${openai.api-key:}")
    private String openAiKey;

    @Value("${openai.model:gpt-4-turbo-preview}")
    private String model;

    @Autowired
    private RestTemplate restTemplate;

    @PostMapping("/chat")
    @Operation(summary = "Chat with AI assistant")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> body) {
        String userMessage = (String) body.getOrDefault("message", "");

        if (openAiKey == null || openAiKey.isBlank()) {
            return ResponseEntity.ok(Map.of("reply",
                "⚠️ OpenAI API key not configured. Set OPENAI_API_KEY in your environment to enable AI features.\n\n" +
                "I can help you with:\n• Task management insights\n• Team performance analysis\n• Sprint summaries\n• Attendance reports"));
        }

        try {
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content",
                "You are SyntaxCore AI, an intelligent workforce management assistant. " +
                "You help managers and employees understand task progress, team performance, attendance, and project status. " +
                "Be concise, professional, and data-driven in your responses."));

            @SuppressWarnings("unchecked")
            List<Map<String, String>> history = (List<Map<String, String>>) body.getOrDefault("history", List.of());
            messages.addAll(history);
            messages.add(Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", messages,
                "max_tokens", 1000,
                "temperature", 0.7
            );

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("Authorization", "Bearer " + openAiKey);
            headers.set("Content-Type", "application/json");

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                "https://api.openai.com/v1/chat/completions",
                new org.springframework.http.HttpEntity<>(requestBody, headers),
                Map.class
            );

            if (response != null && response.containsKey("choices")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
                if (!choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> message = (Map<String, String>) choices.get(0).get("message");
                    return ResponseEntity.ok(Map.of("reply", message.get("content")));
                }
            }
        } catch (Exception e) {
            log.error("OpenAI API error: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of("reply", "I encountered an error processing your request. Please try again."));
    }
}
