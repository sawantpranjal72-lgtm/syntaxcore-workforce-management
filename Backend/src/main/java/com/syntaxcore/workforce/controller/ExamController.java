package com.syntaxcore.workforce.controller;

import com.syntaxcore.workforce.entity.Exam;
import com.syntaxcore.workforce.entity.ExamAttempt;
import com.syntaxcore.workforce.entity.ExamViolation;
import com.syntaxcore.workforce.entity.User;
import com.syntaxcore.workforce.exception.ResourceNotFoundException;
import com.syntaxcore.workforce.repository.ExamAttemptRepository;
import com.syntaxcore.workforce.repository.ExamRepository;
import com.syntaxcore.workforce.repository.ExamViolationRepository;
import com.syntaxcore.workforce.repository.UserRepository;
import com.syntaxcore.workforce.service.AccessControlSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Tag(name = "Exam Portal", description = "Online exams: MCQ, short/long answer, and coding questions")
@RestController
@RequestMapping("/api/v1/exams")
@RequiredArgsConstructor
public class ExamController {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamViolationRepository violationRepository;
    private final UserRepository userRepository;
    private final AccessControlSettingsService accessControlSettingsService;
    private final com.syntaxcore.workforce.service.NotificationService notificationService;

    /** Throws 403 unless the calling user's role is currently granted exam-management rights. */
    private void requireExamManagePermission(UserDetails ud) {
        User me = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).orElse(null);
        String role = me != null && me.getRole() != null ? me.getRole().name() : null;
        if (!accessControlSettingsService.canManageExams(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to manage exams");
        }
    }

    // ── List exams (visible to current user's role) ────────────────
    @GetMapping
    @Operation(summary = "List exams visible to the current user")
    public ResponseEntity<List<Map<String, Object>>> getAll(@AuthenticationPrincipal UserDetails ud) {
        User me = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).orElse(null);
        String myRole = me != null && me.getRole() != null ? me.getRole().name() : null;
        boolean isManager = accessControlSettingsService.canManageExams(myRole);

