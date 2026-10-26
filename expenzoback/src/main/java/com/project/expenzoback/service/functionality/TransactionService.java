package com.project.expenzoback.service.functionality;

import com.project.expenzoback.dto.transaction.BalanceResponse;
import com.project.expenzoback.dto.transaction.CreateTransactionRequest;
import com.project.expenzoback.dto.transaction.TransactionResponse;
import com.project.expenzoback.model.functionality.account.Accounts;
import com.project.expenzoback.model.functionality.transaction.Transactions;
import com.project.expenzoback.repository.AccountsRepo;
import com.project.expenzoback.repository.TransactionsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class TransactionService {

    @Autowired
    private TransactionsRepo transactionsRepo;

    @Autowired
    private AccountsRepo accountsRepo;

    public TransactionResponse createTransaction(Long userId , Long accountId , CreateTransactionRequest request){

        Accounts account = accountsRepo.findByIdAndUser_Id(accountId,userId)
                .orElseThrow(()-> new RuntimeException("Account not found"));

        validateTransaction(request);

        Transactions transaction = new Transactions();

        transaction.setAccount(account);

        transaction.setType(request.getType());

        transaction.setAmount(request.getAmount());

        transaction.setCategory(request.getCategory());

        transaction.setNote(request.getNote());

        transaction.setTransactionDate(request.getTransactionDate());

        Transactions saved = transactionsRepo.save(transaction);
        return convertToResponse(saved);
    }

    public List<TransactionResponse> getTransactions(Long userId , Long accountId){

        accountsRepo.findByIdAndUser_Id(accountId,userId)
                .orElseThrow(()->new RuntimeException("Account not found!"));

        return transactionsRepo
                .findAllByAccount_Id(accountId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public List<TransactionResponse> getAllTransactions(Long userId){
        return transactionsRepo
                .findAllByAccount_User_IdOrderByTransactionDateDesc(userId)
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    public TransactionResponse getTransaction(Long userId , Long accountId , Long transactionId){
        accountsRepo.findByIdAndUser_Id(accountId, userId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        Transactions transaction = transactionsRepo.findByIdAndAccount_Id(transactionId, accountId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));

        return convertToResponse(transaction);
    }

    private void validateTransaction(CreateTransactionRequest request)
    {
        if(request.getType()==null)
        {
            throw new RuntimeException("Transaction type required");
        }

        if(request.getAmount()==null || request.getAmount().compareTo(BigDecimal.ZERO)<=0)
        {
            throw new RuntimeException("Amount must be greater than zero");
        }

        if(request.getTransactionDate()==null)
        {
            throw new RuntimeException("Transaction date required");
        }
    }

    private TransactionResponse convertToResponse(Transactions transaction)
    {
        TransactionResponse response = new TransactionResponse();

        response.setId(transaction.getId());

        response.setType(transaction.getType());

        response.setAmount(transaction.getAmount());

        response.setCategory(transaction.getCategory());

        response.setNote(transaction.getNote());

        response.setTransactionDate(transaction.getTransactionDate());

        response.setAccountId(transaction.getAccount().getId());

        response.setAccountName(transaction.getAccount().getName());

        response.setCurrency(transaction.getAccount().getCurrency());

        return response;
    }

    public BalanceResponse getBalance(Long userId , Long accountId){

        Accounts account = accountsRepo.findByIdAndUser_Id(accountId, userId)
                .orElseThrow(()->new RuntimeException("Account not found"));

        BigDecimal income = transactionsRepo.getTotalIncome(accountId);

        BigDecimal expense = transactionsRepo.getTotalExpense(accountId);

        BigDecimal currentBalance = account.getOpeningBalance().add(income).subtract(expense);

        BalanceResponse response = new BalanceResponse();

        response.setOpeningBalance(account.getOpeningBalance());

        response.setTotalIncome(income);

        response.setTotalExpense(expense);

        response.setCurrentBalance(currentBalance);

        return response;
    }

}
