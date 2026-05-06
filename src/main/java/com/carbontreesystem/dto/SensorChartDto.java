package com.carbontreesystem.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorChartDto {
    private String label;
    private Double value;
    private LocalDateTime timestamp;
    private String stationName;
}