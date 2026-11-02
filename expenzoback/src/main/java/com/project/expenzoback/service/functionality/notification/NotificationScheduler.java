package com.project.expenzoback.service.functionality.notification;

import com.project.expenzoback.model.functionality.debt.Debt;
import com.project.expenzoback.model.functionality.debt.DebtStatus;
import com.project.expenzoback.model.functionality.loan.LoanStatus;
import com.project.expenzoback.model.functionality.loan.Loans;
import com.project.expenzoback.model.functionality.notification.NotificationType;
import com.project.expenzoback.model.functionality.recurringpayment.PaymentStatus;
import com.project.expenzoback.model.functionality.recurringpayment.RecurringPayments;
import com.project.expenzoback.repository.DebtRepo;
import com.project.expenzoback.repository.LoansRepo;
import com.project.expenzoback.repository.RecurringPaymentsRepo;
import jakarta.transaction.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class NotificationScheduler {

    private final NotificationService notificationService;
    private final LoansRepo loanRepo;
    private final RecurringPaymentsRepo recurringPaymentRepo;
    private final DebtRepo debtRepo;

    public NotificationScheduler(
            NotificationService notificationService,
            LoansRepo loanRepo,
            RecurringPaymentsRepo recurringPaymentRepo,
            DebtRepo debtRepo
    ) {
        this.notificationService = notificationService;
        this.loanRepo = loanRepo;
        this.recurringPaymentRepo = recurringPaymentRepo;
        this.debtRepo = debtRepo;
    }

    @Transactional
    @Scheduled(fixedRate = 60_000)
//    @Scheduled(cron = "0 0 9 * * *")
    public void generateNotifications() {

        LocalDate today = LocalDate.now();

        processRecurringPayments(today);
        processLoans(today);
        processDebts(today);
    }

    private void processRecurringPayments(LocalDate today) {

        List<RecurringPayments> recurringPayments =
                recurringPaymentRepo.findByStatus(PaymentStatus.ACTIVE);

        for (RecurringPayments recurringPayment : recurringPayments) {

            LocalDate reminderDate =
                    recurringPayment.getNextDueDate()
                            .minusDays(
                                    recurringPayment.getReminderDaysBefore()
                            );

            if (!today.isBefore(reminderDate)) {

                Long userId =
                        recurringPayment
                                .getAccount()
                                .getUser()
                                .getId();

                var notification =
                        notificationService.createReminderNotification(
                                userId,
                                NotificationType.RECURRING_PAYMENT_REMINDER,
                                "Your recurring payment '"
                                        + recurringPayment.getTitle()
                                        + "' is due on "
                                        + recurringPayment.getNextDueDate(),
                                recurringPayment.getId(),
                                recurringPayment.getNextDueDate()
                        );

                if (notification != null) {

                    notificationService.sendNotification(
                            userId,
                            notification
                    );
                }
            }
        }
    }

    private void processLoans(LocalDate today) {

        List<Loans> loans =
                loanRepo.findByStatus(LoanStatus.ACTIVE);

        for (Loans loan : loans) {

            LocalDate reminderDate =
                    loan.getNextDueDate()
                            .minusDays(1);

            if (!today.isBefore(reminderDate)) {

                Long userId =
                        loan
                                .getAccount()
                                .getUser()
                                .getId();

                var notification =
                        notificationService.createReminderNotification(
                                userId,
                                NotificationType.LOAN_REMINDER,
                                "Your EMI for '"
                                        + loan.getTitle()
                                        + "' is due on "
                                        + loan.getNextDueDate(),
                                loan.getId(),
                                loan.getNextDueDate()
                        );

                if (notification != null) {

                    notificationService.sendNotification(
                            userId,
                            notification
                    );
                }
            }
        }
    }

    private void processDebts(LocalDate today) {

        List<Debt> debts = debtRepo.findAllByStatus(DebtStatus.ACTIVE);

        for (Debt debt : debts) {

            LocalDate reminderDate = debt.getNextReminderDate();

            if (reminderDate != null && !today.isBefore(reminderDate)) {

                Long userId = debt.getAccount().getUser().getId();

                var notification = notificationService.createReminderNotification(

                        userId, NotificationType.DEBT_REMINDER,
                        "Reminder: you still owe " + debt.getRemainingAmount() + " "
                                + debt.getAccount().getCurrency() + " to " + debt.getPersonName()
                                + " for '" + debt.getTitle() + "'.",
                        debt.getId(), reminderDate
                );

                if (notification != null) notificationService.sendNotification(userId, notification);

                do { reminderDate = reminderDate.plusWeeks(1); } while (!reminderDate.isAfter(today));

                debt.setNextReminderDate(reminderDate);

                debtRepo.save(debt);
            }
        }
    }
}
