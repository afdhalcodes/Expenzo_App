package com.project.expenzoback.dto.debt;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateDebtRequest {

    private String personName;

    private String title;

    private BigDecimal amount;

    private LocalDate firstReminderDate;

    private String note;

    public String getPersonName() {
        return personName;
    }

    public void setPersonName(String personName) {
        this.personName = personName;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public LocalDate getFirstReminderDate() {
        return firstReminderDate;
    }

    public void setFirstReminderDate(LocalDate firstReminderDate) {
        this.firstReminderDate = firstReminderDate;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
