package com.project.expenzoback.service.functionality;

import com.project.expenzoback.dto.loan.*;
import com.project.expenzoback.model.functionality.account.Accounts;
import com.project.expenzoback.model.functionality.loan.LoanPayments;
import com.project.expenzoback.model.functionality.loan.LoanStatus;
import com.project.expenzoback.model.functionality.loan.Loans;
import com.project.expenzoback.model.functionality.transaction.TransactionType;
import com.project.expenzoback.model.functionality.transaction.Transactions;
import com.project.expenzoback.repository.AccountsRepo;
import com.project.expenzoback.repository.LoanPaymentsRepo;
import com.project.expenzoback.repository.LoansRepo;
import com.project.expenzoback.repository.TransactionsRepo;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class LoanService {

    @Autowired
    private LoansRepo loanRepo;

    @Autowired
    private AccountsRepo accountsRepo;

    @Autowired
    private LoanCalculatorService loanCalculatorService;

    @Autowired
    private LoanPaymentsRepo loanPaymentsRepo;

    @Autowired
    private TransactionsRepo transactionsRepo;

    @Transactional
    public LoanResponse createLoan(
            Long userId,
            Long accountId,
            CreateLoanRequest request
    ) {
        Accounts account = findOwnedAccount(accountId, userId);

        validateCreateRequest(request);

        BigDecimal principalAmount = (request.getTotalCost()).subtract(request.getInitialPayment());

        BigDecimal emi =
                loanCalculatorService.calculateEMI(
                        principalAmount,
                        request.getInterestRate(),
                        request.getTenureMonths()
                );

        BigDecimal outStandingPrincipal =
                loanCalculatorService.calculateOutStandingPrincipal(
                        principalAmount,
                        request.getInterestRate(),
                        request.getTenureMonths()
                );

        Loans loan = new Loans();

        loan.setAccount(account);

        loan.setTitle(request.getTitle().trim());

        loan.setLoanType(request.getLoanType());

        loan.setTotalCost(request.getTotalCost());

        loan.setInitialPayment(request.getInitialPayment());

        loan.setPrincipalAmount(principalAmount);

        loan.setInterestRate(request.getInterestRate());

        loan.setTenureMonths(request.getTenureMonths());

        loan.setEmiAmount(emi);

        loan.setOutstandingPrincipal(outStandingPrincipal);

        loan.setStartDate(request.getStartDate());

        loan.setNextDueDate(request.getNextDueDate());

        loan.setStatus(LoanStatus.ACTIVE);

        loan.setNote(cleanNullableText(request.getNote()));

        Loans savedLoan = loanRepo.save(loan);

        return convertToResponse(savedLoan);
    }

    public List<LoanResponse> getLoans(
            Long userId,
            Long accountId
    ) {

        /*
         * Verify account ownership.
         */
        findOwnedAccount(accountId, userId);

        return loanRepo
                .findAllByAccount_Id(accountId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public LoanResponse getLoan(
            Long userId,
            Long accountId,
            Long loanId
    ) {

        Loans loan = findOwnedLoan(loanId, accountId, userId);

        return convertToResponse(loan);
    }


    @Transactional
    public LoanPaymentResponse payLoan(
            Long userId,
            Long accountId,
            Long loanId,
            PayLoanRequest request) {

        Loans loan = findOwnedLoan(loanId, accountId, userId);

        if (loan.getStatus() == LoanStatus.COMPLETED) {
            throw new IllegalStateException("Loan is already completed");
        }

        if (loan.getStatus() == LoanStatus.PAUSED) {
            throw new IllegalStateException("Loan is currently paused");
        }

        LocalDate paymentDate =
                request != null && request.getPaymentDate() != null
                        ? request.getPaymentDate()
                        : LocalDate.now();

        // Outstanding amount here represents total amount payable,
        // including flat interest.
        BigDecimal outstanding = loan.getOutstandingPrincipal()
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal emi = loan.getEmiAmount()
                .setScale(2, RoundingMode.HALF_UP);

        // Do not charge more than the remaining payable amount.
        BigDecimal paymentAmount = emi.min(outstanding);

        LoanPayments loanPayment = new LoanPayments();
        loanPayment.setLoan(loan);
        loanPayment.setAmount(paymentAmount);
        loanPayment.setPaymentDate(paymentDate);
        loanPayment.setNote(
                request != null ? cleanNullableText(request.getNote()) : null
        );

        LoanPayments savedPayment = loanPaymentsRepo.save(loanPayment);

        Transactions transaction = new Transactions();
        transaction.setAccount(loan.getAccount());
        transaction.setType(TransactionType.EXPENSE);
        transaction.setAmount(paymentAmount);
        transaction.setCategory("Loan Payment");
        transaction.setNote("Loan payment: " + loan.getTitle());
        transaction.setTransactionDate(paymentDate.atStartOfDay());

        transactionsRepo.save(transaction);

        BigDecimal newOutstanding = outstanding
                .subtract(paymentAmount)
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        loan.setOutstandingPrincipal(newOutstanding);

        if (newOutstanding.compareTo(BigDecimal.ZERO) == 0) {
            loan.setStatus(LoanStatus.COMPLETED);

            // Keep the existing date if the database column is non-nullable.
            // If your entity allows null, you can instead set it to null.
        } else {
            loan.setNextDueDate(loan.getNextDueDate().plusMonths(1));
        }

        loanRepo.save(loan);

        return convertToPaymentResponse(savedPayment);
    }


    public LoanPaymentPreview getNextPayment(
            Long userId,
            Long accountId,
            Long loanId
    ) {

        Loans loan = findOwnedLoan(
                loanId,
                accountId,
                userId
        );

        if (loan.getStatus() == LoanStatus.COMPLETED) {
            throw new RuntimeException(
                    "Loan is already completed"
            );
        }

        if (loan.getStatus() == LoanStatus.PAUSED) {
            throw new RuntimeException(
                    "Loan is currently paused"
            );
        }

        LoanPaymentPreview response =
                new LoanPaymentPreview();

        response.setLoanId(
                loan.getId()
        );

        response.setAmountDue(
                loan.getEmiAmount()
        );

        response.setDueDate(
                loan.getNextDueDate()
        );

        return response;
    }

    public List<LoanPaymentResponse> getPaymentHistory(
            Long userId,
            Long accountId,
            Long loanId
    ) {
        Loans loan = findOwnedLoan(
                loanId,
                accountId,
                userId
        );

        List<LoanPayments> payments =
                loanPaymentsRepo
                        .findAllByLoan_IdOrderByPaymentDateDesc(
                                loan.getId()
                        );

        return payments.stream()
                .map(this::convertToPaymentResponse)
                .toList();
    }

    private LoanPaymentResponse convertToPaymentResponse(
            LoanPayments payment
    ) {
        LoanPaymentResponse response =
                new LoanPaymentResponse();

        response.setId(
                payment.getId()
        );

        response.setLoanId(
                payment.getLoan().getId()
        );

        response.setAmount(
                payment.getAmount()
        );

        response.setPaymentDate(
                payment.getPaymentDate()
        );

        response.setNote(
                payment.getNote()
        );

        response.setCreatedAt(
                payment.getCreatedAt()
        );

        return response;
    }

    private Loans findOwnedLoan(
            Long loanId,
            Long accountId,
            Long userId
    ) {

        /*
         * First verify that the account belongs
         * to the authenticated user.
         */
        findOwnedAccount(
                accountId,
                userId
        );

        return loanRepo
                .findByIdAndAccount_Id(
                        loanId,
                        accountId
                )
                .orElseThrow(
                        () -> new RuntimeException(
                                "Loan not found"
                        )
                );
    }

    private Accounts findOwnedAccount(
            Long accountId,
            Long userId
    ) {

        return accountsRepo
                .findByIdAndUser_Id(
                        accountId,
                        userId
                )
                .orElseThrow(
                        () -> new RuntimeException(
                                "Account not found"
                        )
                );
    }


    private String cleanNullableText(
            String value
    ) {

        if (value == null
                || value.isBlank()) {

            return null;
        }

        return value.trim();
    }

    private LoanResponse convertToResponse(Loans loan) {

        LoanResponse response = new LoanResponse();

        response.setId(
                loan.getId()
        );

        response.setAccountId(
                loan.getAccount().getId()
        );

        response.setTitle(
                loan.getTitle()
        );

        response.setLoanType(
                loan.getLoanType()
        );

        response.setPrincipalAmount(
                loan.getPrincipalAmount()
        );

        response.setTotalCost(
                loan.getTotalCost()
        );

        response.setInitialPayment(
                loan.getInitialPayment()
        );

        response.setInterestRate(
                loan.getInterestRate()
        );

        response.setTenureMonths(
                loan.getTenureMonths()
        );

        response.setEmiAmount(
                loan.getEmiAmount()
        );

        response.setOutstandingPrincipal(
                loan.getOutstandingPrincipal()
        );

        response.setStartDate(
                loan.getStartDate()
        );

        response.setNextDueDate(
                loan.getNextDueDate()
        );

        response.setStatus(
                loan.getStatus()
        );

        response.setNote(
                loan.getNote()
        );

        response.setCreatedAt(
                loan.getCreatedAt()
        );

        response.setUpdatedAt(
                loan.getUpdatedAt()
        );

        return response;
    }

    private void validateCreateRequest(
            CreateLoanRequest request
    ) {

        if (request == null) {

            throw new RuntimeException(
                    "Loan request is required"
            );
        }

        if (request.getTitle() == null
                || request.getTitle().isBlank()) {

            throw new RuntimeException(
                    "Loan title is required"
            );
        }

        if (request.getLoanType() == null) {

            throw new RuntimeException(
                    "Loan type is required"
            );
        }

        if (request.getTotalCost() == null
                || request.getTotalCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Total cost must be greater than zero");
        }

        if (request.getInitialPayment() == null
                || request.getInitialPayment().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Initial Payment cannot be negative");
        }

        if (request.getInitialPayment().compareTo(request.getTotalCost()) >= 0) {
            throw new RuntimeException("Initial payment must be less than the total cost");
        }

        if (request.getInterestRate() == null
                || request.getInterestRate()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Interest rate cannot be negative"
            );
        }

        if (request.getTenureMonths() == null
                || request.getTenureMonths() <= 0) {

            throw new RuntimeException(
                    "Tenure must be greater than zero"
            );
        }

        if (request.getStartDate() == null) {

            throw new RuntimeException(
                    "Start date is required"
            );
        }

        if (request.getNextDueDate() == null) {

            throw new RuntimeException(
                    "Next due date is required"
            );
        }

        if (request.getNextDueDate()
                .isBefore(request.getStartDate())) {

            throw new RuntimeException(
                    "Next due date cannot be before start date"
            );
        }
    }
}
