package com.carbontreesystem.dto;

import com.carbontreesystem.model.Station;  //
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StationStatusDto {
    private Long id;
    private String stationCode;
    private String name;
    private String location;
    private Station.StationStatus status;
    private Double lastCo2;
    private Double lastPm;
    private LocalDateTime lastSeen;
}