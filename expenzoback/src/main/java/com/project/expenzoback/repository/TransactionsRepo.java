package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.transaction.Transactions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionsRepo extends JpaRepository<Transactions,Long> {

    List<Transactions> findAllByAccount_Id(Long accountId);


    Optional<Transactions> findByIdAndAccount_Id(
            Long transactionId,
            Long accountId
    );

    List<Transactions> findAllByAccount_User_IdOrderByTransactionDateDesc(Long userId);

    @Query("""
    SELECT COALESCE(SUM(t.amount),0) FROM Transactions t WHERE t.account.id=:accountId AND t.type='INCOME'
    """)
    BigDecimal getTotalIncome(Long accountId);

    @Query("""
    SELECT COALESCE(SUM(t.amount),0) FROM Transactions t WHERE t.account.id=:accountId AND t.type='EXPENSE'
    """)
    BigDecimal getTotalExpense(Long accountId);
}
