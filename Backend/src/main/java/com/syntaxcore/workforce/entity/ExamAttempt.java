package com.syntaxcore.workforce.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "exam_attempts", indexes = {
    @Index(name = "idx_attempt_exam", columnList = "exam_id"),
    @Index(name = "idx_attempt_user", columnList = "user_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamAttempt extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Submitted answers stored as JSON array */
    @Column(name = "answers_json", columnDefinition = "TEXT")
    private String answersJson;

    @Column
    private Double score;

    @Column(name = "max_score")
    private Double maxScore;

    @Column
    @Builder.Default
    private boolean passed = false;

    /** Per-question marks awarded, keyed by questionId. Set by the auto-grader
     * for MCQ as a starting suggestion, and overwritten/filled in by the
     * instructor during grading for every question type. JSON: {"q1": 2, "q2": 0, ...} */
    @Column(name = "question_scores_json", columnDefinition = "TEXT")
    private String questionScoresJson;

    /** Optional per-question instructor remarks, keyed by questionId. */
    @Column(name = "question_feedback_json", columnDefinition = "TEXT")
    private String questionFeedbackJson;

    /** Overall instructor feedback for the whole attempt. */
    @Column(name = "instructor_feedback", columnDefinition = "TEXT")
    private String instructorFeedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by_id")
    private User gradedBy;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @Column(name = "answered_count")
    @Builder.Default
    private int answeredCount = 0;

    @Column(name = "total_questions")
    @Builder.Default
    private int totalQuestions = 0;

    @Column(name = "violation_count")
    @Builder.Default
    private int violationCount = 0;

    @Column(name = "time_taken_seconds")
    private Integer timeTakenSeconds;

    @Column(length = 30)
    @Builder.Default
    private String status = "IN_PROGRESS"; // IN_PROGRESS, SUBMITTED, GRADED

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    // ── Transient JSON helpers ───────────────────────────────────
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Transient
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAnswers() {
        if (answersJson == null || answersJson.isBlank()) return new ArrayList<>();
        try {
            return MAPPER.readValue(answersJson, List.class);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Transient
    public void setAnswers(Object answers) {
        try {
            this.answersJson = MAPPER.writeValueAsString(answers);
        } catch (Exception e) {
            this.answersJson = "[]";
        }
    }

    @Transient
    @SuppressWarnings("unchecked")
    public Map<String, Object> getQuestionScores() {
        if (questionScoresJson == null || questionScoresJson.isBlank()) return new java.util.LinkedHashMap<>();
        try {
            return MAPPER.readValue(questionScoresJson, Map.class);
        } catch (Exception e) {
            return new java.util.LinkedHashMap<>();
        }
    }

    @Transient
    public void setQuestionScores(Object scores) {
        try {
            this.questionScoresJson = MAPPER.writeValueAsString(scores);
        } catch (Exception e) {
            this.questionScoresJson = "{}";
        }
    }

    @Transient
    @SuppressWarnings("unchecked")
    public Map<String, Object> getQuestionFeedback() {
        if (questionFeedbackJson == null || questionFeedbackJson.isBlank()) return new java.util.LinkedHashMap<>();
        try {
            return MAPPER.readValue(questionFeedbackJson, Map.class);
        } catch (Exception e) {
            return new java.util.LinkedHashMap<>();
        }
    }

    @Transient
    public void setQuestionFeedback(Object feedback) {
        try {
            this.questionFeedbackJson = MAPPER.writeValueAsString(feedback);
        } catch (Exception e) {
            this.questionFeedbackJson = "{}";
        }
    }
}
