package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.loan.LoanPayments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanPaymentsRepo extends JpaRepository<LoanPayments,Long> {
    List<LoanPayments> findAllByLoan_IdOrderByPaymentDateAsc(
            Long loanId
    );

    List<LoanPayments> findAllByLoan_IdOrderByPaymentDateDesc(
            Long loanId
    );
}
