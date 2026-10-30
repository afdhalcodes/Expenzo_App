package com.project.expenzoback.controller;

import com.project.expenzoback.dto.recurringpayment.CreateRecurringPaymentRequest;
import com.project.expenzoback.dto.recurringpayment.RecurringPaymentResponse;
import com.project.expenzoback.dto.recurringpayment.ResumeRecurringPaymentRequest;
import com.project.expenzoback.dto.recurringpayment.UpdateRecurringPaymentRequest;
import com.project.expenzoback.service.functionality.RecurringPaymentService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts/{accountId}/recurring-payments")
public class RecurringPaymentController {

    @Autowired
    private RecurringPaymentService recurringPaymentService;

    @PostMapping
    public ResponseEntity<RecurringPaymentResponse> createRecurringPayment(
            @PathVariable Long accountId,
            @RequestBody CreateRecurringPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        RecurringPaymentResponse response = recurringPaymentService.createRecurringPayment(
                principal.getUserId(), accountId , request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<RecurringPaymentResponse>> getRecurringPayments(
            @PathVariable Long accountId,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        return ResponseEntity.ok(
                recurringPaymentService.getRecurringPayments(
                        principal.getUserId(),
                        accountId
                )
        );
    }

    @GetMapping("/{recurringPaymentId}")
    public ResponseEntity<RecurringPaymentResponse> getRecurringPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @AuthenticationPrincipal UserPrincipal principal
    ){
        return ResponseEntity.ok(
                recurringPaymentService.getRecurringPayment(
                        principal.getUserId(),
                        accountId,
                        recurringPaymentId
                )
        );
    }

    @PutMapping("/{recurringPaymentId}")
    public ResponseEntity<RecurringPaymentResponse> updateRecurringPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @RequestBody UpdateRecurringPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        return ResponseEntity.ok(
                recurringPaymentService.updateRecurringPayment(
                        principal.getUserId(),
                        accountId,
                        recurringPaymentId,
                        request
                )
        );
    }

    @PatchMapping("/{recurringPaymentId}/pause")
    public ResponseEntity<RecurringPaymentResponse> pauseRecurringPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        return ResponseEntity.ok(
                recurringPaymentService.pauseRecurringPayment(
                        principal.getUserId(),
                        accountId,
                        recurringPaymentId
                )
        );
    }

    @PatchMapping("/{recurringPaymentId}/resume")
    public ResponseEntity<RecurringPaymentResponse> resumeRecurringPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @RequestBody ResumeRecurringPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        return ResponseEntity.ok(
                recurringPaymentService.resumeRecurringPayment(
                        principal.getUserId(),
                        accountId,
                        recurringPaymentId,
                        request
                )
        );
    }

    @PatchMapping("/{recurringPaymentId}/pay")
    public ResponseEntity<RecurringPaymentResponse> recordPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        return ResponseEntity.ok(
                recurringPaymentService.markAsPaid(
                        principal.getUserId(),
                        accountId,
                        recurringPaymentId
                )
        );
    }

    @DeleteMapping("/{recurringPaymentId}")
    public ResponseEntity<String> deleteRecurringPayment(
            @PathVariable Long accountId,
            @PathVariable Long recurringPaymentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {

        recurringPaymentService.deleteRecurringPayment(
                principal.getUserId(),
                accountId,
                recurringPaymentId
        );

        return ResponseEntity.ok("Recurring payment deleted successfully");
    }
}
