package com.carbontreesystem.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKpiDto {
    private Long totalStations;
    private Long onlineStations;
    private Long offlineStations;
    private Double avgCo2Last24h;
    private Double avgPmLast24h;
    private Long activeAlerts;
    private Double totalCarbonCredits;
    private Long readingsToday;
    private List<SensorChartDto> co2ChartData;
    private List<SensorChartDto> pmChartData;
    private List<StationStatusDto> stationStatuses;
    private List<AlertDto> recentAlerts;
}