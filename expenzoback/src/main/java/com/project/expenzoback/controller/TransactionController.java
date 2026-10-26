package com.project.expenzoback.controller;

import com.project.expenzoback.dto.transaction.BalanceResponse;
import com.project.expenzoback.dto.transaction.CreateTransactionRequest;
import com.project.expenzoback.dto.transaction.TransactionResponse;
import com.project.expenzoback.service.functionality.TransactionService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @PostMapping("/{accountId}/transactions")
    public ResponseEntity<TransactionResponse> createTransaction(
            @PathVariable Long accountId,
            @RequestBody CreateTransactionRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        TransactionResponse response = transactionService.createTransaction(principal.getUserId(), accountId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{accountId}/transactions")
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        return ResponseEntity.ok(
                transactionService.getTransactions(principal.getUserId(), accountId)
        );
    }

    @GetMapping("/all_transactions")
    public ResponseEntity<List<TransactionResponse>> getAllTransactions(
            @AuthenticationPrincipal UserPrincipal principal)
    {
        return ResponseEntity.ok(
                transactionService.getAllTransactions(principal.getUserId())
        );
    }

    @GetMapping("/{accountId}/transactions/{transactionId}")
    public ResponseEntity<TransactionResponse> getTransaction(
            @PathVariable Long accountId,
            @PathVariable Long transactionId,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        return ResponseEntity.ok(
                transactionService.getTransaction(
                        principal.getUserId(),
                        accountId,
                        transactionId
                )
        );
    }

    @GetMapping("/{accountId}/transactions/balance")
    public ResponseEntity<BalanceResponse> getBalance(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        return ResponseEntity.ok(
                transactionService.getBalance(
                        principal.getUserId(),
                        accountId
                )
        );
    }
}
