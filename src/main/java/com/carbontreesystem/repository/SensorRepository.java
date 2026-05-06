package com.carbontreesystem.repository;

import com.carbontreesystem.model.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorRepository extends JpaRepository<SensorReading, Long> {

    List<SensorReading> findByStationIdOrderByRecordedAtDesc(Long stationId);

    @Query("SELECT r FROM SensorReading r WHERE r.recordedAt >= :since ORDER BY r.recordedAt ASC")
    List<SensorReading> findAllSince(@Param("since") LocalDateTime since);

    @Query("SELECT r FROM SensorReading r WHERE r.station.id = :stationId ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatestByStationId(@Param("stationId") Long stationId);

    @Query("SELECT COUNT(r) FROM SensorReading r WHERE r.recordedAt >= :startOfDay")
    Long countReadingsSince(@Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT AVG(r.co2Level) FROM SensorReading r WHERE r.recordedAt >= :since")
    Double avgCo2Since(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(r.pmLevel) FROM SensorReading r WHERE r.recordedAt >= :since")
    Double avgPmSince(@Param("since") LocalDateTime since);
}