package com.carbontreesystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "stations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String stationCode;

    @Column(nullable = false)
    private String name;

    private String location;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private StationStatus status = StationStatus.OFFLINE;

    private Double latitude;
    private Double longitude;

    private LocalDateTime lastSeen;

    @OneToMany(mappedBy = "station", cascade = CascadeType.ALL)
    private List<SensorReading> readings;

    @OneToMany(mappedBy = "station", cascade = CascadeType.ALL)
    private List<Alert> alerts;

    public enum StationStatus {
        ONLINE, OFFLINE, MAINTENANCE
    }
}