        List<Exam> exams = examRepository.findByDeletedFalseOrderByCreatedAtDesc();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Exam e : exams) {
            // Non-managers only see PUBLISHED/ACTIVE/COMPLETED exams targeted to their role
            if (!isManager) {
                if ("DRAFT".equals(e.getStatus())) continue;
                List<String> targets = e.getTargetRoles();
                if (!targets.isEmpty() && !targets.contains("ALL") && me != null
                        && !targets.contains(me.getRole().name())) continue;
            }
            result.add(toSummary(e, me));
        }
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toSummary(Exam e, User me) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId().toString());
        m.put("title", e.getTitle());
        m.put("description", e.getDescription());
        m.put("subject", e.getSubject());
        m.put("totalMarks", e.getTotalMarks());
        m.put("passingMarks", e.getPassingMarks());
        m.put("durationMinutes", e.getDurationMinutes());
        m.put("status", e.getStatus());
        m.put("startTime", e.getStartTime());
        m.put("endTime", e.getEndTime());
        m.put("targetRoles", e.getTargetRoles());
        m.put("questionCount", e.getQuestionCount());
        if (e.getExamCreator() != null) {
            m.put("createdBy", Map.of("fullName", e.getExamCreator().getFullName()));
        }
        if (me != null) {
            attemptRepository.findByExamIdAndUserId(e.getId(), me.getId()).ifPresent(a -> {
                Map<String, Object> attempt = new LinkedHashMap<>();
                attempt.put("score", a.getScore());
                attempt.put("status", a.getStatus());
                m.put("myAttempt", attempt);
            });
        }
        return m;
    }

    // ── Get single exam (for taking or editing) ─────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Get exam details (with questions for taking/editing)")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable UUID id, @AuthenticationPrincipal UserDetails ud) {
        Exam e = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        User me = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).orElse(null);
        String myRole = me != null && me.getRole() != null ? me.getRole().name() : null;
        boolean isManager = accessControlSettingsService.canManageExams(myRole);

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId().toString());
        m.put("title", e.getTitle());
        m.put("description", e.getDescription());
        m.put("subject", e.getSubject());
        m.put("totalMarks", e.getTotalMarks());
        m.put("passingMarks", e.getPassingMarks());
        m.put("durationMinutes", e.getDurationMinutes());
        m.put("status", e.getStatus());
        m.put("startTime", e.getStartTime());
        m.put("endTime", e.getEndTime());
        m.put("targetRoles", e.getTargetRoles());
        m.put("settings", e.getSettings());

        // For candidates taking the exam, strip "isCorrect" flags and model answers
        List<Map<String, Object>> questions = e.getQuestions();
        if (!isManager) {
            List<Map<String, Object>> sanitized = new ArrayList<>();
            for (Map<String, Object> q : questions) {
                Map<String, Object> sq = new LinkedHashMap<>(q);
                sq.remove("expectedAnswer");
                sq.remove("testCases");
                Object opts = sq.get("options");
                if (opts instanceof List<?> optList) {
                    List<Map<String, Object>> cleanOpts = new ArrayList<>();
                    for (Object o : optList) {
                        if (o instanceof Map<?, ?> om) {
                            Map<String, Object> co = new LinkedHashMap<>();
                            co.put("id", om.get("id"));
                            co.put("text", om.get("text"));
                            cleanOpts.add(co);
                        }
                    }
                    sq.put("options", cleanOpts);
                }
                sanitized.add(sq);
            }
            m.put("questions", sanitized);
        } else {
            m.put("questions", questions);
        }
        return ResponseEntity.ok(m);
    }

    // ── Create exam ──────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new exam (draft or published) — requires exam-management permission")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);
        Exam e = fromBody(new Exam(), body);
        userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).ifPresent(e::setExamCreator);
        Exam saved = examRepository.save(e);
        return ResponseEntity.ok(Map.of("id", saved.getId().toString(), "status", saved.getStatus()));
    }

    // ── Update exam ──────────────────────────────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update an exam — requires exam-management permission")
    public ResponseEntity<Map<String, Object>> update(@PathVariable UUID id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);
        Exam e = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        e = fromBody(e, body);
        Exam saved = examRepository.save(e);
        return ResponseEntity.ok(Map.of("id", saved.getId().toString(), "status", saved.getStatus()));
    }

    // ── Delete exam ──────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Soft-delete an exam — requires exam-management permission")
    public ResponseEntity<Map<String, String>> delete(@PathVariable UUID id, @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);
        Exam e = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        e.setDeleted(true);
        examRepository.save(e);
        return ResponseEntity.ok(Map.of("message", "Exam deleted"));
    }

    @SuppressWarnings("unchecked")
    private Exam fromBody(Exam e, Map<String, Object> body) {
        if (body.get("title") != null) e.setTitle((String) body.get("title"));
        if (body.get("description") != null) e.setDescription((String) body.get("description"));
        if (body.get("subject") != null) e.setSubject((String) body.get("subject"));
        if (body.get("durationMinutes") != null) e.setDurationMinutes(((Number) body.get("durationMinutes")).intValue());
        if (body.get("totalMarks") != null) e.setTotalMarks(((Number) body.get("totalMarks")).doubleValue());
        if (body.get("passingMarks") != null) e.setPassingMarks(((Number) body.get("passingMarks")).doubleValue());
        if (body.get("status") != null) e.setStatus((String) body.get("status"));
        if (body.get("startTime") != null && !body.get("startTime").toString().isBlank()) {
            e.setStartTime(LocalDateTime.parse(body.get("startTime").toString()));
        }
        if (body.get("endTime") != null && !body.get("endTime").toString().isBlank()) {
            e.setEndTime(LocalDateTime.parse(body.get("endTime").toString()));
        }
        if (body.get("targetRoles") != null) {
            e.setTargetRoles((List<String>) body.get("targetRoles"));
        }
        if (body.get("questions") != null) {
            e.setQuestions(body.get("questions"));
        }
        if (body.get("settings") != null) {
            e.setSettings(body.get("settings"));
        }
        return e;
    }

    // ── Submit exam attempt ──────────────────────────────────────
    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit exam answers — auto-scores MCQ as a starting suggestion only; the instructor finalizes marks and pass/fail during grading")
    public ResponseEntity<Map<String, Object>> submit(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        Exam exam = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", ud.getUsername()));

        String myRole = user.getRole() != null ? user.getRole().name() : null;
        if (!accessControlSettingsService.canTakeExams(myRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to take exams");
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> answers = (List<Map<String, Object>>) body.getOrDefault("answers", List.of());
        int violations = body.get("violations") != null ? ((Number) body.get("violations")).intValue() : 0;
        Integer timeTaken = body.get("timeSpent") != null ? ((Number) body.get("timeSpent")).intValue() : null;

        // Auto-score MCQ questions only as a starting suggestion for the
        // instructor — this is NOT the final grade. SHORT/LONG/CODING answers
        // are left ungraded (no marks awarded) until the instructor reviews
        // them. Pass/fail is intentionally NOT decided here: it is only set
        // once an instructor finalizes grading via PUT /attempts/{id}/grade.
        List<Map<String, Object>> questions = exam.getQuestions();
        Map<String, Object> suggestedScores = new LinkedHashMap<>();
        double suggestedTotal = 0;
        for (Map<String, Object> q : questions) {
            String qid = String.valueOf(q.get("id"));
            String type = String.valueOf(q.get("type"));
            double marks = q.get("marks") != null ? ((Number) q.get("marks")).doubleValue() : 0;

            Optional<Map<String, Object>> ansOpt = answers.stream()
                .filter(a -> qid.equals(String.valueOf(a.get("questionId"))))
                .findFirst();
            if (ansOpt.isEmpty()) { suggestedScores.put(qid, 0); continue; }
            Map<String, Object> ans = ansOpt.get();

            double awarded = 0;
            if ("MCQ".equals(type)) {
                Object optsObj = q.get("options");
                if (optsObj instanceof List<?> opts) {
                    for (Object o : opts) {
                        if (o instanceof Map<?, ?> om) {
                            boolean correct = Boolean.TRUE.equals(om.get("isCorrect"));
                            if (correct && String.valueOf(om.get("id")).equals(String.valueOf(ans.get("mcqOptionId")))) {
                                awarded = marks;
                            }
                        }
                    }
                }
            }
            // SHORT/LONG/CODING: left at 0 — awaiting instructor judgment.
            suggestedScores.put(qid, awarded);
            suggestedTotal += awarded;
        }

        ExamAttempt attempt = attemptRepository.findByExamIdAndUserId(id, user.getId())
            .orElseGet(() -> ExamAttempt.builder().exam(exam).user(user).build());

        attempt.setAnswers(answers);
        attempt.setQuestionScores(suggestedScores);
        attempt.setScore(suggestedTotal);          // suggested only — instructor can change every value
        attempt.setMaxScore(exam.getTotalMarks());
        attempt.setPassed(false);                  // not decided until graded
        attempt.setAnsweredCount(answers.size());
        attempt.setTotalQuestions(questions.size());
        attempt.setViolationCount(violations);
        attempt.setTimeTakenSeconds(timeTaken);
        attempt.setStatus("SUBMITTED");             // pending instructor review — NOT a final result
        attempt.setSubmittedAt(LocalDateTime.now());
        attemptRepository.save(attempt);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("submitted", true);
        result.put("status", "SUBMITTED");
        result.put("answeredCount", answers.size());
        result.put("message", "Your exam has been submitted and is awaiting instructor review. Your final score and result will be available once grading is complete.");
        return ResponseEntity.ok(result);
    }

    // ── Record anti-cheat violation ──────────────────────────────
    @PostMapping("/{id}/violations")
    @Operation(summary = "Record an anti-cheat violation during an exam attempt")
    public ResponseEntity<Map<String, String>> recordViolation(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {

        Exam exam = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        User user = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername()).orElse(null);

        ExamViolation v = ExamViolation.builder()
            .exam(exam)
            .user(user)
            .reason(String.valueOf(body.getOrDefault("reason", "Unknown")))
            .violationCount(body.get("count") != null ? ((Number) body.get("count")).intValue() : 1)
            .build();
        violationRepository.save(v);

        return ResponseEntity.ok(Map.of("message", "Violation recorded"));
    }

    // ── Results (for managers) ────────────────────────────────────
    @GetMapping("/{id}/results")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all attempt results for an exam — requires exam-management permission")
    public ResponseEntity<Map<String, Object>> getResults(@PathVariable UUID id, @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);
        Exam exam = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        List<ExamAttempt> attempts = attemptRepository.findByExamIdOrderBySubmittedAtDesc(id);

        List<Map<String, Object>> results = new ArrayList<>();
        for (ExamAttempt a : attempts) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", a.getId().toString());
            r.put("candidateName", a.getUser().getFullName());
            r.put("candidateRole", a.getUser().getRole() != null ? a.getUser().getRole().name() : "EMPLOYEE");
            r.put("candidateEmail", a.getUser().getEmail());
            r.put("status", a.getStatus());
            r.put("score", a.getScore());
            r.put("totalMarks", exam.getTotalMarks());
            r.put("passingMarks", exam.getPassingMarks());
            r.put("passed", a.isPassed());
            r.put("answeredCount", a.getAnsweredCount());
            r.put("totalQuestions", a.getTotalQuestions());
            r.put("violations", a.getViolationCount());
            r.put("submittedAt", a.getSubmittedAt());
            r.put("timeTaken", a.getTimeTakenSeconds());
            results.add(r);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", exam.getTitle());
        response.put("results", results);
        return ResponseEntity.ok(response);
    }

    // ── Full attempt detail for instructor review (question-by-question) ──
    @GetMapping("/{id}/attempts/{attemptId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get one candidate's full attempt — every question paired with their answer, the model answer/correct option, and any marks already awarded. Requires exam-management permission.")
    public ResponseEntity<Map<String, Object>> getAttemptDetail(
            @PathVariable UUID id,
            @PathVariable UUID attemptId,
            @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);

        Exam exam = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        ExamAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("ExamAttempt", attemptId.toString()));
        if (!attempt.getExam().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This attempt does not belong to the specified exam");
        }

        List<Map<String, Object>> answers = attempt.getAnswers();
        Map<String, Object> questionScores = attempt.getQuestionScores();
        Map<String, Object> questionFeedback = attempt.getQuestionFeedback();

        // Build a combined view: each question alongside the candidate's own
        // answer, the correct answer / model solution (visible to the
        // instructor only — never sent to the candidate), and any marks
        // already on record for it.
        List<Map<String, Object>> review = new ArrayList<>();
        for (Map<String, Object> q : exam.getQuestions()) {
            String qid = String.valueOf(q.get("id"));
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("questionId", qid);
            entry.put("type", q.get("type"));
            entry.put("text", q.get("text"));
            entry.put("marks", q.get("marks"));
            entry.put("options", q.get("options"));            // includes isCorrect — instructor view only
            entry.put("expectedAnswer", q.get("expectedAnswer"));
            entry.put("codeTemplate", q.get("codeTemplate"));
            entry.put("testCases", q.get("testCases"));

            Map<String, Object> candidateAnswer = answers.stream()
                .filter(a -> qid.equals(String.valueOf(a.get("questionId"))))
                .findFirst()
                .orElse(null);
            entry.put("candidateAnswer", candidateAnswer);
            entry.put("awardedMarks", questionScores.getOrDefault(qid, null));
            entry.put("questionFeedback", questionFeedback.getOrDefault(qid, null));
            review.add(entry);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("attemptId", attempt.getId().toString());
        response.put("examTitle", exam.getTitle());
        response.put("totalMarks", exam.getTotalMarks());
        response.put("passingMarks", exam.getPassingMarks());
        response.put("candidateName", attempt.getUser().getFullName());
        response.put("candidateRole", attempt.getUser().getRole() != null ? attempt.getUser().getRole().name() : "EMPLOYEE");
        response.put("candidateEmail", attempt.getUser().getEmail());
        response.put("status", attempt.getStatus());
        response.put("score", attempt.getScore());
        response.put("passed", attempt.isPassed());
        response.put("violations", attempt.getViolationCount());
        response.put("timeTaken", attempt.getTimeTakenSeconds());
        response.put("submittedAt", attempt.getSubmittedAt());
        response.put("instructorFeedback", attempt.getInstructorFeedback());
        response.put("gradedBy", attempt.getGradedBy() != null ? attempt.getGradedBy().getFullName() : null);
        response.put("gradedAt", attempt.getGradedAt());
        response.put("questions", review);
        return ResponseEntity.ok(response);
    }

    // ── Instructor finalizes grading ───────────────────────────────
    @PutMapping("/{id}/attempts/{attemptId}/grade")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Instructor assigns marks per question and finalizes the candidate's score and pass/fail result. Requires exam-management permission.")
    public ResponseEntity<Map<String, Object>> gradeAttempt(
            @PathVariable UUID id,
            @PathVariable UUID attemptId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserDetails ud) {
        requireExamManagePermission(ud);

        Exam exam = examRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Exam", id.toString()));
        ExamAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new ResourceNotFoundException("ExamAttempt", attemptId.toString()));
        if (!attempt.getExam().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This attempt does not belong to the specified exam");
        }

        User instructor = userRepository.findByEmailIgnoreCaseAndDeletedFalse(ud.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", ud.getUsername()));

        @SuppressWarnings("unchecked")
        Map<String, Object> questionScores = (Map<String, Object>) body.getOrDefault("questionScores", Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> questionFeedback = (Map<String, Object>) body.getOrDefault("questionFeedback", Map.of());
        String overallFeedback = (String) body.get("instructorFeedback");

        // The instructor's per-question marks are the source of truth — sum
        // them for the final score rather than trusting any earlier
        // auto-graded suggestion, since the instructor may have changed any
        // of them (including MCQ, e.g. if a question is later voided).
        double finalScore = 0;
        for (Object v : questionScores.values()) {
            if (v instanceof Number n) finalScore += n.doubleValue();
        }
        finalScore = Math.max(0, Math.min(finalScore, exam.getTotalMarks()));

        attempt.setQuestionScores(questionScores);
        attempt.setQuestionFeedback(questionFeedback);
        attempt.setInstructorFeedback(overallFeedback);
        attempt.setScore(finalScore);
        attempt.setMaxScore(exam.getTotalMarks());
        attempt.setPassed(finalScore >= exam.getPassingMarks());
        attempt.setStatus("GRADED");
        attempt.setGradedBy(instructor);
        attempt.setGradedAt(LocalDateTime.now());
        attemptRepository.save(attempt);

        // Notify the candidate their result is ready.
        String title = "Exam Result Available";
        String msg = "Your result for '" + exam.getTitle() + "' has been graded: "
            + finalScore + "/" + exam.getTotalMarks() + " — "
            + (attempt.isPassed() ? "PASSED" : "FAILED");
        notificationService.sendNotification(
            attempt.getUser(), instructor,
            com.syntaxcore.workforce.enums.NotificationType.SYSTEM_ALERT,
            title, msg, "EXAM", exam.getId()
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("score", finalScore);
        response.put("maxScore", exam.getTotalMarks());
        response.put("passed", attempt.isPassed());
        response.put("status", "GRADED");
        return ResponseEntity.ok(response);
    }
}
