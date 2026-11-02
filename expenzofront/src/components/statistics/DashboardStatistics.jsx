import { useCallback, useEffect, useRef, useState } from "react";

import { getAccounts } from "../../services/accountService";
import { getAccountBalance, getAllTransactions } from "../../services/transactionService";
import { getLoans } from "../../services/loanService";
import { getRecurringPayments } from "../../services/recurringPaymentService";
import { getDebts } from "../../services/debtService";

import { formatAmount } from "../../utils/formatters";
import "./statistics.css";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const EMPTY_DATA = {
    accounts: [],
    balances: {},
    transactions: [],
    loans: [],
    recurringPayments: [],
    debts: []
};

const CATEGORY_COLORS = [
    "#7a82ff", "#3dd9a0", "#f6b12d", "#ff7185", "#b79cff", "#4fc3f7"
];
const OTHER_COLOR = "#5f6690";

const compactFormat = new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
});

const compact = (value) => compactFormat.format(Number(value || 0));

function isSameMonth(a, b) {
    return (
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
    );
}

function sumByType(transactions, date, type) {
    return transactions
        .filter((transaction) =>
            transaction.type === type &&
            isSameMonth(new Date(transaction.transactionDate), date)
        )
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
}

function percentChange(current, previous) {
    if (!previous || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}

// Last six calendar months (oldest first) with income / expense totals.
function aggregateMonths(transactions) {
    const now = new Date();

    const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);

        return {
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString("en-IN", { month: "short" }),
            fullLabel: date.toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric"
            }),
            current: isSameMonth(date, now),
            income: 0,
            expense: 0
        };
    });

    transactions.forEach((transaction) => {
        const date = new Date(transaction.transactionDate);

        const month = months.find(
            (item) =>
                item.year === date.getFullYear() &&
                item.month === date.getMonth()
        );

        if (!month) return;

        if (transaction.type === "INCOME") {
            month.income += Number(transaction.amount || 0);
        } else if (transaction.type === "EXPENSE") {
            month.expense += Number(transaction.amount || 0);
        }
    });

    return months;
}

// Round a value up to a "nice" axis maximum that divides cleanly by 4.
function niceCeil(value) {
    if (value <= 0) return 4;

    const base = 10 ** Math.floor(Math.log10(value));
    const fraction = value / base;

    const nice =
        fraction <= 1 ? 1 :
        fraction <= 2 ? 2 :
        fraction <= 4 ? 4 :
        fraction <= 8 ? 8 : 10;

    return nice * base;
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICON_PATHS = {
    wallet: (
        <>
            <path d="M3 7a2 2 0 0 1 2-2h13v4" />
            <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
            <path d="M21 9h-4a2 2 0 0 0 0 4h4z" />
        </>
    ),
    income: (
        <>
            <path d="M17 7 7 17" />
            <path d="M17 17H7V7" />
        </>
    ),
    expense: (
        <>
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
        </>
    ),
    savings: (
        <>
            <path d="m3 17 6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
        </>
    ),
    loan: (
        <>
            <path d="M3 21h18" />
            <path d="M5 21V10M9 21V10M15 21V10M19 21V10" />
            <path d="m3 10 9-6 9 6z" />
        </>
    ),
    recurring: (
        <>
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11V9a3 3 0 0 1 3-3h15" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v2a3 3 0 0 1-3 3H3" />
        </>
    ),
    debt: (
        <>
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
        </>
    ),
    refresh: (
        <>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
        </>
    ),
    empty: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12h8" />
        </>
    )
};

