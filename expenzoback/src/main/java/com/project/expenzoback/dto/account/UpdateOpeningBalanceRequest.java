package com.project.expenzoback.dto.account;

import java.math.BigDecimal;

public class UpdateOpeningBalanceRequest {

    private BigDecimal openingBalance;

    public BigDecimal getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(BigDecimal openingBalance) {
        this.openingBalance = openingBalance;
    }
}
