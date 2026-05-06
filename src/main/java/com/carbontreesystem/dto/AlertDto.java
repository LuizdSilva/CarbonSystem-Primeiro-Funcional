package com.carbontreesystem.dto;

import com.carbontreesystem.model.Alert;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertDto {
    private Long id;
    private String stationName;
    private Alert.AlertType type;
    private Alert.AlertSeverity severity;
    private String message;
    private Double triggerValue;
    private Double limitValue;
    private boolean acknowledged;
    private LocalDateTime triggeredAt;
}