package com.project.expenzoback.dto.debt;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RepayDebtRequest {

    private BigDecimal amount;

    private LocalDate paymentDate;

    private String note;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
