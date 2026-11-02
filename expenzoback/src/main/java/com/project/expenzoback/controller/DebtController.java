package com.project.expenzoback.controller;

import com.project.expenzoback.dto.debt.CreateDebtRequest;
import com.project.expenzoback.dto.debt.DebtResponse;
import com.project.expenzoback.dto.debt.RepayDebtRequest;
import com.project.expenzoback.service.functionality.DebtService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/debts")
public class DebtController {

    @Autowired
    private DebtService debtService;

    @PostMapping
    public ResponseEntity<DebtResponse> create(
            @RequestParam Long accountId,
            @RequestBody CreateDebtRequest request,
            @AuthenticationPrincipal UserPrincipal principal)
    {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(debtService.create(principal.getUserId(), accountId, request));
    }

    @GetMapping
    public List<DebtResponse> getAll(
            @AuthenticationPrincipal UserPrincipal principal)
    {
        return debtService
                .getAll(principal.getUserId());
    }

    @PostMapping("/{debtId}/repay")
    public DebtResponse repay(
            @PathVariable Long debtId,
            @RequestBody RepayDebtRequest request,
            @AuthenticationPrincipal UserPrincipal principal)
    {
        return debtService.
                repay(principal.getUserId(), debtId, request);
    }

    @DeleteMapping("/{debtId}")
    public ResponseEntity<Void> delete(
            @PathVariable Long debtId,
            @AuthenticationPrincipal UserPrincipal principal)
    {
        debtService.delete(principal.getUserId(), debtId);

        return ResponseEntity.noContent().build();
    }
}
