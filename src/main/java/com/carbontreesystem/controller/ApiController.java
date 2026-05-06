package com.carbontreesystem.controller;

import com.carbontreesystem.dto.DashboardKpiDto;
import com.carbontreesystem.dto.MqttPayloadDto;
import com.carbontreesystem.model.Alert;
import com.carbontreesystem.model.SensorReading;
import com.carbontreesystem.model.Station;
import com.carbontreesystem.repository.SensorReadingRepository;
import com.carbontreesystem.repository.StationRepository;
import com.carbontreesystem.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ApiController {

    private final DashboardService dashboardService;
    private final AlertService alertService;
    private final MqttService mqttService;
    private final CarbonCreditService carbonCreditService;
    private final ReportService reportService; // Adicionado para os relatórios
    private final SensorReadingRepository readingRepo;
    private final StationRepository stationRepo;

    // -- Relatórios e Auditoria (Novo!) --
    @GetMapping("/reports/data")
    public ResponseEntity<Map<String, Object>> getAuditReportData(
            @RequestParam(defaultValue = "7") int days) {
        // Agora o método getAuditData do seu ReportService é utilizado aqui!
        return ResponseEntity.ok(reportService.getAuditData(days));
    }

    @GetMapping("/credits/total")
    public ResponseEntity<Double> getTotalCredits() {
        return ResponseEntity.ok(carbonCreditService.getTotalCredits());
    }

    // -- Dashboards KPIs --
    @GetMapping("/dashboard/kpis")
    public ResponseEntity<DashboardKpiDto> getKpis() {
        return ResponseEntity.ok(dashboardService.getKpis());
    }

    // -- Chart DATA: CO2 das últimas 24 horas agrupados por hora --
    @GetMapping("/charts/co2")
    public ResponseEntity<Map<String, Object>> getCo2Chart(
            @RequestParam(defaultValue = "24") int hours) {
        LocalDateTime from = LocalDateTime.now().minusHours(hours);
        List<SensorReading> readings = readingRepo.findAllSince(from);

        Map<String, Double> grouped = readings.stream()
                .filter(r -> r.getCo2Level() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getRecordedAt().format(DateTimeFormatter.ofPattern("HH:00")),
                        Collectors.averagingDouble(SensorReading::getCo2Level)
                ));

        List<String> labels = new ArrayList<>(new TreeMap<>(grouped).keySet());
        List<Double> data = labels.stream()
                .map(l -> Math.round(grouped.get(l) * 10.0) / 10.0)
                .toList();

        return ResponseEntity.ok(Map.of("labels", labels, "data", data, "unit", "ppm"));
    }

    // -- Chart Data: PM últimas 24h --
    @GetMapping("/charts/pm")
    public ResponseEntity<Map<String, Object>> getPmChart(
            @RequestParam(defaultValue = "24") int hours) {
        LocalDateTime from = LocalDateTime.now().minusHours(hours);
        List<SensorReading> readings = readingRepo.findAllSince(from);

        Map<String, Double> grouped = readings.stream()
                .filter(r -> r.getPmLevel() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getRecordedAt().format(DateTimeFormatter.ofPattern("HH:00")),
                        Collectors.averagingDouble(SensorReading::getPmLevel)
                ));

        List<String> labels = new ArrayList<>(new TreeMap<>(grouped).keySet());
        List<Double> data = labels.stream()
                .map(l -> Math.round(grouped.get(l) * 10.0) / 10.0)
                .toList();

        return ResponseEntity.ok(Map.of("labels", labels, "data", data, "unit", "μg/m³"));
    }

    // -- Chart DATA: Station comparison --
    @GetMapping("/charts/stations")
    public ResponseEntity<Map<String, Object>> getStationComparison() {
        List<Station> stations = stationRepo.findAll();

        List<String> labels = stations.stream()
                .map(Station::getName)
                .toList();

        List<Double> co2Data = stations.stream().map(s -> {
            var r = readingRepo.findLatestByStationId(s.getId());
            return r.map(SensorReading::getCo2Level).orElse(0.0);
        }).toList();

        List<Double> pmData = stations.stream().map(s -> {
            var r = readingRepo.findLatestByStationId(s.getId());
            return r.map(SensorReading::getPmLevel).orElse(0.0);
        }).toList();

        return ResponseEntity.ok(Map.of("labels", labels, "co2", co2Data, "pm", pmData));
    }

    // -- Alertas --
    @GetMapping("/alerts")
    public ResponseEntity<List<Alert>> getAlerts() {
        return ResponseEntity.ok(alertService.getActiveAlerts());
    }

    @PostMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<Void> acknowledge(@PathVariable Long id) {
        alertService.acknowledge(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/mqtt/ingest")
    public ResponseEntity<String> ingestMqtt(@RequestBody MqttPayloadDto payload) {
        mqttService.processPayload(payload);
        return ResponseEntity.ok("OK");
    }

    // -- STATIONS --
    @GetMapping("/stations")
    public ResponseEntity<List<Station>> getStations() {
        return ResponseEntity.ok(stationRepo.findAll());
    }
}