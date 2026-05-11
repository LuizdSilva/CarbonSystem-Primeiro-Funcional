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
import java.util.List;
import java.util.Map;
import com.carbontreesystem.repository.AlertRepository;
import com.carbontreesystem.repository.CarbonCreditRepository;
import com.carbontreesystem.repository.ConformityParameterRepository;
import com.carbontreesystem.repository.UserRepository;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.LinkedHashMap;

// ================================================================
// LOGIN E ROOT
// ================================================================
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

// ================================================================
// DASHBOARD
// ================================================================
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

// ================================================================
// ESTAÇÕES
// ================================================================
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

// ================================================================
// ALERTAS
// ================================================================
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

// ================================================================
// RELATÓRIOS
// ================================================================
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
        try {
            Map<String, Object> auditData = reportService.getAuditData(30);
            model.addAttribute("auditData", auditData);

            List<?> credits = (List<?>) auditData.get("credits");
            double total = credits.stream()
                .mapToDouble(c -> {
                    try {
                        return (double) c.getClass().getMethod("getCreditsCalculated").invoke(c);
                    } catch (Exception e) {
                        return 0.0;
                    }
                }).sum();
            model.addAttribute("totalCredits", total);

        } catch (Exception e) {
            log.error("Erro ao carregar dados do relatório: {}", e.getMessage());
            model.addAttribute("auditData", null);
            model.addAttribute("totalCredits", 0.0);
        }
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
} // ← FIM ReportController

// ================================================================
// BANCO DE DADOS
// ================================================================
@Controller
@RequestMapping("/database")
@RequiredArgsConstructor
class DatabaseWebController {

    private final StationRepository stationRepo;
    private final SensorReadingRepository readingRepo;
    private final AlertRepository alertRepo;
    private final UserRepository userRepo;
    private final CarbonCreditRepository creditRepo;
    private final ConformityParameterRepository conformityRepo;
    private final DataSource dataSource;

    @GetMapping
    public String databasePage(Model model) {
        model.addAttribute("pageTitle", "Banco de Dados");
        model.addAttribute("currentUri", "/database");

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("stations", stationRepo.count());
        counts.put("readings", readingRepo.count());
        counts.put("alerts",   alertRepo.count());
        counts.put("users",    userRepo.count());
        counts.put("credits",  creditRepo.count());
        model.addAttribute("counts", counts);

        Map<String, String> dbInfo = new LinkedHashMap<>();
        String dbStatus = "CONECTADO";
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            dbInfo.put("Banco de Dados", meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion());
            dbInfo.put("URL",            meta.getURL());
            dbInfo.put("Usuário",        meta.getUserName());
            dbInfo.put("Driver",         meta.getDriverName() + " " + meta.getDriverVersion());
            dbInfo.put("Schema padrão",  conn.getSchema() != null ? conn.getSchema() : "public");
        } catch (Exception e) {
            dbStatus = "ERRO: " + e.getMessage();
        }
        model.addAttribute("dbStatus", dbStatus);
        model.addAttribute("dbInfo",   dbInfo);

        model.addAttribute("users",            userRepo.findAll());
        model.addAttribute("conformityParams", conformityRepo.findAll());

        return "database";
    }
} 

// ================================================================
// CALCULADORA EMISSÕES
// ================================================================
@Controller
@RequestMapping("/emissions")
class EmissionsController {

    @GetMapping
    public String emissionsPage(Model model) {
        model.addAttribute("pageTitle", "Calculadora IPCC/LMDI");
        model.addAttribute("currentUri", "/emissions");
        return "emissions";
    }
} 