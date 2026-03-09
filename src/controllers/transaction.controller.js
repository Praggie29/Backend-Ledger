const transactionModel=require("../models/transaction.model");
const ledgerModel=require("../models/ledger.model");
const accountModel=require("../models/account.model");
const emailService=require("../services/email.service");
const mongoose=require("mongoose");




async function createTransaction(req,res){ 
    const {fromAccount,toAccount,amount,idempotencykey}=req.body;
    if(!fromAccount || !toAccount || !amount || !idempotencykey){
        return res.status(400).json({
            message:"fromAccount, toAccount, amount, idempotencykey are required",
            status:"failed"
        })
    }
    const fromUserAccount=await accountModel.findOne({
        _id:fromAccount,
    })
    const toUserAccount=await accountModel.findOne({
        _id:toAccount,
    })
    if(!fromUserAccount || !toUserAccount){
        return res.status(400).json({
            message:"Invalid fromAccount or toAccount"
        })
    }
    const isTransactionAlreadyExists=await transactionModel.findOne({
        idempotencykey:idempotencykey
    })
    if(isTransactionAlreadyExists){
        if(isTransactionAlreadyExists.status==="COMPLETED"){
           return res.status(200).json({
                message:"Transaction already proceeded",
                transaction:isTransactionAlreadyExists
            })
       }
       if(isTransactionAlreadyExists.status==="PENDING"){
       return res.status(200).json({
            message:"Transaction is being processed",
        })
       }
         if(isTransactionAlreadyExists.status==="FAILED"){
          return  res.status(500).json({
                message:"Transaction processing failed, please try again",
            })
       }
       if(isTransactionAlreadyExists.status==="REVERSED"){
        return res.status(500).json({
            message:"Transaction was reversed , please try again",
        })
    }
   
     }
     if(fromUserAccount.status!=="ACTIVE" || toUserAccount.status!=="ACTIVE"){
        return res.status(400).json({
            message:"Both fromAccount and toAccount must be ACTIVE to proceed with the transaction"
        })
     }
     const balance=await fromUserAccount.getBalance();
     if(balance<amount){
        return res.status(400).json({
            message:`Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
     }
   let transaction;
     try{
      const session=await mongoose.startSession();
     session.startTransaction();

      transaction=new transactionModel.create([{
        fromAccount,
        toAccount,
        amount,
        idempotencykey,
        status:"PENDING"
     }],{ session })

     const debitLedgerEntry=await ledgerModel.create([{
        account:fromAccount,
        amount,
        transaction:transaction._id,
        type:"DEBIT"
     }],{ session })

     //await (()=>{
      //  return new Promise((resolve)=>setTimeout(resolve,100*1000))
     //})()

     const creditLedgerEntry=await ledgerModel.create([{
        account:toAccount,
        amount,
        transaction:transaction._id,
        type:"CREDIT"
     }],{ session })

     transaction.status="COMPLETED";
     await transaction.save({ session });

     await session.commitTransaction();
     session.endSession();
 }catch(error){
   return res.status(400).json({
    message:"Transaction is pending due to some issue, please try again",
   
})
 }
     await emailService.sendTransactionEmail(req.user.email,req.user.name,amount,fromUserAccount._id,toUserAccount._id);
        return res.status(201).json({
            message:"Transaction created successfully",
            transaction:transaction
        })
}


async function createInitialFundsTransaction(req,res){
    const {toAccount,amount,idempotencykey}=req.body;
    if(!toAccount || !amount || !idempotencykey){
        return res.status(400).json({
            message:"toAccount, amount, idempotencykey are required",
        })
    }
    const toUserAccount=await accountModel.findOne({
        _id:toAccount,
    })
    if(!toUserAccount){
        return res.status(400).json({
            message:"Invalid toAccount"
        })
    }
    const fromUserAccount=await accountModel.findOne({
        user:req.user._id
    })
    if(!fromUserAccount){
        return res.status(400).json({
            message:"System user account not found for the authenticated user"
        })
    }
    const session=await mongoose.startSession();
    session.startTransaction();

    const transaction=new transactionModel({
        fromAccount:fromUserAccount._id,
        toAccount,
        amount,
        idempotencykey,
        status:"PENDING"
    })
    
    const debitLedgerEntry=await ledgerModel.create([{
        account:fromUserAccount._id,
        amount:amount,
        transaction:transaction._id,
        tyoe:"DEBIT"
    }], { session })

    const creditLedgerEntry=await ledgerModel.create({
        account:toUserAccount._id,
        amount:amount,
        transaction:transaction._id,
        type:"CREDIT"
    }, { session })

    transaction.status="COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
        message:"Initial funds transaction created successfully",
        transaction:transaction
    })
}

module.exports={
    createTransaction,
    createInitialFundsTransaction
};
