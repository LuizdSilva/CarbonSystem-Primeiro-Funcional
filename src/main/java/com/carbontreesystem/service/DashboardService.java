package com.carbontreesystem.service;

import com.carbontreesystem.dto.AlertDto;
import com.carbontreesystem.dto.DashboardKpiDto;
import com.carbontreesystem.dto.SensorChartDto;
import com.carbontreesystem.dto.StationStatusDto;
import com.carbontreesystem.model.SensorReading;
import com.carbontreesystem.model.Station;
import com.carbontreesystem.repository.AlertRepository;
import com.carbontreesystem.repository.CarbonCreditRepository;
import com.carbontreesystem.repository.SensorReadingRepository;
import com.carbontreesystem.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StationRepository stationRepo;
    private final SensorReadingRepository readingRepo;
    private final AlertRepository alertRepo;
    private final CarbonCreditRepository creditRepo;

    private static final DateTimeFormatter HOUR_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public DashboardKpiDto getKpis() {
        LocalDateTime since24h = LocalDateTime.now().minusHours(24);

        long total   = stationRepo.count();
        long online  = stationRepo.countByStatus(Station.StationStatus.ONLINE);
        long offline = stationRepo.countByStatus(Station.StationStatus.OFFLINE);

        Double avgCo2      = readingRepo.avgCo2Since(since24h);
        Double avgPm       = readingRepo.avgPmSince(since24h);
        long activeAlerts  = alertRepo.countByAcknowledgedFalse();
        Double totalCredits = creditRepo.totalCredits();

        long readingsToday = readingRepo.countByRecordedAtAfter(
                LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0));

        return DashboardKpiDto.builder()
                .totalStations(total)
                .onlineStations(online)
                .offlineStations(offline)
                .avgCo2Last24h(round(avgCo2))
                .avgPmLast24h(round(avgPm))
                .activeAlerts(activeAlerts)
                .totalCarbonCredits(totalCredits != null ? round(totalCredits) : 0.0)
                .readingsToday(readingsToday)
                .co2ChartData(buildCo2Chart(since24h))
                .pmChartData(buildPmChart(since24h))
                .stationStatuses(buildStationStatuses())
                .recentAlerts(buildRecentAlerts())
                .build();
    }

    private List<SensorChartDto> buildCo2Chart(LocalDateTime since) {
        return readingRepo.findAllSince(since).stream()
                .map(r -> SensorChartDto.builder()
                        .label(r.getRecordedAt().format(HOUR_FMT))
                        .value(r.getCo2Level())
                        .timestamp(r.getRecordedAt())
                        .stationName(r.getStation().getName())
                        .build())
                .sorted(Comparator.comparing(SensorChartDto::getTimestamp))
                .collect(Collectors.toList());
    }

    private List<SensorChartDto> buildPmChart(LocalDateTime since) {
        return readingRepo.findAllSince(since).stream()
                .map(r -> SensorChartDto.builder()
                        .label(r.getRecordedAt().format(HOUR_FMT))
                        .value(r.getPmLevel())
                        .timestamp(r.getRecordedAt())
                        .stationName(r.getStation().getName())
                        .build())
                .sorted(Comparator.comparing(SensorChartDto::getTimestamp))
                .collect(Collectors.toList());
    }

    private List<StationStatusDto> buildStationStatuses() {
        return stationRepo.findAll().stream().map(station -> {
            Optional<SensorReading> latest = readingRepo.findLatestByStationId(station.getId());
            return StationStatusDto.builder()
                    .id(station.getId())
                    .stationCode(station.getStationCode())
                    .name(station.getName())
                    .location(station.getLocation())
                    .status(station.getStatus())
                    .lastCo2(latest.map(SensorReading::getCo2Level).orElse(null))
                    .lastPm(latest.map(SensorReading::getPmLevel).orElse(null))
                    .lastSeen(station.getLastSeen())
                    .build();
        }).collect(Collectors.toList());
    }

    private List<AlertDto> buildRecentAlerts() {
        return alertRepo.findByAcknowledgedFalseOrderByTriggeredAtDesc()
                .stream().limit(10)
                .map(a -> AlertDto.builder()
                        .id(a.getId())
                        .stationName(a.getStation() != null ? a.getStation().getName() : "N/A")
                        .type(a.getType())
                        .severity(a.getSeverity())
                        .message(a.getMessage())
                        .triggerValue(a.getTriggerValue())
                        .limitValue(a.getLimitValue())
                        .acknowledged(a.isAcknowledged())
                        .triggeredAt(a.getTriggeredAt())
                        .build())
                .collect(Collectors.toList());
    }

    private Double round(Double v) {
        return v == null ? 0.0 : Math.round(v * 10.0) / 10.0;
    }
}