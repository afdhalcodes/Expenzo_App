package com.project.expenzoback.dto.recurringpayment;

import com.project.expenzoback.model.functionality.recurringpayment.PaymentFrequency;
import com.project.expenzoback.model.functionality.recurringpayment.RecurringCategory;

import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateRecurringPaymentRequest {

    private String title;

    private BigDecimal amount;

    private PaymentFrequency frequency;

    private LocalDate nextDueDate;

    private Integer reminderDaysBefore;

    private String note;

    private RecurringCategory category;

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

    public PaymentFrequency getFrequency() {
        return frequency;
    }

    public void setFrequency(PaymentFrequency frequency) {
        this.frequency = frequency;
    }

    public LocalDate getNextDueDate() {
        return nextDueDate;
    }

    public void setNextDueDate(LocalDate nextDueDate) {
        this.nextDueDate = nextDueDate;
    }

    public Integer getReminderDaysBefore() {
        return reminderDaysBefore;
    }

    public void setReminderDaysBefore(Integer reminderDaysBefore) {
        this.reminderDaysBefore = reminderDaysBefore;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public RecurringCategory getCategory() {
        return category;
    }

    public void setCategory(RecurringCategory category) {
        this.category = category;
    }
}
