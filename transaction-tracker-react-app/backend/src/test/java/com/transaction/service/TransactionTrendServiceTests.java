package com.transaction.service;

import com.transaction.dao.TransactionDao;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TransactionTrendServiceTests {
    private final TransactionDao dao = mock(TransactionDao.class);
    private final TransactionService service = new TransactionService(mock(JdbcTemplate.class),
            Clock.fixed(Instant.parse("2026-09-15T12:00:00Z"), ZoneId.of("Asia/Kolkata")));

    TransactionTrendServiceTests() { ReflectionTestUtils.setField(service, "transactionDao", dao); }

    @Test
    void selectedCurrentYearUsesTodayExclusiveEndAndNineMonths() {
        service.getMonthlyTrends(2026, 42L);
        verify(dao).getMonthlyTrends(42L, LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 9, 16), 9, LocalDate.of(2026, 9, 15));
    }

    @Test
    void historicalYearUsesFullCalendarYear() {
        service.getMonthlyTrends(2024, 42L);
        verify(dao).getMonthlyTrends(42L, LocalDate.of(2024, 1, 1),
                LocalDate.of(2025, 1, 1), 12, LocalDate.of(2026, 9, 15));
    }

    @Test
    void futureAndInvalidYearsAreRejectedBeforeQuerying() {
        assertThrows(IllegalArgumentException.class, () -> service.getMonthlyTrends(2027, 42L));
        assertThrows(IllegalArgumentException.class, () -> service.getMonthlyTrends(0, 42L));
        verifyNoInteractions(dao);
    }

    @Test
    void yearlyQueryUsesUserAndReportingCutoff() {
        service.getYearlyTrends(42L);
        verify(dao).getYearlyTrends(42L, LocalDate.of(1, 1, 1),
                LocalDate.of(2026, 9, 16), LocalDate.of(2026, 9, 15));
    }
}
