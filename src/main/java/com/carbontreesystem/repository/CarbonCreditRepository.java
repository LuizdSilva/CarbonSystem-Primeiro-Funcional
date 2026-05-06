
package com.carbontreesystem.repository;

import com.carbontreesystem.model.CarbonCredit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CarbonCreditRepository extends JpaRepository<CarbonCredit, Long> {

    /** Soma créditos já validados — usado pelo ReportService e endpoint futuro */
    @Query("SELECT COALESCE(SUM(c.creditsCalculated), 0.0) FROM CarbonCredit c WHERE c.validated = true")
    Double sumValidatedCredits();

    /** Soma total de créditos (validados e pendentes) — usado pelo DashboardService */
    @Query("SELECT COALESCE(SUM(c.creditsCalculated), 0.0) FROM CarbonCredit c")
    Double totalCredits();
}