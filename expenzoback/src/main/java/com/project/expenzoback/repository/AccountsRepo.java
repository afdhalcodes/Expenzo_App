package com.project.expenzoback.repository;

import com.project.expenzoback.model.functionality.Accounts;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountsRepo extends JpaRepository<Accounts,Long> {

    List<Accounts> findAllByUser_Id(Long userId);

    Optional<Accounts> findByIdAndUser_Id(
            Long accountId,
            Long userId
    );

    boolean existsByNameIgnoreCaseAndUser_Id(
            String name,
            Long userId
    );

}
