const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================================================
   🔐 AUTH MIDDLEWARES
========================================================= */

// Bearer Auth #1
function bearerAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== 'secret-token-123') {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    next();
}

// Bearer Auth #2
function bankAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Missing token" });
    }
    const token = authHeader.split(" ")[1];
    if (token !== "secure-bank-token") {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    next();
}

// API Key Auth #1
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== 'my-secret-api-key') {
        return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }
    next();
}

// API Key Auth #2
function exchangeAuth(req, res, next) {
    const clientKey = req.headers["api-key"];
    if (!clientKey) {
        return res.status(401).json({ status: "ERROR", message: "API key is required" });
    }
    if (clientKey !== "my-secret-key-123") {
        return res.status(403).json({ status: "ERROR", message: "Invalid API key" });
    }
    next();
}

/* =========================================================
   🧠 MOCK DATABASES
========================================================= */

// Accounts DB #1
const accountsDB = {
    "99887766": {
        balance: 12500,
        currency: "ETB",
        transactions: [
            { id: 1, amount: -500, type: "debit", date: "2026-03-20" },
            { id: 2, amount: 2000, type: "credit", date: "2026-03-21" },
        ]
    }
};

// Accounts DB #2
const accounts = {
    "1001": { name: "Abel", balance: 15000, currency: "ETB", type: "savings", status: "active" },
    "1002": { name: "Selam", balance: 8200, currency: "ETB", type: "current", status: "active" }
};

const transactions = {};

// Cases
const cases = [
    { caseNumber: "CASE123", issue: "Transfer issue", status: "Open" }
];

/* =========================================================
   💱 EXCHANGE LOGIC
========================================================= */

const rates = {
    ETB: { USD: 0.017, EUR: 0.016 }
};

function getRate(from, to) {
    if (from === to) return 1;
    if (from === "ETB") return rates.ETB[to];
    if (to === "ETB") return 1 / rates.ETB[from];
    return (1 / rates.ETB[from]) * rates.ETB[to];
}

/* =========================================================
   🛣️ ROUTES
========================================================= */

// 🏦 Account Balance
app.get('/api/accounts/:account_id/balance', bearerAuth, (req, res) => {
    const acc = accountsDB[req.params.account_id];
    if (!acc) return res.status(404).json({ message: "Not found" });
    res.json(acc);
});

// 💸 Transfer
app.post("/api/transfer", bankAuth, (req, res) => {
    res.json({ success: true, message: "Transfer simulated" });
});

// 📄 Account Info
app.get("/api/account/:id", bankAuth, (req, res) => {
    const acc = accounts[req.params.id];
    if (!acc) return res.status(404).json({ message: "Not found" });
    res.json(acc);
});

// 📊 Transactions
app.get("/api/transaction/:ref", bankAuth, (req, res) => {
    const txn = transactions[req.params.ref];
    if (!txn) return res.status(404).json({ message: "Not found" });
    res.json(txn);
});

// 🔑 API Key Summary
app.get('/api/apikey/accounts/summary', apiKeyAuth, (req, res) => {
    res.json({ success: true, message: "Summary endpoint working" });
});

// 💱 Exchange Rates
app.get("/api/rates", exchangeAuth, (req, res) => {
    res.json({ base: "ETB", rates: rates.ETB });
});

// 💱 Convert
app.post("/api/convert", exchangeAuth, (req, res) => {
    const { from, to, amount } = req.body;
    const rate = getRate(from, to);
    res.json({ converted: amount * rate });
});

// 📁 Cases
app.get("/api/cases/:caseNumber", (req, res) => {
    const found = cases.find(c => c.caseNumber === req.params.caseNumber);
    if (!found) return res.status(404).json({ message: "Not found" });
    res.json(found);
});

// ❤️ Health
app.get("/api/health", (req, res) => {
    res.json({ status: "OK" });
});

/* =========================================================
   🚀 START SERVER
========================================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Unified API running on port ${PORT}`);
});