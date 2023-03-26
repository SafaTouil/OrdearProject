const PORT = process.env.PORT || 5000
const express = require("express")
const mongoose = require('mongoose'); 
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const path = require('path');
const connect = require('dotenv').config({path : path.resolve(__dirname, './.env')}) ;
const globalRoutes = require('./routers/Index')

const app = express();

let url = connect.parsed.DATABASE_URL
mongoose.connect(url).then((res)=>{
  console.log("MongoDB connected")
}).catch((err)=>{
  console.log("not connected")
})

app.use(cookieParser());
app.use(express.json());
app.use(globalRoutes);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));