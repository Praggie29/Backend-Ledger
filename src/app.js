const express = require("express");
const cookieParser = require("cookie-parser");



const app=express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

/**
  * ROUTES
  */

const authRouter = require("./routes/auths.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

/**
  * USE ROUTES
  */

app.use("/api/auth",authRouter);
app.use("/api/accounts",accountRouter);
app.use("/api/transactions",transactionRoutes);

module.exports=app;