package com.syntaxcore.workforce.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "departments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Department extends BaseEntity {

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "code", unique = true, length = 20)
    private String code;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    @Builder.Default
    private List<User> employees = new ArrayList<>();

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;
}
