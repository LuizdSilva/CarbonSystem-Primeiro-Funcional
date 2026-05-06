package com.carbontreesystem.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class SensorLeituraDTO {
    private String sensorId;
    private BigDecimal valorCo2;

}