package com.project.expenzoback.controller;

import com.project.expenzoback.dto.account.AccountResponse;
import com.project.expenzoback.dto.account.CreateAccountRequest;
import com.project.expenzoback.dto.account.UpdateOpeningBalanceRequest;
import com.project.expenzoback.service.functionality.AccountService;
import com.project.expenzoback.service.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(@AuthenticationPrincipal UserPrincipal principal ,
                                                         @RequestBody CreateAccountRequest request){
        AccountResponse response = accountService.createAccount(principal.getUserId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getMyAccounts(@AuthenticationPrincipal UserPrincipal principal)
    {
        return ResponseEntity.ok(
                accountService.getMyAccounts(principal.getUserId())
        );
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable Long accountId,@AuthenticationPrincipal UserPrincipal principal){
        return ResponseEntity.ok(
                accountService.getAccount(accountId, principal.getUserId())
        );
    }

    @PutMapping("/{accountId}/opening-balance")
    public ResponseEntity<AccountResponse> updateOpeningBalance(@PathVariable Long accountId,
                                                                @RequestBody UpdateOpeningBalanceRequest request,
                                                                @AuthenticationPrincipal UserPrincipal principal)
    {
        return ResponseEntity.ok(
                accountService.updateOpeningBalance(
                        accountId,
                        principal.getUserId(),
                        request.getOpeningBalance()
                )
        );
    }

}
