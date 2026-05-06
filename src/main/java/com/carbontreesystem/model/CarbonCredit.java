package com.carbontreesystem.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "carbon_credits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarbonCredit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    @Column(nullable = false)
    private Double creditsCalculated;

    private String periodReference;
    private String description;
    private LocalDateTime calculatedAt;

    @Builder.Default
    private boolean validated = false;
}