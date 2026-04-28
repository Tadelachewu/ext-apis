const express = require("express");
const cors = require("cors");

const app = express();

/* =========================================================
   🔐 GLOBAL MIDDLEWARE
========================================================= */
app.use(cors());
app.use(express.json());

/* =========================================================
   📜 REQUEST LOGGER (FROM FIRST API)
========================================================= */
app.use((req, res, next) => {
    try {
        const headers = { ...req.headers };

        if (headers.authorization)
            headers.authorization = headers.authorization.replace(/Bearer\s+(.+)/i, 'Bearer ****');

        if (headers['x-api-key'])
            headers['x-api-key'] = '****';

        console.log("HTTP", {
            method: req.method,
            url: req.originalUrl,
            params: req.params,
            query: req.query,
            headers
        });

        if (req.body && Object.keys(req.body).length) {
            console.log("HTTP BODY", req.body);
        }
    } catch (e) {
        console.warn("Logger error:", e?.message);
    }

    next();
});

/* =========================================================
   🔐 AUTH MIDDLEWARES (ALL KEPT)
========================================================= */

// Bearer Auth #1
function bearerAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ success: false, message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    if (token !== "secret-token-123")
        return res.status(401).json({ success: false, message: "Invalid token" });

    next();
}

// Bearer Auth #2 (Bank)
function bankAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ success: false, message: "Missing token" });

    const token = authHeader.split(" ")[1];
    if (token !== "secure-bank-token")
        return res.status(403).json({ success: false, message: "Unauthorized" });

    next();
}

// API Key Auth #1
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== "my-secret-api-key")
        return res.status(401).json({ success: false, message: "Invalid API Key" });

    next();
}

// API Key Auth #2 (Exchange)
const EXCHANGE_KEY = "my-secret-key-123";

function exchangeAuth(req, res, next) {
    const key = req.headers["api-key"];

    if (!key)
        return res.status(401).json({ status: "ERROR", message: "API key is required" });

    if (key !== EXCHANGE_KEY)
        return res.status(403).json({ status: "ERROR", message: "Invalid API key" });

    next();
}

/* =========================================================
   🧠 DATA (ALL SYSTEMS)
========================================================= */

// ---------------- Mock Database ---------------- //
const accountsDB = {
    "99887766": {
        balance: 12500.0,
        currency: "ETB",
        transactions: [
            { id: 1, amount: -500, type: "debit", date: "2026-03-20" },
            { id: 2, amount: 2000, type: "credit", date: "2026-03-21" },
            { id: 3, amount: -300, type: "debit", date: "2026-03-22" },
        ]
    },
    "88991122": {
        balance: 8500.0,
        currency: "ETB",
        transactions: [
            { id: 1, amount: -1000, type: "debit", date: "2026-03-20" },
            { id: 2, amount: 500, type: "credit", date: "2026-03-21" },
        ]
    },
};


// Bank Accounts (API 2)
const accounts = {
    "1001": { name: "Abel Tesfaye", balance: 15000, currency: "ETB", type: "savings", status: "active" },
    "1002": { name: "Selam Worku", balance: 8200, currency: "ETB", type: "current", status: "active" }
};

// Transactions (Bank API)
const transactions = {};

// Cases API
const cases = [
    {
        caseNumber: "CASE123",
        customerName: "Abel Tesfaye",
        issue: "Unable to transfer funds",
        status: "Open",
        priority: "High",
        createdAt: "2026-04-17T10:00:00Z"
    },
    {
        caseNumber: "CASE124",
        customerName: "Sara Mohammed",
        issue: "Login problem",
        status: "Closed",
        priority: "Medium",
        createdAt: "2026-04-16T09:30:00Z"
    }
];

// Exchange Rates
const rates = {
    ETB: {
        USD: 0.017,
        EUR: 0.016,
        GBP: 0.014,
        KES: 2.7
    }
};

/* =========================================================
   🧠 UTIL FUNCTIONS (EXCHANGE)
========================================================= */
function isSupported(currency) {
    return currency === "ETB" || rates.ETB.hasOwnProperty(currency);
}

