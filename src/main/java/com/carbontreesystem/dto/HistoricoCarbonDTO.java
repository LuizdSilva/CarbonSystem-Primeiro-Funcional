package com.carbontreesystem.dto;

import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
public class HistoricoCarbonDTO {
    private final LocalDateTime data;
    private final BigDecimal valor;

    public HistoricoCarbonDTO(LocalDateTime data, BigDecimal valor) {
        this.data = data;
        this.valor = valor;
    }
}