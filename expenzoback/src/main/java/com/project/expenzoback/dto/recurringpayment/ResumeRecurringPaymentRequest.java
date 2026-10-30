package com.project.expenzoback.dto.recurringpayment;

import java.time.LocalDate;

public class ResumeRecurringPaymentRequest {

    private LocalDate nextDueDate;
    private Integer reminderDaysBefore;

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
}