function Icon({ name }) {
    return (
        <svg
            className="statistics-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {ICON_PATHS[name]}
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

function DashboardStatistics() {
    const [data, setData] = useState(EMPTY_DATA);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const hasLoadedRef = useRef(false);

    const loadStatistics = useCallback(async () => {
        // First load shows a skeleton; later refreshes keep the charts visible.
        if (hasLoadedRef.current) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const accountsResponse = await getAccounts();
            const accounts = Array.isArray(accountsResponse)
                ? accountsResponse
                : [];

            if (accounts.length === 0) {
                setData(EMPTY_DATA);
                hasLoadedRef.current = true;
                return;
            }

            const [
                transactionsResponse,
                balanceResults,
                loanResults,
                recurringResults,
                debtsResponse
            ] = await Promise.all([
                getAllTransactions(),

                Promise.all(accounts.map(async (account) => {
                    const balance = await getAccountBalance(account.id);

                    return [
                        account.id,
                        Number(
                            balance?.currentBalance ??
                            account.openingBalance ??
                            0
                        )
                    ];
                })),

                Promise.all(accounts.map(async (account) => {
                    const result = await getLoans(account.id);

                    return (Array.isArray(result) ? result : []).map(
                        (loan) => ({
                            ...loan,
                            accountCurrency: account.currency,
                            accountName: account.name
                        })
                    );
                })),

                Promise.all(accounts.map(async (account) => {
                    const result = await getRecurringPayments(account.id);

                    return (Array.isArray(result) ? result : []).map(
                        (payment) => ({
                            ...payment,
                            accountCurrency: account.currency,
                            accountName: account.name
                        })
                    );
                })),

                getDebts()
            ]);

            setData({
                accounts,
                balances: Object.fromEntries(balanceResults),
                transactions: Array.isArray(transactionsResponse)
                    ? transactionsResponse
                    : [],
                loans: loanResults.flat(),
                recurringPayments: recurringResults.flat(),
                debts: Array.isArray(debtsResponse)
                    ? debtsResponse
                    : []
            });

            hasLoadedRef.current = true;
        } catch (err) {
            console.error("Failed to load financial statistics:", err);
            setError(err.message || "Unable to load financial statistics.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadStatistics();

        const handleRefresh = () => loadStatistics();

        window.addEventListener("expenzo:transactions-updated", handleRefresh);
        window.addEventListener("expenzo:statistics-refresh", handleRefresh);

        return () => {
            window.removeEventListener("expenzo:transactions-updated", handleRefresh);
            window.removeEventListener("expenzo:statistics-refresh", handleRefresh);
        };
    }, [loadStatistics]);

    if (loading) {
        return <StatisticsSkeleton />;
    }

    if (error) {
        return (
            <section className="statistics-section">
                <div className="statistics-error">
                    <span>{error}</span>
                    <button type="button" onClick={loadStatistics}>
                        Retry
                    </button>
                </div>
            </section>
        );
    }

    if (data.accounts.length === 0) {
        return null;
    }

    const currency = data.accounts[0]?.currency || "INR";
    const currencyTransactions = data.transactions.filter(
        (transaction) => (transaction.currency || currency) === currency
    );

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const income = sumByType(currencyTransactions, now, "INCOME");
    const expenses = sumByType(currencyTransactions, now, "EXPENSE");
    const previousIncome = sumByType(currencyTransactions, previousMonth, "INCOME");
    const previousExpenses = sumByType(currencyTransactions, previousMonth, "EXPENSE");

    const totalBalance = data.accounts.reduce((sum, account) => {
        if (account.currency !== currency) return sum;
        return sum + Number(
            data.balances[account.id] ?? account.openingBalance ?? 0
        );
    }, 0);

    const activeLoans = data.loans.filter(
        (loan) => loan.status === "ACTIVE"
    );

    const outstandingLoans = activeLoans
        .filter((loan) => (loan.accountCurrency || currency) === currency)
        .reduce(
            (sum, loan) => sum + Number(loan.outstandingPrincipal || 0),
            0
        );

    const net = income - expenses;
    const savingsRate = income > 0 ? (net / income) * 100 : null;

    const monthLabel = now.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });

    return (
        <section className="statistics-section" id="statistics">
            <div className="statistics-heading">
                <div>
                    <span className="statistics-eyebrow">
                        YOUR MONEY · {monthLabel.toUpperCase()}
                    </span>
                    <h2>Financial Overview</h2>
                    <p>Understand your finances at a glance.</p>
                </div>

                <button
                    type="button"
                    className={`statistics-refresh ${refreshing ? "spinning" : ""}`}
                    onClick={loadStatistics}
                    disabled={refreshing}
                >
                    <Icon name="refresh" />
                    {refreshing ? "Refreshing" : "Refresh"}
                </button>
            </div>

            <div className="statistics-summary-grid">
                <SummaryCard
                    hero
                    icon="wallet"
                    label="Total Balance"
                    value={`${currency} ${formatAmount(totalBalance)}`}
                    description="Across accounts in your primary currency"
                />

                <SummaryCard
                    icon="income"
                    label="Income"
                    value={`${currency} ${formatAmount(income)}`}
                    variant="income"
                    delta={
                        <Delta
                            value={percentChange(income, previousIncome)}
                            goodWhenUp
                        />
                    }
                />

                <SummaryCard
                    icon="expense"
                    label="Expenses"
                    value={`${currency} ${formatAmount(expenses)}`}
                    variant="expense"
                    delta={
                        <Delta
                            value={percentChange(expenses, previousExpenses)}
                            goodWhenUp={false}
                        />
                    }
                />

                <SummaryCard
                    icon="savings"
                    label="Savings Rate"
                    value={savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}
                    description={
                        savingsRate === null
                            ? "No income recorded this month"
                            : `${net < 0 ? "−" : ""}${currency} ${formatAmount(Math.abs(net))} net this month`
                    }
                    meter={savingsRate === null ? 0 : Math.min(Math.max(savingsRate, 0), 100)}
                />

                <SummaryCard
                    icon="loan"
                    label="Outstanding Loans"
                    value={`${currency} ${formatAmount(outstandingLoans)}`}
                    description={`${activeLoans.length} active ${activeLoans.length === 1 ? "loan" : "loans"}`}
                />
            </div>

            <div className="statistics-chart-grid">
                <IncomeExpenseChart
                    transactions={currencyTransactions}
                    currency={currency}
                />

                <ExpenseCategoryChart
                    transactions={currencyTransactions}
                    currency={currency}
                />
            </div>

            <MonthlyExpenseTrend
                transactions={currencyTransactions}
                currency={currency}
            />

            <div className="statistics-chart-grid even">
                <LoanProgress loans={data.loans} />

                <UpcomingCommitments
                    loans={data.loans}
                    recurringPayments={data.recurringPayments}
                    debts={data.debts}
                />
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

function StatisticsSkeleton() {
    return (
        <section className="statistics-section" aria-busy="true">
            <div className="statistics-heading">
                <div className="sk-stack">
                    <span className="sk sk-line short" />
                    <span className="sk sk-line title" />
                </div>
            </div>

            <div className="statistics-summary-grid">
                {Array.from({ length: 5 }, (_, index) => (
                    <div className="sk sk-card" key={index} />
                ))}
            </div>

            <div className="statistics-chart-grid">
                <div className="sk sk-panel" />
                <div className="sk sk-panel" />
            </div>
        </section>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    description,
    variant = "",
    hero = false,
    delta = null,
    meter = null
}) {
    return (
        <article
            className={`statistics-summary-card ${variant} ${hero ? "hero" : ""}`}
        >
            <div className="statistics-summary-top">
                <span className="statistics-summary-icon">
                    <Icon name={icon} />
                </span>
                <span className="statistics-summary-label">{label}</span>
            </div>

            <strong className="statistics-summary-value">{value}</strong>

            {meter !== null && (
                <div className="stat-meter" aria-hidden="true">
                    <div
                        className="stat-meter-fill"
                        style={{ width: `${meter}%` }}
                    />
                </div>
            )}

            {delta}
            {description && <p>{description}</p>}
        </article>
    );
}

// Month-over-month change chip. `goodWhenUp` decides green vs red.
function Delta({ value, goodWhenUp }) {
    if (value === null) {
        return <span className="stat-delta flat">No data last month</span>;
    }

    if (Math.abs(value) < 0.05) {
        return <span className="stat-delta flat">No change vs last month</span>;
    }

    const up = value > 0;
    const good = up === goodWhenUp;

    return (
        <span className={`stat-delta ${good ? "good" : "bad"}`}>
            {up ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
            <em>vs last month</em>
        </span>
    );
}

function PanelHeading({ title, subtitle, children }) {
    return (
        <div className="statistics-panel-heading">
            <div>
                <h3>{title}</h3>
                <p>{subtitle}</p>
            </div>

            {children}
        </div>
    );
}

function StatisticsEmpty({ message }) {
    return (
        <div className="statistics-empty">
            <span className="statistics-empty-icon">
                <Icon name="empty" />
            </span>
            {message}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Income vs expenses                                                 */
/* ------------------------------------------------------------------ */

function IncomeExpenseChart({ transactions, currency }) {
    const months = aggregateMonths(transactions);

    const maximum = niceCeil(
        Math.max(...months.flatMap((month) => [month.income, month.expense]), 0)
    );

    const ticks = [4, 3, 2, 1, 0].map((step) => (maximum * step) / 4);

    const heightOf = (value) =>
        value > 0 ? Math.max((value / maximum) * 100, 1.5) : 0;

    return (
        <article className="statistics-panel">
            <PanelHeading
                title="Income vs Expenses"
                subtitle="Monthly comparison · Last six months"
            >
                <div className="statistics-legend">
                    <span><i className="legend-income" /> Income</span>
                    <span><i className="legend-expense" /> Expenses</span>
                </div>
            </PanelHeading>

            <div className="ie-chart">
                <div className="ie-axis" aria-hidden="true">
                    {ticks.map((tick) => (
                        <span key={tick}>{compact(tick)}</span>
                    ))}
                </div>

                <div className="ie-plot">
                    <div className="ie-grid" aria-hidden="true">
                        {ticks.map((tick) => (
                            <i key={tick} />
                        ))}
                    </div>

                    <div className="ie-columns">
                        {months.map((month) => {
                            const monthNet = month.income - month.expense;

                            return (
                                <div
                                    className={`ie-column ${month.current ? "current" : ""}`}
                                    key={`${month.year}-${month.month}`}
                                    tabIndex={0}
                                    aria-label={`${month.fullLabel}: income ${currency} ${formatAmount(month.income)}, expenses ${currency} ${formatAmount(month.expense)}`}
                                >
                                    <div className="ie-bars">
                                        <div
                                            className="ie-bar income-bar"
                                            style={{ height: `${heightOf(month.income)}%` }}
                                        />
                                        <div
                                            className="ie-bar expense-bar"
                                            style={{ height: `${heightOf(month.expense)}%` }}
                                        />
                                    </div>

                                    <span className="ie-month">{month.label}</span>

                                    <div className="ie-tip" role="tooltip">
                                        <strong>{month.fullLabel}</strong>
                                        <div>
                                            <span><i className="legend-income" /> Income</span>
                                            <b>{currency} {formatAmount(month.income)}</b>
                                        </div>
                                        <div>
                                            <span><i className="legend-expense" /> Expenses</span>
                                            <b>{currency} {formatAmount(month.expense)}</b>
                                        </div>
                                        <div className="ie-tip-net">
                                            <span>Net</span>
                                            <b className={monthNet >= 0 ? "pos" : "neg"}>
                                                {monthNet < 0 ? "−" : "+"}{currency} {formatAmount(Math.abs(monthNet))}
                                            </b>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Expense by category (donut)                                        */
/* ------------------------------------------------------------------ */

function ExpenseCategoryChart({ transactions, currency }) {
    const now = new Date();
    const totals = {};

    transactions.forEach((transaction) => {
        if (transaction.type !== "EXPENSE") return;

        if (!isSameMonth(new Date(transaction.transactionDate), now)) return;

        const category = transaction.category?.trim() || "Other";
        totals[category] = (totals[category] || 0) +
            Number(transaction.amount || 0);
    });

    const categories = Object.entries(totals)
        .sort((a, b) => b[1] - a[1]);

    const total = categories.reduce((sum, item) => sum + item[1], 0);

    const slices = categories.slice(0, 6).map(([name, amount], index) => ({
        name,
        amount,
        color: CATEGORY_COLORS[index]
    }));

    const othersAmount = categories
        .slice(6)
        .reduce((sum, item) => sum + item[1], 0);

    if (othersAmount > 0) {
        slices.push({ name: "Others", amount: othersAmount, color: OTHER_COLOR });
    }

    let cursor = 0;
    const gradient = slices
        .map((slice) => {
            const start = cursor;
            cursor += total > 0 ? (slice.amount / total) * 100 : 0;
            return `${slice.color} ${start}% ${cursor}%`;
        })
        .join(", ");

    return (
        <article className="statistics-panel">
            <PanelHeading
                title="Expense by Category"
                subtitle="This month's spending breakdown"
            />

            {slices.length === 0 ? (
                <StatisticsEmpty message="No expenses recorded this month." />
            ) : (
                <div className="cat-layout">
                    <div className="donut-wrap">
                        <div
                            className="donut"
                            style={{ background: `conic-gradient(${gradient})` }}
                            role="img"
                            aria-label="Expense category breakdown"
                        />

                        <div className="donut-center">
                            <span>Spent</span>
                            <strong>{compact(total)}</strong>
                            <small>{currency}</small>
                        </div>
                    </div>

                    <ul className="cat-list">
                        {slices.map((slice) => {
                            const percentage = total > 0
                                ? (slice.amount / total) * 100
                                : 0;

                            return (
                                <li className="cat-item" key={slice.name}>
                                    <i
                                        className="cat-dot"
                                        style={{ background: slice.color }}
                                    />

                                    <span className="cat-name">{slice.name}</span>

                                    <strong className="cat-amount">
                                        {currency} {formatAmount(slice.amount)}
                                    </strong>

                                    <span className="cat-percent">
                                        {percentage.toFixed(1)}%
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Monthly spending trend                                             */
/* ------------------------------------------------------------------ */

function MonthlyExpenseTrend({ transactions, currency }) {
    const months = aggregateMonths(transactions);

    const maximum = Math.max(...months.map((month) => month.expense), 1);
    const average = months.reduce((sum, month) => sum + month.expense, 0) / months.length;
    const highest = months.reduce(
        (best, month) => (month.expense > best.expense ? month : best),
        months[0]
    );

    return (
        <article className="statistics-panel statistics-trend-panel">
            <PanelHeading
                title="Monthly Spending Trend"
                subtitle="How your expenses change over time"
            />

            <div className="trend-stats">
                <div>
                    <span>6-month average</span>
                    <strong>{currency} {formatAmount(average)}</strong>
                </div>

                <div>
                    <span>Highest month</span>
                    <strong>
                        {highest.expense > 0
                            ? `${highest.label} · ${currency} ${formatAmount(highest.expense)}`
                            : "—"}
                    </strong>
                </div>
            </div>

            <div className="trend-chart">
                {months.map((month) => {
                    const height = month.expense > 0
                        ? Math.max((month.expense / maximum) * 100, 3)
                        : 0;

                    return (
                        <div
                            className={`trend-column ${month.current ? "current" : ""}`}
                            key={`${month.year}-${month.month}`}
                        >
                            <span className="trend-value">
                                {compact(month.expense)}
                            </span>

                            <div className="trend-track">
                                <div
                                    className="trend-bar"
                                    style={{ height: `${height}%` }}
                                    title={`${month.fullLabel}: ${currency} ${formatAmount(month.expense)}`}
                                />
                            </div>

                            <span className="trend-label">{month.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="statistics-chart-footnote">
                Amounts shown in {currency}. The current month is highlighted.
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Loan progress                                                      */
/* ------------------------------------------------------------------ */

function LoanProgress({ loans }) {
    const activeLoans = loans.filter(
        (loan) => loan.status === "ACTIVE"
    );

    return (
        <article className="statistics-panel">
            <PanelHeading
                title="Loan Progress"
                subtitle="Track the principal you have repaid"
            />

            {activeLoans.length === 0 ? (
                <StatisticsEmpty message="No active loans." />
            ) : (
                <div className="lp-list">
                    {activeLoans.map((loan) => {
                        const principal = Number(loan.principalAmount || 0);
                        const outstanding = Number(loan.outstandingPrincipal || 0);
                        const paid = Math.max(principal - outstanding, 0);
                        const percentage = principal > 0
                            ? Math.min((paid / principal) * 100, 100)
                            : 0;

                        return (
                            <div className="lp-item" key={loan.id}>
                                <div className="lp-heading">
                                    <div>
                                        <strong>{loan.title}</strong>
                                        <span>{loan.loanType}</span>
                                    </div>

                                    <b>{percentage.toFixed(1)}%</b>
                                </div>

                                <div className="lp-track">
                                    <div
                                        className="lp-fill"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>

                                <div className="lp-amounts">
                                    <span>
                                        Paid <b>{loan.accountCurrency} {formatAmount(paid)}</b>
                                    </span>

                                    <span>
                                        Remaining <b>{loan.accountCurrency} {formatAmount(outstanding)}</b>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Upcoming commitments                                               */
/* ------------------------------------------------------------------ */

function UpcomingCommitments({ loans, recurringPayments, debts }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commitments = [];

    loans
        .filter((loan) => loan.status === "ACTIVE" && loan.nextDueDate)
        .forEach((loan) => commitments.push({
            id: `loan-${loan.id}`,
            kind: "loan",
            type: "Loan EMI",
            title: loan.title,
            amount: Number(loan.emiAmount || 0),
            dueDate: loan.nextDueDate,
            currency: loan.accountCurrency,
            accountName: loan.accountName
        }));

    recurringPayments
        .filter((payment) => payment.status === "ACTIVE" && payment.nextDueDate)
        .forEach((payment) => commitments.push({
            id: `recurring-${payment.id}`,
            kind: "recurring",
            type: "Recurring payment",
            title: payment.title,
            amount: Number(payment.amount || 0),
            dueDate: payment.nextDueDate,
            currency: payment.accountCurrency,
            accountName: payment.accountName
        }));

    debts
        .filter((debt) =>
            debt.status === "ACTIVE" &&
            (debt.nextReminderDate || debt.firstReminderDate)
        )
        .forEach((debt) => commitments.push({
            id: `debt-${debt.id}`,
            kind: "debt",
            type: "Debt reminder",
            title: `${debt.personName || "Debt"}${debt.title ? ` · ${debt.title}` : ""}`,
            amount: Number(debt.remainingAmount ?? debt.amount ?? 0),
            dueDate: debt.nextReminderDate || debt.firstReminderDate,
            currency: debt.currency || "INR",
            accountName: debt.accountName || ""
        }));

    commitments.sort(
        (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
    );

    const daysUntil = (dateString) => {
        const date = new Date(`${dateString}T00:00:00`);
        return Math.round((date.getTime() - today.getTime()) / 86400000);
    };

    const getDueLabel = (dateString) => {
        const days = daysUntil(dateString);

        if (days < 0) return "Overdue";
        if (days === 0) return "Due today";
        if (days === 1) return "Due tomorrow";
        if (days <= 7) return `Due in ${days} days`;

        return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const visible = commitments.slice(0, 8);

    return (
        <article className="statistics-panel">
            <PanelHeading
                title="Upcoming Commitments"
                subtitle="Your next financial obligations"
            >
                {commitments.length > 0 && (
                    <span className="statistics-count">{commitments.length}</span>
                )}
            </PanelHeading>

            {visible.length === 0 ? (
                <StatisticsEmpty message="No upcoming financial commitments." />
            ) : (
                <div className="commit-list">
                    {visible.map((item) => {
                        const days = daysUntil(item.dueDate);
                        const state = days < 0 ? "overdue" : days === 0 ? "due-today" : "";

                        return (
                            <div
                                className={`commit-item ${item.kind} ${state}`}
                                key={item.id}
                            >
                                <div className="commit-mark">
                                    <Icon name={item.kind} />
                                </div>

                                <div className="commit-details">
                                    <strong>{item.title}</strong>
                                    <span>
                                        {item.type}
                                        {item.accountName ? ` · ${item.accountName}` : ""}
                                    </span>
                                </div>

                                <div className="commit-right">
                                    <strong>
                                        {item.currency} {formatAmount(item.amount)}
                                    </strong>
                                    <small className="due-pill">
                                        {getDueLabel(item.dueDate)}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {commitments.length > 8 && (
                <p className="statistics-chart-footnote">
                    Showing the next eight commitments.
                </p>
            )}
        </article>
    );
}

export default DashboardStatistics;