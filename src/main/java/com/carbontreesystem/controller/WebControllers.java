package com.carbontreesystem.controller;

import com.carbontreesystem.dto.DashboardKpiDto;
import com.carbontreesystem.repository.SensorReadingRepository;
import com.carbontreesystem.repository.StationRepository;
import com.carbontreesystem.service.AlertService;
import com.carbontreesystem.service.DashboardService;
import com.carbontreesystem.service.ReportService;
import com.carbontreesystem.model.Station;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

// LOGIN E ROOT
@Controller
class LoginController {

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }
}


// DASHBOARD
@Controller
@RequestMapping("/dashboard")
@RequiredArgsConstructor
class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public String dashboard(Model model) {
        DashboardKpiDto kpis = dashboardService.getKpis();
        model.addAttribute("kpis", kpis);
        model.addAttribute("pageTitle", "Dashboard CarbonTree");
        model.addAttribute("currentUri", "/dashboard");
        return "dashboard";
    }
}

// ESTAÇÕES
@Controller
@RequestMapping("/stations")
@RequiredArgsConstructor
class StationsWebController {

    private final StationRepository stationRepo;
    private final SensorReadingRepository readingRepo;

    @GetMapping
    public String listStations(Model model) {
        model.addAttribute("stations", stationRepo.findAll());
        model.addAttribute("pageTitle", "Estações de Monitoramento");
        model.addAttribute("currentUri", "/stations");
        return "stations";
    }

    @GetMapping("/new")
    public String newStation(Model model) {
        model.addAttribute("station", new Station());
        model.addAttribute("pageTitle", "Nova Estação");
        model.addAttribute("currentUri", "/stations");
        return "station-form";
    }

    @GetMapping("/edit/{id}")
    public String editStation(@PathVariable @NonNull Long id, Model model) {
        stationRepo.findById(id).ifPresent(s -> model.addAttribute("station", s));
        model.addAttribute("pageTitle", "Editar Estação");
        model.addAttribute("currentUri", "/stations");
        return "station-form";
    }

    @PostMapping("/save")
    public String saveStation(@ModelAttribute Station station) {
        if (station != null) {
            stationRepo.save(station);
        }
        return "redirect:/stations";
    }

    @PostMapping("/delete/{id}")
    public String deleteStation(@PathVariable Long id) {
        if (id != null) {
            stationRepo.deleteById(id);
        }
        return "redirect:/stations";
    }

    @GetMapping("/{id}")
    public String stationDetail(@PathVariable Long id, Model model) {
        if (id != null) {
            stationRepo.findById(id).ifPresent(s -> {
                model.addAttribute("station", s);
                model.addAttribute("readings",
                    readingRepo.findByStationIdOrderByRecordedAtDesc(id));
            });
        }
        model.addAttribute("pageTitle", "Detalhe da Estação");
        model.addAttribute("currentUri", "/stations");
        return "station-detail";
    }
}

// ALERTAS
@Controller
@RequestMapping("/alerts")
@RequiredArgsConstructor
class AlertController {

    private final AlertService alertService;

    @GetMapping
    public String listAlerts(Model model) {
        model.addAttribute("alerts", alertService.getActiveAlerts());
        model.addAttribute("pageTitle", "Alertas Críticos");
        model.addAttribute("currentUri", "/alerts");
        return "alerts";
    }
}

// RELATÓRIOS
@Controller
@RequestMapping("/reports")
@RequiredArgsConstructor
class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);
    private final ReportService reportService;

    @GetMapping
    public String reportsPage(Model model) {
        model.addAttribute("pageTitle", "Relatórios de Auditoria");
        model.addAttribute("currentUri", "/reports");
        return "reports";
    }

    @GetMapping("/audit/download")
    @SuppressWarnings("null")
    public ResponseEntity<byte[]> downloadAuditReport(
            @RequestParam(defaultValue = "30") int days) {
        try {
            byte[] report = reportService.generateAuditReport(days);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=auditoria.pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(report);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}