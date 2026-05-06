package com.carbontreesystem.service;

import com.carbontreesystem.model.Alert;
import com.carbontreesystem.model.CarbonCredit;
import com.carbontreesystem.model.SensorReading;
import com.carbontreesystem.model.Station;
import com.carbontreesystem.repository.AlertRepository;
import com.carbontreesystem.repository.CarbonCreditRepository;
import com.carbontreesystem.repository.SensorReadingRepository;
import com.carbontreesystem.repository.StationRepository;
import com.itextpdf.text.BaseColor;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Document;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.Font;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfPCell;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final SensorReadingRepository readingRepo;
    private final AlertRepository         alertRepo;
    private final CarbonCreditRepository  creditRepo;
    private final StationRepository       stationRepo;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public byte[] generateAuditReport(int days) throws Exception {
        LocalDateTime from = LocalDateTime.now().minusDays(days);

        List<SensorReading> readings = readingRepo.findAllSince(from);
        List<Alert>         alerts   = alertRepo.findAlertsSince(from);
        List<CarbonCredit>  credits  = creditRepo.findAll();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 36, 36, 54, 36);

        try {
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, BaseColor.DARK_GRAY);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, BaseColor.DARK_GRAY);
            Font normalFont  = FontFactory.getFont(FontFactory.HELVETICA, 10);

            doc.add(new Paragraph("Relatório de Auditoria Ambiental — CarbonTree", titleFont));
            doc.add(new Paragraph(
                    "Período: últimos " + days + " dias  |  Gerado em: "
                            + LocalDateTime.now().format(FMT), normalFont));
            doc.add(Chunk.NEWLINE);

            doc.add(new Paragraph("Resumo Executivo", sectionFont));
            doc.add(new Paragraph("Total de estações:              " + stationRepo.count(), normalFont));
            doc.add(new Paragraph("Estações online:                "
                    + stationRepo.countByStatus(Station.StationStatus.ONLINE), normalFont));
            doc.add(new Paragraph("Leituras no período:            " + readings.size(), normalFont));
            doc.add(new Paragraph("Alertas no período:             " + alerts.size(), normalFont));

            double totalCredits = credits.stream()
                    .mapToDouble(CarbonCredit::getCreditsCalculated).sum();
            doc.add(new Paragraph(
                    String.format("Créditos de carbono acumulados: %.2f", totalCredits), normalFont));
            doc.add(Chunk.NEWLINE);

            if (!alerts.isEmpty()) {
                doc.add(new Paragraph("Alertas do Período", sectionFont));
                doc.add(Chunk.NEWLINE);

                PdfPTable table = new PdfPTable(4);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{2.5f, 2f, 2f, 4f});

                for (String header : new String[]{"Data/Hora", "Estação", "Severidade", "Mensagem"}) {
                    PdfPCell cell = new PdfPCell(new Paragraph(header,
                            FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
                    cell.setBackgroundColor(BaseColor.LIGHT_GRAY);
                    cell.setPadding(5);
                    table.addCell(cell);
                }
                for (Alert a : alerts) {
                    table.addCell(a.getTriggeredAt() != null ? a.getTriggeredAt().format(FMT) : "-");
                    table.addCell(a.getStation()    != null ? a.getStation().getStationCode()  : "N/A");
                    table.addCell(a.getSeverity()   != null ? a.getSeverity().name()           : "-");
                    table.addCell(a.getMessage()    != null ? a.getMessage()                   : "-");
                }
                doc.add(table);
            }
        } finally {
            if (doc.isOpen()) doc.close();
        }
        return out.toByteArray();
    }

    public Map<String, Object> getAuditData(int days) {
        LocalDateTime from = LocalDateTime.now().minusDays(days);
        Map<String, Object> data = new HashMap<>();
        data.put("readings", readingRepo.findAllSince(from));
        data.put("alerts",   alertRepo.findAlertsSince(from));
        data.put("credits",  creditRepo.findAll());
        data.put("stations", stationRepo.findAll());
        data.put("from",     from);
        data.put("to",       LocalDateTime.now());
        return data;
    }
}