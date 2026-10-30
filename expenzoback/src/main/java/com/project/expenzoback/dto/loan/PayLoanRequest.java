package com.project.expenzoback.dto.loan;

import java.time.LocalDate;

public class PayLoanRequest {

    private LocalDate paymentDate;

    private String note;

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
