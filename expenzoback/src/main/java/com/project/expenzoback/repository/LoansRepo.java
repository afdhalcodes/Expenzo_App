package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.loan.LoanStatus;
import com.project.expenzoback.model.functionality.loan.Loans;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LoansRepo extends JpaRepository<Loans,Long> {
    List<Loans> findAllByAccount_Id(Long accountId);

    Optional<Loans> findByIdAndAccount_Id(
            Long loanId,
            Long accountId
    );

    List<Loans> findAllByAccount_IdAndStatus(
            Long accountId,
            LoanStatus status
    );

    List<Loans> findByStatusAndNextDueDateLessThanEqual(
            LoanStatus status,
            LocalDate date
    );

    List<Loans> findByStatus(LoanStatus status);
}
