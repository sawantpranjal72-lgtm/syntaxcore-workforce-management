package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.WorkingSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkingScheduleRepository extends JpaRepository<WorkingSchedule, Long> {
}
