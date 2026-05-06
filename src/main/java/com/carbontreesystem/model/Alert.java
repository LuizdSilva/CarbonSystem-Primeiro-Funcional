package com.carbontreesystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @Column(nullable = false)
    private String message;

    private Double triggerValue;
    private Double limitValue;

    @Builder.Default
    private boolean acknowledged = false;

    private LocalDateTime acknowledgedAt;

    @Column(nullable = false)
    private LocalDateTime triggeredAt;

    public enum AlertType {
        CO2_HIGH, PM_HIGH, SENSOR_OFFLINE, SYSTEM
    }

    public enum AlertSeverity {
        LOW, MEDIUM, HIGH, CRITICAL
    }
}