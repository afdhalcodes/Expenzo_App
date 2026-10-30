package com.project.expenzoback.controller;

import com.project.expenzoback.dto.loan.*;
import com.project.expenzoback.service.functionality.LoanService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts/{accountId}/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @PostMapping
    public ResponseEntity<LoanResponse> createLoan(
            @PathVariable Long accountId,
            @RequestBody CreateLoanRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        LoanResponse response =
                loanService.createLoan(
                        userId,
                        accountId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<LoanResponse>> getLoans(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        List<LoanResponse> response =
                loanService.getLoans(
                        userId,
                        accountId
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{loanId}")
    public ResponseEntity<LoanResponse> getLoan(
            @PathVariable Long accountId,
            @PathVariable Long loanId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        LoanResponse response =
                loanService.getLoan(
                        userId,
                        accountId,
                        loanId
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{loanId}/next-payment")
    public ResponseEntity<LoanPaymentPreview> getNextPayment(
            @PathVariable Long accountId,
            @PathVariable Long loanId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        LoanPaymentPreview response =
                loanService.getNextPayment(
                        userId,
                        accountId,
                        loanId
                );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{loanId}/pay")
    public ResponseEntity<LoanPaymentResponse> payLoan(
            @PathVariable Long accountId,
            @PathVariable Long loanId,
            @RequestBody(required = false) PayLoanRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        LoanPaymentResponse response =
                loanService.payLoan(
                        userId,
                        accountId,
                        loanId,
                        request
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{loanId}/payments")
    public ResponseEntity<List<LoanPaymentResponse>> getPaymentHistory(
            @PathVariable Long accountId,
            @PathVariable Long loanId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        Long userId = principal.getUserId();

        List<LoanPaymentResponse> response =
                loanService.getPaymentHistory(
                        userId,
                        accountId,
                        loanId
                );

        return ResponseEntity.ok(response);
    }
}
