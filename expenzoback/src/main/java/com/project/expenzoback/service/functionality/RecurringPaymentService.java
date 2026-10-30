package com.project.expenzoback.service.functionality;

import com.project.expenzoback.dto.recurringpayment.CreateRecurringPaymentRequest;
import com.project.expenzoback.dto.recurringpayment.RecurringPaymentResponse;
import com.project.expenzoback.dto.recurringpayment.ResumeRecurringPaymentRequest;
import com.project.expenzoback.dto.recurringpayment.UpdateRecurringPaymentRequest;
import com.project.expenzoback.model.functionality.account.Accounts;
import com.project.expenzoback.model.functionality.recurringpayment.PaymentFrequency;
import com.project.expenzoback.model.functionality.recurringpayment.PaymentStatus;
import com.project.expenzoback.model.functionality.recurringpayment.RecurringPayments;
import com.project.expenzoback.model.functionality.transaction.TransactionType;
import com.project.expenzoback.model.functionality.transaction.Transactions;
import com.project.expenzoback.repository.AccountsRepo;
import com.project.expenzoback.repository.RecurringPaymentsRepo;
import com.project.expenzoback.repository.TransactionsRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
public class RecurringPaymentService {

    @Autowired
    private RecurringPaymentsRepo recurringPaymentRepo;

    @Autowired
    private AccountsRepo accountsRepo;

    @Autowired
    private TransactionsRepo transactionsRepo;

    private static final int MAX_REMINDER_DAYS = 365;

    @Transactional
    public RecurringPaymentResponse createRecurringPayment(
            Long userId,
            Long accountId,
            CreateRecurringPaymentRequest request
    ) {
        Accounts account = findOwnedAccount(accountId, userId);

        validateCreateRequest(request);

        RecurringPayments recurringPayment = new RecurringPayments();

        recurringPayment.setAccount(account);
        recurringPayment.setTitle(request.getTitle().trim());
        recurringPayment.setAmount(request.getAmount());
        recurringPayment.setFrequency(request.getFrequency());
        recurringPayment.setCategory(request.getCategory());
        recurringPayment.setNextDueDate(request.getNextDueDate());
        recurringPayment.setReminderDaysBefore(
                request.getReminderDaysBefore() == null
                        ? 1
                        : request.getReminderDaysBefore()
        );
        recurringPayment.setNote(cleanNullableText(request.getNote()));
        recurringPayment.setStatus(PaymentStatus.ACTIVE);

        RecurringPayments saved =
                recurringPaymentRepo.save(recurringPayment);

        return convertToResponse(saved);
    }

    public List<RecurringPaymentResponse> getRecurringPayments(
            Long userId,
            Long accountId
    ) {
        findOwnedAccount(accountId, userId);

        return recurringPaymentRepo
                .findAllByAccount_Id(accountId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public RecurringPaymentResponse getRecurringPayment(
            Long userId,
            Long accountId,
            Long recurringPaymentId
    ) {
        RecurringPayments payment = findOwnedRecurringPayment(recurringPaymentId, accountId, userId);

        return convertToResponse(payment);
    }

    @Transactional
    public RecurringPaymentResponse updateRecurringPayment(
            Long userId,
            Long accountId,
            Long recurringPaymentId,
            UpdateRecurringPaymentRequest request
    ) {
        RecurringPayments payment = findOwnedRecurringPayment(recurringPaymentId, accountId, userId);

        validateUpdateRequest(request);

        payment.setTitle(request.getTitle().trim());
        payment.setAmount(request.getAmount());
        payment.setFrequency(request.getFrequency());
        payment.setCategory(request.getCategory());
        payment.setNextDueDate(request.getNextDueDate());
        payment.setReminderDaysBefore(
                request.getReminderDaysBefore() == null
                        ? 1 : request.getReminderDaysBefore()
        );
        payment.setNote(cleanNullableText(request.getNote()));

        RecurringPayments updated = recurringPaymentRepo.save(payment);

        return convertToResponse(updated);
    }

    @Transactional
    public RecurringPaymentResponse pauseRecurringPayment(
            Long userId,
            Long accountId,
            Long recurringPaymentId
    ) {
        RecurringPayments payment = findOwnedRecurringPayment(recurringPaymentId, accountId, userId);

        if (payment.getStatus() == PaymentStatus.PAUSED) {
            throw new RuntimeException("Recurring payment is already paused");
        }

        payment.setStatus(PaymentStatus.PAUSED);

        return convertToResponse(recurringPaymentRepo.save(payment));
    }

    @Transactional
    public RecurringPaymentResponse resumeRecurringPayment(
            Long userId,
            Long accountId,
            Long recurringPaymentId,
            ResumeRecurringPaymentRequest request
    ) {
        RecurringPayments payment = findOwnedRecurringPayment(recurringPaymentId, accountId, userId);

        if (payment.getStatus() == PaymentStatus.ACTIVE) {
            throw new RuntimeException("Recurring payment is already active");
        }

        if (request == null) {
            throw new RuntimeException("Resume request is required");
        }

        if (request.getNextDueDate() == null) {
            throw new RuntimeException("Next due date is required");
        }

        if (request.getNextDueDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Next due date cannot be in the past");
        }

        int reminderDays = request.getReminderDaysBefore() == null
                ? 1 : request.getReminderDaysBefore();

        if (reminderDays < 0) {
            throw new RuntimeException("Reminder days cannot be negative");
        }

        if (reminderDays > MAX_REMINDER_DAYS) {
            throw new RuntimeException("Reminder days cannot exceed " + MAX_REMINDER_DAYS);
        }

        payment.setNextDueDate(request.getNextDueDate());
        payment.setReminderDaysBefore(reminderDays);
        payment.setStatus(PaymentStatus.ACTIVE);

        RecurringPayments updated = recurringPaymentRepo.save(payment);

        return convertToResponse(updated);
    }

    @Transactional
    public RecurringPaymentResponse markAsPaid(
            Long userId,
            Long accountId,
            Long recurringPaymentId
    ) {
        RecurringPayments payment = findOwnedRecurringPayment(recurringPaymentId, accountId, userId);

        if (payment.getStatus() != PaymentStatus.ACTIVE) {
            throw new RuntimeException("Only an active recurring payment can be marked as paid");
        }

        LocalDate paidDate = LocalDate.now();

        createExpenseTransaction(payment, paidDate);

        payment.setLastPaidDate(paidDate);

        LocalDate nextDueDate = calculateNextDueDate(payment.getNextDueDate(), payment.getFrequency());

        payment.setNextDueDate(nextDueDate);

        RecurringPayments updated = recurringPaymentRepo.save(payment);

        return convertToResponse(updated);
    }

    @Transactional
    public void deleteRecurringPayment(
            Long userId,
            Long accountId,
            Long recurringPaymentId
    ) {
        RecurringPayments payment =
                findOwnedRecurringPayment(
                        recurringPaymentId,
                        accountId,
                        userId
                );

        recurringPaymentRepo.delete(payment);
    }

    private void createExpenseTransaction(
            RecurringPayments payment,
            LocalDate paidDate
    ) {
        Transactions transaction = new Transactions();

        transaction.setAccount(payment.getAccount());
        transaction.setType(TransactionType.EXPENSE);
        transaction.setAmount(payment.getAmount());
        transaction.setCategory(payment.getCategory().name());
        transaction.setNote("Recurring payment: " + payment.getTitle());
        transaction.setTransactionDate(paidDate.atStartOfDay());

        transactionsRepo.save(transaction);
    }

    private LocalDate calculateNextDueDate(
            LocalDate currentDueDate,
            PaymentFrequency frequency
    ) {
        if (currentDueDate == null) {
            throw new RuntimeException("Current due date is required");
        }

        if (frequency == null) {
            throw new RuntimeException("Frequency is required");
        }

        return switch (frequency) {
            case DAILY -> currentDueDate.plusDays(1);

            case WEEKLY -> currentDueDate.plusWeeks(1);

            case MONTHLY -> currentDueDate.plusMonths(1);

            case YEARLY -> currentDueDate.plusYears(1);
        };
    }

    private RecurringPayments findOwnedRecurringPayment(
            Long recurringPaymentId,
            Long accountId,
            Long userId
    ) {
        findOwnedAccount(accountId, userId);

        return recurringPaymentRepo
                .findByIdAndAccount_Id(
                        recurringPaymentId,
                        accountId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Recurring payment not found"
                        )
                );
    }

    private Accounts findOwnedAccount(
            Long accountId,
            Long userId
    ) {
        return accountsRepo
                .findByIdAndUser_Id(accountId, userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Account not found"
                        )
                );
    }