function getRate(from, to) {
    from = from.toUpperCase();
    to = to.toUpperCase();

    if (from === to) return 1;

    if (from === "ETB") return rates.ETB[to];
    if (to === "ETB") return 1 / rates.ETB[from];

    return (1 / rates.ETB[from]) * rates.ETB[to];
}

/* =========================================================
   🏦 ACCOUNT API (SYSTEM 1)
========================================================= */
// 1️⃣ Account balance
app.get('/api/accounts/:account_id/balance', bearerAuth, (req, res) => {
    const accountId = req.params.account_id;
    const currency = req.query.currency || 'ETB';

    const account = accountsDB[accountId];
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

    res.json({
        success: true,
        data: {
            account_id: accountId,
            currency,
            available_balance: account.balance,
            last_updated: new Date().toISOString()
        }
    });
});

app.get("/api/accounts/:account_id/transactions", bearerAuth, (req, res) => {
    const acc = accountsDB[req.params.account_id];
    if (!acc) return res.status(404).json({ success: false });

    let data = acc.transactions;

    if (req.query.type)
        data = data.filter(t => t.type === req.query.type);

    if (req.query.minAmount)
        data = data.filter(t => Math.abs(t.amount) >= Number(req.query.minAmount));

    res.json({ success: true, data });
});

/* =========================================================
   🔑 API KEY SUMMARY
========================================================= */
app.get("/api/apikey/accounts/summary", apiKeyAuth, (req, res) => {
    const { account_id, currency, includeTransactions } = req.query;

    const acc = accountsDB[account_id];
    if (!acc)
        return res.status(404).json({ success: false, message: "Account not found" });

    const response = {
        account_id,
        currency,
        balance: acc.balance
    };

    if (includeTransactions === "true")
        response.transactions = acc.transactions;

    res.json({ success: true, data: response });
});

/* =========================================================
   💸 BANKING API (SYSTEM 2)
========================================================= */

app.post("/api/transfer", bankAuth, (req, res) => {
    res.json({ success: true, message: "Transfer successful" });
});

app.get("/api/account/:id", bankAuth, (req, res) => {
    const acc = accounts[req.params.id];
    if (!acc) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: acc });
});

app.get("/api/transaction/:ref", bankAuth, (req, res) => {
    const txn = transactions[req.params.ref];
    if (!txn) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: txn });
});

/* =========================================================
   💱 EXCHANGE API (SYSTEM 3)
========================================================= */

app.get("/api/rates", exchangeAuth, (req, res) => {
    res.json({
        status: "SUCCESS",
        data: { baseCurrency: "ETB", rates: rates.ETB }
    });
});

app.post("/api/convert", exchangeAuth, (req, res) => {
    const { from, to, amount } = req.body;

    const rate = getRate(from, to);

    res.json({
        status: "SUCCESS",
        data: {
            from,
            to,
            amount,
            rate,
            converted: Number((amount * rate).toFixed(2))
        }
    });
});

app.get("/api/convert-all", exchangeAuth, (req, res) => {
    const base = req.query.base?.toUpperCase();
    const amount = Number(req.query.amount || 1);

    const currencies = ["ETB", ...Object.keys(rates.ETB)];

    const result = currencies
        .filter(c => c !== base)
        .map(currency => {
            const rate = getRate(base, currency);
            return {
                currency,
                rate,
                converted: Number((rate * amount).toFixed(2))
            };
        });

    res.json({ status: "SUCCESS", data: result });
});

/* =========================================================
   📁 CASES API (SYSTEM 4)
========================================================= */

app.get("/api/cases/:caseNumber", (req, res) => {
    const found = cases.find(c => c.caseNumber === req.params.caseNumber);
    if (!found) return res.status(404).json({ message: "Case not found" });
    res.json(found);
});

/* =========================================================
   ❤️ HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "Unified API running" });
});

/* =========================================================
   🚀 SERVER START (ONLY ONE)
========================================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Unified API running on port ${PORT}`);
});