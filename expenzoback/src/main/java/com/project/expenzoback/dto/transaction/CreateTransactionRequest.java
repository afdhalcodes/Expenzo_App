package com.project.expenzoback.dto.transaction;

import com.project.expenzoback.model.functionality.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CreateTransactionRequest {

    private TransactionType type;

    private BigDecimal amount;

    private String category;

    private String note;

    private LocalDateTime transactionDate;

    public TransactionType getType() {
        return type;
    }

    public void setType(TransactionType type) {
        this.type = type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }
}
