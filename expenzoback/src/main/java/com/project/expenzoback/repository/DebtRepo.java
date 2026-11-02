package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.debt.Debt;
import com.project.expenzoback.model.functionality.debt.DebtStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DebtRepo extends JpaRepository<Debt,Long> {

    List<Debt> findAllByAccount_IdOrderByCreatedAtDesc(Long accountId);

    List<Debt> findAllByAccount_User_IdOrderByCreatedAtDesc(Long userId);

    List<Debt> findAllByStatus(DebtStatus status);

}