    private void validateCreateRequest(
            CreateRecurringPaymentRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Recurring payment request is required"
            );
        }

        validateFields(
                request.getTitle(),
                request.getAmount(),
                request.getFrequency(),
                request.getNextDueDate(),
                request.getReminderDaysBefore()
        );
    }

    private void validateUpdateRequest(
            UpdateRecurringPaymentRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Recurring payment request is required"
            );
        }

        validateFields(
                request.getTitle(),
                request.getAmount(),
                request.getFrequency(),
                request.getNextDueDate(),
                request.getReminderDaysBefore()
        );
    }

    private void validateFields(
            String title,
            BigDecimal amount,
            PaymentFrequency frequency,
            LocalDate nextDueDate,
            Integer reminderDaysBefore
    ) {
        if (title == null || title.isBlank()) {
            throw new RuntimeException(
                    "Title is required"
            );
        }

        if (amount == null
                || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException(
                    "Amount must be greater than zero"
            );
        }

        if (frequency == null) {
            throw new RuntimeException(
                    "Frequency is required"
            );
        }

        if (nextDueDate == null) {
            throw new RuntimeException(
                    "Next due date is required"
            );
        }

        if (nextDueDate.isBefore(LocalDate.now())) {
            throw new RuntimeException(
                    "Next due date cannot be in the past"
            );
        }

        if (reminderDaysBefore != null
                && reminderDaysBefore < 0) {
            throw new RuntimeException(
                    "Reminder days cannot be negative"
            );
        }

        if (reminderDaysBefore != null
                && reminderDaysBefore > MAX_REMINDER_DAYS) {
            throw new RuntimeException(
                    "Reminder days cannot exceed "
                            + MAX_REMINDER_DAYS
            );
        }
    }

    private String cleanNullableText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private RecurringPaymentResponse convertToResponse(
            RecurringPayments payment
    ) {
        RecurringPaymentResponse response = new RecurringPaymentResponse();

        response.setId(payment.getId());

        response.setAccountId(payment.getAccount().getId());

        response.setTitle(payment.getTitle());

        response.setAmount(payment.getAmount());

        response.setFrequency(payment.getFrequency());

        response.setStatus(payment.getStatus());

        response.setNextDueDate(payment.getNextDueDate());

        response.setReminderDaysBefore(payment.getReminderDaysBefore());

        response.setNote(payment.getNote());

        response.setCategory(payment.getCategory());

        response.setLastPaidDate(payment.getLastPaidDate());

        response.setCreatedAt(payment.getCreatedAt());

        response.setUpdatedAt(payment.getUpdatedAt());

        return response;
    }
}
