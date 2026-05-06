
package com.carbontreesystem.controller;

import com.carbontreesystem.dto.HistoricoCarbonDTO;
import com.carbontreesystem.dto.SensorLeituraDTO;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
@RestController
@RequestMapping("/api/v1/sensores")
@CrossOrigin(origins = "*")
public class SensorController {

    @GetMapping("/historico")
    public List<HistoricoCarbonDTO> obterHistorico() {
        return List.of(
                new HistoricoCarbonDTO(LocalDateTime.now().minusDays(3), new BigDecimal("10.5")),
                new HistoricoCarbonDTO(LocalDateTime.now().minusDays(2), new BigDecimal("15.2")),
                new HistoricoCarbonDTO(LocalDateTime.now().minusDays(1), new BigDecimal("12.8")),
                new HistoricoCarbonDTO(LocalDateTime.now(), new BigDecimal("20.1"))
        );
    }

    @PostMapping("/leitura")
    public String receberLeitura(@RequestBody SensorLeituraDTO leitura) {
        System.out.println("Recebendo dados do Sensor: " + leitura.getSensorId());
        System.out.println("Valor de CO2 capturado: " + leitura.getValorCo2() + " PPM");

        return "Dados recebidos com sucesso pelo CarbonTree System!";
    }
}