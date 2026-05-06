package com.carbontreesystem.repository;

import com.carbontreesystem.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByAcknowledgedFalseOrderByTriggeredAtDesc();

    long countByAcknowledgedFalse();

    @Query("SELECT a FROM Alert a WHERE a.triggeredAt >= :since ORDER BY a.triggeredAt DESC")
    List<Alert> findAlertsSince(@Param("since") LocalDateTime since);
}