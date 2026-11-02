package com.project.expenzoback.dto.debt;

import com.project.expenzoback.model.functionality.debt.Debt;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DebtResponse {

    private Long id;

    private Long accountId;

    private String accountName;

    private String currency;

    private String personName;

    private String title;

    private BigDecimal originalAmount;

    private BigDecimal remainingAmount;

    private LocalDate nextReminderDate;

    private String status;

    private String note;

    public DebtResponse(Debt debt) {
        id = debt.getId();
        accountId = debt.getAccount().getId();
        accountName = debt.getAccount().getName();
        currency = debt.getAccount().getCurrency();
        personName = debt.getPersonName();
        title = debt.getTitle();
        originalAmount = debt.getOriginalAmount();
        remainingAmount = debt.getRemainingAmount();
        nextReminderDate = debt.getNextReminderDate();
        status = debt.getStatus().name();
        note = debt.getNote();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

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

    public BigDecimal getOriginalAmount() {
        return originalAmount;
    }

    public void setOriginalAmount(BigDecimal originalAmount) {
        this.originalAmount = originalAmount;
    }

    public BigDecimal getRemainingAmount() {
        return remainingAmount;
    }

    public void setRemainingAmount(BigDecimal remainingAmount) {
        this.remainingAmount = remainingAmount;
    }

    public LocalDate getNextReminderDate() {
        return nextReminderDate;
    }

    public void setNextReminderDate(LocalDate nextReminderDate) {
        this.nextReminderDate = nextReminderDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
