package com.project.expenzoback.service.functionality;

import com.project.expenzoback.dto.debt.CreateDebtRequest;
import com.project.expenzoback.dto.debt.DebtResponse;
import com.project.expenzoback.dto.debt.RepayDebtRequest;
import com.project.expenzoback.model.functionality.account.Accounts;
import com.project.expenzoback.model.functionality.debt.Debt;
import com.project.expenzoback.model.functionality.debt.DebtStatus;
import com.project.expenzoback.model.functionality.transaction.TransactionType;
import com.project.expenzoback.model.functionality.transaction.Transactions;
import com.project.expenzoback.repository.AccountsRepo;
import com.project.expenzoback.repository.DebtRepo;
import com.project.expenzoback.repository.TransactionsRepo;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class DebtService {

    private final DebtRepo debtRepo;

    private final AccountsRepo accountsRepo;

    private final TransactionsRepo transactionsRepo;


    public DebtService(DebtRepo debtRepo, AccountsRepo accountsRepo, TransactionsRepo transactionsRepo) {
        this.debtRepo = debtRepo;
        this.accountsRepo = accountsRepo;
        this.transactionsRepo = transactionsRepo;
    }

    @Transactional
    public DebtResponse create(Long userId, Long accountId, CreateDebtRequest request) {

        Accounts account = ownedAccount(userId, accountId);

        if (request == null || request.getPersonName() == null || request.getPersonName().isBlank())
            throw new RuntimeException("Person name is required");

        if (request.getTitle() == null || request.getTitle().isBlank())
            throw new RuntimeException("Description is required");

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("Amount must be greater than zero");

        if (request.getFirstReminderDate() == null || request.getFirstReminderDate().isBefore(LocalDate.now()))
            throw new RuntimeException("First reminder date must be today or in the future");

        Debt debt = new Debt(); debt.setAccount(account);

        debt.setPersonName(request.getPersonName().trim());

        debt.setTitle(request.getTitle().trim());

        debt.setOriginalAmount(request.getAmount());

        debt.setRemainingAmount(request.getAmount());

        debt.setNextReminderDate(request.getFirstReminderDate());

        debt.setStatus(DebtStatus.ACTIVE);

        debt.setNote(clean(request.getNote()));

        return new DebtResponse(debtRepo.save(debt));
    }

    @Transactional
    public List<DebtResponse> getAll(Long userId) {
        return debtRepo
                .findAllByAccount_User_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(DebtResponse::new)
                .toList();
    }

    @Transactional
    public DebtResponse repay(Long userId, Long debtId, RepayDebtRequest request) {

        Debt debt = debtRepo
                .findById(debtId)
                .orElseThrow(() -> new RuntimeException("Debt not found"));

        if (!debt.getAccount().getUser().getId().equals(userId))
            throw new RuntimeException("Debt not found");

        if (debt.getStatus() != DebtStatus.ACTIVE)
            throw new RuntimeException("This debt is already paid");

        if (request == null || request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new RuntimeException("Repayment amount must be greater than zero");

        if (request.getAmount().compareTo(debt.getRemainingAmount()) > 0)
            throw new RuntimeException("Repayment cannot exceed the remaining amount");

        LocalDate date = request.getPaymentDate() == null ? LocalDate.now() : request.getPaymentDate();

        Transactions transaction = new Transactions();

        transaction.setAccount(debt.getAccount());

        transaction.setType(TransactionType.EXPENSE);

        transaction.setAmount(request.getAmount());

        transaction.setCategory("Debt repayment");

        transaction.setNote("Repayment to " + debt.getPersonName() + " - " + debt.getTitle() + (clean(request.getNote()) == null ? "" : ": " + clean(request.getNote())));

        transaction.setTransactionDate(date.atStartOfDay());

        transactionsRepo.save(transaction);

        BigDecimal remaining = debt.getRemainingAmount().subtract(request.getAmount()); debt.setRemainingAmount(remaining);

        if (remaining.compareTo(BigDecimal.ZERO) == 0)
            debt.setStatus(DebtStatus.PAID);
        else {
            LocalDate next = debt.getNextReminderDate();
            while (!next.isAfter(LocalDate.now())) next = next.plusWeeks(1);
            debt.setNextReminderDate(next);
        }

        return new DebtResponse(debtRepo.save(debt));
    }

    @Transactional
    public void delete(Long userId, Long debtId) {
        Debt debt = debtRepo
                .findById(debtId)
                .orElseThrow(() -> new RuntimeException("Debt not found"));

        if (!debt.getAccount().getUser().getId().equals(userId))
            throw new RuntimeException("Debt not found");

        debtRepo.delete(debt);
    }

    private Accounts ownedAccount(Long userId, Long accountId) {
        return accountsRepo
                .findByIdAndUser_Id(accountId, userId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }
    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
