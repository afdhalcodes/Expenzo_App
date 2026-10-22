package com.project.expenzoback.service.security;

import com.project.expenzoback.dto.security.LoginRequest;
import com.project.expenzoback.dto.security.RegisterRequest;
import com.project.expenzoback.exception.EmailAlreadyExistsException;
import com.project.expenzoback.exception.InvalidCredentialsException;
import com.project.expenzoback.exception.UsernameAlreadyExistsException;
import com.project.expenzoback.model.security.Users;
import com.project.expenzoback.repository.UsersRepo;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder(12);

    @Autowired
    private UsersRepo usersRepo;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private HttpServletRequest request;

    @Autowired
    private JWTService JService;

    public String register(RegisterRequest request) {

        if (usersRepo.existsByEmail(
                request.getEmail()
        )) {
            throw new EmailAlreadyExistsException(
                    "Email is already registered"
            );
        }

        if (usersRepo.existsByUsername(
                request.getUsername()
        )) {
            throw new UsernameAlreadyExistsException(
                    "Username already exists"
            );
        }

        Users user = new Users();

        user.setUsername(
                request.getUsername()
        );

        user.setEmail(
                request.getEmail()
        );

        user.setPassword(
                encoder.encode(
                        request.getPassword()
                )
        );

        usersRepo.save(user);

        return "User Registered Successfully";
    }

    public String verify(LoginRequest request) {

        try {

            Authentication authentication =
                    authManager.authenticate(
                            new UsernamePasswordAuthenticationToken(
                                    request.getUsername(),
                                    request.getPassword()
                            )
                    );

            if (!authentication.isAuthenticated()) {
                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            Users dbUser =
                    usersRepo.findByUsername(
                            request.getUsername()
                    );

            if (dbUser == null) {
                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            return JService.generateToken(dbUser);

        } catch (InvalidCredentialsException exception) {

            throw exception;

        } catch (Exception exception) {

            throw new InvalidCredentialsException(
                    "Invalid username or password"
            );
        }
    }

    public String extractToken() {

        String authHeader =
                request.getHeader("Authorization");

        String token = null;
        String username = null;

        if (
                authHeader != null &&
                        authHeader.startsWith("Bearer ")
        ) {

            token = authHeader.substring(7);

            username =
                    JService.extractUsername(token);
        }

        return username;
    }
}
