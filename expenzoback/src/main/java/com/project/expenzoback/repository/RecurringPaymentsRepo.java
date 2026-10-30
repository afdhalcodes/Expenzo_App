package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.recurringpayment.PaymentStatus;
import com.project.expenzoback.model.functionality.recurringpayment.RecurringPayments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringPaymentsRepo extends JpaRepository<RecurringPayments,Long> {

    List<RecurringPayments> findByStatus(PaymentStatus status);

    List<RecurringPayments> findAllByAccount_Id(Long accountId);//All recurring payments for one account

    Optional<RecurringPayments> findByIdAndAccount_Id(Long recurringId, Long accountId); //Verifying ownership

    List<RecurringPayments> findByStatusAndNextDueDateLessThanEqual(PaymentStatus status, LocalDate date);
}
