package com.carbontreesystem.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MqttPayloadDto {
    private String stationCode;
    private Double co2Level;
    private Double pmLevel;
    private Double temperature;
    private Double humidity;
    private Long timestamp;
}
