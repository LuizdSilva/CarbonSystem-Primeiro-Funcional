package com.carbontreesystem.service;

import com.carbontreesystem.model.Alert;
import com.carbontreesystem.model.SensorReading;
import com.carbontreesystem.model.Station;
import com.carbontreesystem.repository.AlertRepository;
import com.carbontreesystem.repository.StationRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepo;

    @Getter
    private final StationRepository stationRepo;

    @Value("${carbontree.co2.limit:1000}")
    private double co2Limit;

    @Value("${carbontree.pm.limit:150}")
    private double pmLimit;

    @Transactional
    public void evaluateReading(SensorReading reading) {
        if (reading.getCo2Level() != null && reading.getCo2Level() > co2Limit) {
            Alert.AlertSeverity severity = reading.getCo2Level() > co2Limit * 1.2
                    ? Alert.AlertSeverity.CRITICAL
                    : Alert.AlertSeverity.HIGH;
            createAlert(
                    reading.getStation(),
                    Alert.AlertType.CO2_HIGH,
                    severity,
                    String.format("CO2 acima do limite: %.1f ppm (limite: %.0f ppm)",
                            reading.getCo2Level(), co2Limit),
                    reading.getCo2Level(),
                    co2Limit
            );
        }
        if (reading.getPmLevel() != null && reading.getPmLevel() > pmLimit) {
            Alert.AlertSeverity severity = reading.getPmLevel() > pmLimit * 1.3
                    ? Alert.AlertSeverity.CRITICAL
                    : Alert.AlertSeverity.HIGH;
            createAlert(
                    reading.getStation(),
                    Alert.AlertType.PM_HIGH,
                    severity,
                    String.format("PM acima do limite: %.1f μg/m³ (limite: %.0f μg/m³)",
                            reading.getPmLevel(), pmLimit),
                    reading.getPmLevel(),
                    pmLimit
            );
        }
    }

    @Transactional
    public void createAlert(Station station, Alert.AlertType type,
                            Alert.AlertSeverity severity, String message,
                            Double trigger, Double limit) {
 
        Alert alert = Alert.builder()
                .station(station)
                .type(type)
                .severity(severity)
                .message(message)
                .triggerValue(trigger)
                .limitValue(limit)
                .acknowledged(false)
                .triggeredAt(LocalDateTime.now())
                .build();
                if (alert != null) {
                 alertRepo.save(alert);
                log.warn("ALERT [{}] {}: {}", severity, station.getStationCode(), message);
}
                            }
    @Transactional
    public void acknowledge(Long alertId) {
     
        if (alertId == null) {
            log.warn("acknowledge chamado com alertId nulo — ignorado.");
            return;
        }
        alertRepo.findById(alertId).ifPresent(a -> {
            a.setAcknowledged(true);
            a.setAcknowledgedAt(LocalDateTime.now());
            alertRepo.save(a);
        });
    }

    public List<Alert> getActiveAlerts() {
        return alertRepo.findByAcknowledgedFalseOrderByTriggeredAtDesc();
    }
}