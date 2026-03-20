const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const { Parser } = require('json2csv');
const midtransClient = require('midtrans-client');
const { handleMessage, sendWA } = require('./utils/chatbot');

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Database sederhana
let db = JSON.parse(fs.readFileSync('database.json', 'utf-8'));

// Rate limiter login
const loginLimiter = rateLimit({ windowMs:60000, max:5, message:"Terlalu banyak percobaan login" });

// Live dashboard
let onlineUsers = 0;
function updateDashboard(){
  io.emit('update', {
    onlineUsers,
    totalRevenue: db.trx.filter(t=>t.paid).reduce((a,b)=>a+b.amount,0),
    totalVouchers: db.trx.filter(t=>t.type==='buy').length
  });
}

// Routes
app.post('/login-member', loginLimiter, (req,res)=>{
  let user = db.users.find(u=>u.username===req.body.username);
  if(user){
    onlineUsers++;
    updateDashboard();
    res.json(user);
  }else res.status(401).send('Login gagal');
});

app.post('/logout',(req,res)=>{
  onlineUsers = Math.max(0, onlineUsers-1);
  updateDashboard();
  res.send('ok');
});

// VIP purchase
let vipPlans = {
  'VIP1': {price: 10000, duration:'1 Month'},
  'VIP3': {price: 25000, duration:'3 Months'}
};
app.get('/buy-vip', (req,res)=>{
  let {username, plan} = req.query;
  let user = db.users.find(u=>u.username===username);
  let vip = vipPlans[plan];
  if(user.saldo < vip.price) return res.send("Saldo kurang");
  user.saldo -= vip.price;
  user.vip = {plan, expires: Date.now() + 30*24*60*60*1000};
  fs.writeFileSync('database.json', JSON.stringify(db, null,2));
  res.json({msg:`VIP ${plan} aktif sampai ${new Date(user.vip.expires)}`});
});

// Export CSV
app.get('/export',(req,res)=>{
  const fields = ['order_id','username','amount','type','paid'];
  const parser = new Parser({fields});
  const csv = parser.parse(db.trx);
  res.header('Content-Type','text/csv');
  res.attachment('report.csv');
  res.send(csv);
});

// WebSocket
io.on('connection',(socket)=>{
  socket.emit('update',{onlineUsers, totalRevenue:0, totalVouchers:0});
});

// Server listen
http.listen(3000, ()=>console.log('Server berjalan di port 3000'));