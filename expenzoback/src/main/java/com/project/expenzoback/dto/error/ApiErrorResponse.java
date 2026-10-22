package com.project.expenzoback.dto.error;

import java.util.Map;

public class ApiErrorResponse {

    private int status;
    private String error;
    private String message;
    private String field;
    private Map<String, String> fieldErrors;

    public ApiErrorResponse() {
    }

    public ApiErrorResponse(
            int status,
            String error,
            String message
    ) {
        this.status = status;
        this.error = error;
        this.message = message;
    }

    public ApiErrorResponse(
            int status,
            String error,
            String message,
            String field
    ) {
        this.status = status;
        this.error = error;
        this.message = message;
        this.field = field;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }

    public void setFieldErrors(Map<String, String> fieldErrors) {
        this.fieldErrors = fieldErrors;
    }
}
