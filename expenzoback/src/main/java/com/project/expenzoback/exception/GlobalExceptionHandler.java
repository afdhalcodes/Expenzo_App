package com.project.expenzoback.exception;

import com.project.expenzoback.dto.error.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {


    @ExceptionHandler(
            UsernameAlreadyExistsException.class
    )
    public ResponseEntity<ApiErrorResponse>
    handleUsernameAlreadyExists(
            UsernameAlreadyExistsException exception
    ) {

        ApiErrorResponse response =
                new ApiErrorResponse(
                        HttpStatus.CONFLICT.value(),
                        "USERNAME_ALREADY_EXISTS",
                        exception.getMessage(),
                        "username"
                );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);

    }

    @ExceptionHandler(
            EmailAlreadyExistsException.class
    )
    public ResponseEntity<ApiErrorResponse>
    handleEmailAlreadyExists(
            EmailAlreadyExistsException exception
    ) {

        ApiErrorResponse response =
                new ApiErrorResponse(
                        HttpStatus.CONFLICT.value(),
                        "EMAIL_ALREADY_EXISTS",
                        exception.getMessage(),
                        "email"
                );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    @ExceptionHandler(
            InvalidCredentialsException.class
    )
    public ResponseEntity<ApiErrorResponse>
    handleInvalidCredentials(
            InvalidCredentialsException exception
    ) {

        ApiErrorResponse response =
                new ApiErrorResponse(
                        HttpStatus.UNAUTHORIZED.value(),
                        "INVALID_CREDENTIALS",
                        exception.getMessage()
                );

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse>
    handleGeneralException(
            Exception exception
    ) {

        exception.printStackTrace();

        ApiErrorResponse response =
                new ApiErrorResponse(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        "INTERNAL_SERVER_ERROR",
                        "Something went wrong. Please try again."
                );

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(response);
    }
}
