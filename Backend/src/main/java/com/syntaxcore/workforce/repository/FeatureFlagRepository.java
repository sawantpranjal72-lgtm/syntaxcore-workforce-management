package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {
    List<FeatureFlag> findByDeletedFalse();
    Optional<FeatureFlag> findByKeyAndDeletedFalse(String key);
}
