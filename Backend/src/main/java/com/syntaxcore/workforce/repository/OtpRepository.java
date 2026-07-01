package com.syntaxcore.workforce.repository;

import com.syntaxcore.workforce.entity.OtpRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpRecord, Long> {

    Optional<OtpRecord> findTopByPhoneAndPurposeAndVerifiedFalseAndUsedFalseOrderByCreatedAtDesc(
            String phone, String purpose);

    Optional<OtpRecord> findByTokenAndUsedFalse(String token);

    @Modifying
    @Query("UPDATE OtpRecord o SET o.used = true WHERE o.phone = :phone AND o.purpose = :purpose AND o.used = false")
    void invalidateAllForPhone(@Param("phone") String phone, @Param("purpose") String purpose);

    @Modifying
    @Query("DELETE FROM OtpRecord o WHERE o.expiresAt < :now")
    void deleteExpired(@Param("now") LocalDateTime now);

    Optional<OtpRecord> findTopByEmailAndPurposeAndVerifiedFalseAndUsedFalseOrderByCreatedAtDesc(
            String email, String purpose);
}
