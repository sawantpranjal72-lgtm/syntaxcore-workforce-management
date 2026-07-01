package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "exam_violations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamViolation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 300)
    private String reason;

    @Column(name = "violation_count")
    private int violationCount;
}
