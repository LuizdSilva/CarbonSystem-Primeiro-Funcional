package com.carbontreesystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_readings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    private Double co2Level;
    private Double pmLevel;
    private Double temperature;
    private Double humidity;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ReadingSource source = ReadingSource.MQTT;

    public enum ReadingSource {
        MQTT, SIMULATED, MANUAL
    }
}