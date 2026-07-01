package com.syntaxcore.workforce.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "exams")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Exam extends BaseEntity {

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String subject;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "total_marks", nullable = false)
    private double totalMarks;

    @Column(name = "passing_marks", nullable = false)
    private double passingMarks;

    @Column(length = 30)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, PUBLISHED, ACTIVE, COMPLETED

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    /** Comma-separated target roles, e.g. "EMPLOYEE,INTERN,STUDENT" */
    @Column(name = "target_roles", length = 300)
    private String targetRolesCsv;

    /** Questions stored as JSON array (see ExamQuestionDto for shape) */
    @Column(name = "questions_json", columnDefinition = "TEXT")
    private String questionsJson;

    /** Security + option settings stored as JSON */
    @Column(name = "settings_json", columnDefinition = "TEXT")
    private String settingsJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User examCreator;

    // ── Transient JSON helpers ───────────────────────────────────
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transient
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getQuestions() {
        if (questionsJson == null || questionsJson.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(questionsJson, List.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Transient
    public void setQuestions(Object questions) {
        try {
            this.questionsJson = MAPPER.writeValueAsString(questions);
        } catch (Exception e) {
            this.questionsJson = "[]";
        }
    }

    @Transient
    @SuppressWarnings("unchecked")
    public Map<String, Object> getSettings() {
        if (settingsJson == null || settingsJson.isBlank()) return new HashMap<>();
        try {
            return MAPPER.readValue(settingsJson, Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    @Transient
    public void setSettings(Object settings) {
        try {
            this.settingsJson = MAPPER.writeValueAsString(settings);
        } catch (Exception e) {
            this.settingsJson = "{}";
        }
    }

    @Transient
    public List<String> getTargetRoles() {
        if (targetRolesCsv == null || targetRolesCsv.isBlank()) return new ArrayList<>();
        return Arrays.asList(targetRolesCsv.split(","));
    }

    @Transient
    public void setTargetRoles(List<String> roles) {
        this.targetRolesCsv = roles == null ? null : String.join(",", roles);
    }

    @Transient
    public int getQuestionCount() {
        return getQuestions().size();
    }
}
