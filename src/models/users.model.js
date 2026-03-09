const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema=new mongoose.Schema({
  email:{
    type:String,
    required:[true,"Email is required"],
    trim:true,
    lowercase:true,
    unique:[true,"Email already exists"],
    match:[/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,"Please enter a valid email address"]
  },
  name:{
    type:String,
    required:[true,"Name is required for creating an account"]
  },
  password:{
    type:String,
    required:[true,"Password is required for creating an account"],
    minlength:[6,"Password must be at least 6 characters long"],
    select:false
  },
  systemUser:{
    type:Boolean,
    default:false,
    immutable:true,
    select:false
  }
}, { timestamps:true });

userSchema.pre("save",async function(){
    if(!this.isModified("password")){
        return ;
    }
    const hash=await bcrypt.hash(this.password,10);
    this.password=hash;
});

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}

const User=mongoose.model("User",userSchema);

module.exports=User;