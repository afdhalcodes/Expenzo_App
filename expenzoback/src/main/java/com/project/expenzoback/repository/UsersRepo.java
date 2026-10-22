package com.project.expenzoback.repository;

import com.project.expenzoback.model.security.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsersRepo extends JpaRepository<Users,Long> {

    Optional<Users> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Users findByUsername(String username);
}
