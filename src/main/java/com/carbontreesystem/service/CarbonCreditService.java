package com.carbontreesystem.service;

import com.carbontreesystem.model.CarbonCredit;
import com.carbontreesystem.model.SensorReading;
import com.carbontreesystem.model.Station;
import com.carbontreesystem.repository.CarbonCreditRepository;
import com.carbontreesystem.repository.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CarbonCreditService {

    private final CarbonCreditRepository  creditRepo;
    private final SensorReadingRepository readingRepo;

    @Transactional
    public void gerenciarCalculo(Station station) {
        LocalDateTime desde = LocalDateTime.now().minusDays(7);
        List<SensorReading> leituras = readingRepo.findByStationSince(station, desde);

        if (leituras.isEmpty()) {
            log.warn("Sem leituras para a estação {}", station.getName());
            return;
        }

        double mediaCo2 = leituras.stream()
                .filter(r -> r.getCo2Level() != null)
                .mapToDouble(SensorReading::getCo2Level)
                .average()
                .orElse(0.0);

        double creditoGerado = (1000.0 - mediaCo2) * 0.1;

        if (creditoGerado > 0) {
            CarbonCredit novoCredito = CarbonCredit.builder()
                    .station(station)
                    .creditsCalculated(creditoGerado)
                    .periodReference("Semanal")
                    .calculatedAt(LocalDateTime.now())
                    .build();
           if (novoCredito != null) {
           creditRepo.save(novoCredito);
           log.info("Crédito de {} salvo para a estação {}", creditoGerado, station.getName());
            }
        }
    }

    public double getTotalCredits() {
        Double total = creditRepo.totalCredits();
        return total != null ? total : 0.0;
    }
}