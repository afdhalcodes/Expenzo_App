package com.project.expenzoback.service.functionality;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class LoanCalculatorService {

    private static final int SCALE = 2;
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    public BigDecimal calculateEMI(BigDecimal principal, BigDecimal annualRate, int tenureMonths) {
        validatePositive(principal, "Principal");
        validateNonNegative(annualRate, "Interest rate");
        if (tenureMonths <= 0) throw new IllegalArgumentException("Tenure must be greater than zero");

        BigDecimal totalInterest = principal.multiply(annualRate)
                .divide(ONE_HUNDRED, 10, RoundingMode.HALF_UP);
        BigDecimal totalPayable = principal.add(totalInterest);
        return totalPayable.divide(BigDecimal.valueOf(tenureMonths), SCALE, RoundingMode.HALF_UP);
    }

    public BigDecimal calculateOutStandingPrincipal(BigDecimal principal, BigDecimal annualRate, int tenureMonths)
    {
        validatePositive(principal, "Principal");
        validateNonNegative(annualRate, "Interest rate");
        if (tenureMonths <= 0) throw new IllegalArgumentException("Tenure must be greater than zero");

        BigDecimal totalInterest = principal.multiply(annualRate)
                .divide(ONE_HUNDRED, 10, RoundingMode.HALF_UP);

        return principal.add(totalInterest);
    }

    private void validatePositive(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException(fieldName + " must be greater than zero");
    }

    private void validateNonNegative(BigDecimal value, String fieldName) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0)
            throw new IllegalArgumentException(fieldName + " cannot be negative");
    }
}
