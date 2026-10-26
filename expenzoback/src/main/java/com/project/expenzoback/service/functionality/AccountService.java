package com.project.expenzoback.service.functionality;

import com.project.expenzoback.dto.account.AccountResponse;
import com.project.expenzoback.dto.account.CreateAccountRequest;
import com.project.expenzoback.model.functionality.Accounts;
import com.project.expenzoback.model.security.Users;
import com.project.expenzoback.repository.AccountsRepo;
import com.project.expenzoback.repository.UsersRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AccountService {

    @Autowired
    private AccountsRepo accountsRepo;

    @Autowired
    private UsersRepo usersRepo;

    public AccountResponse createAccount(Long userId, CreateAccountRequest request){
        Users user = usersRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() == null
                || request.getName().isBlank()) {
            throw new RuntimeException("Account name is required");
        }

        BigDecimal openingBalance =
                request.getOpeningBalance() == null ? BigDecimal.ZERO : request.getOpeningBalance();

        if (openingBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Opening balance cannot be negative"
            );
        }

        Accounts account = new Accounts();
        account.setUser(user);
        account.setName(request.getName().trim());
        account.setOpeningBalance(openingBalance);
        account.setCurrency(
                request.getCurrency().toUpperCase()
        );

        Accounts savedAccount =
                accountsRepo.save(account);

        return convertToResponse(savedAccount);
    }

    public List<AccountResponse> getMyAccounts(Long userId) { //Gets all the account of the user
        return accountsRepo.findAllByUser_Id(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public AccountResponse getAccount(
            Long accountId,
            Long userId
    ) {
        Accounts account = findOwnedAccount(accountId, userId);

        return convertToResponse(account);
    }

    public AccountResponse updateOpeningBalance(
            Long accountId,
            Long userId,
            BigDecimal openingBalance
    ) {
        if (openingBalance == null || openingBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Opening balance must be zero or greater");
        }

        Accounts account = findOwnedAccount(accountId, userId);

        account.setOpeningBalance(openingBalance);

        return convertToResponse(
                accountsRepo.save(account)
        );
    }

    private Accounts findOwnedAccount(Long accountId, Long userId)//Gets the specific account
    {
        return accountsRepo
                .findByIdAndUser_Id(accountId, userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Account not found"
                        )
                );
    }

    private AccountResponse convertToResponse(Accounts account)
    {
        AccountResponse response = new AccountResponse();

        response.setId(account.getId());
        response.setName(account.getName());
        response.setOpeningBalance(
                account.getOpeningBalance()
        );
        response.setCurrency(account.getCurrency());
        response.setCreatedAt(account.getCreatedAt());
        response.setUpdatedAt(account.getUpdatedAt());

        return response;
    }
}
