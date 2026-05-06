package com.carbontreesystem.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "conformity_parameters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConformityParameter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String parameterName;

    private Double maxCo2Level;
    private Double maxPmLevel;

    private String legalReference;
    private String description;

    @Builder.Default
    private boolean active = true;
}