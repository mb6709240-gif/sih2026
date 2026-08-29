import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {v4 as uuid} from 'uuid';
import {readDb,writeDb} from './db.js';
import {auth,optionalAuth,allow} from './middleware/auth.js';
import {catalogFromInput,priceAdvice,marketing,searchIntent,businessInsight,chatReply,searchSuggestions,analyzeProductImage,translateText,aiStatus,customerAssistant} from './services/aiService.js';
import sharp from 'sharp';
import fs from 'fs'; import path from 'path'; import {fileURLToPath} from 'url';

const app=express(); const PORT=process.env.PORT||4000; const SECRET=process.env.JWT_SECRET||'dev-secret-change-me';
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const clientDist=path.join(projectRoot,'client','dist');

// Security & CORS middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));
app.use(express.json({limit:'2mb'}));
app.use(rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) { app.use(express.static(clientDist)); }
const uploadDir=path.join(path.dirname(fileURLToPath(import.meta.url)),'../uploads'); fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({dest:uploadDir,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const publicUser=u=>{const {password,...safe}=u;return safe};
const sign=u=>jwt.sign({id:u.id,role:u.role,name:u.name,email:u.email},SECRET,{expiresIn:'2h'});
function log(action,req){const db=readDb();db.auditLogs.push({id:uuid(),userId:req.user?.id||null,action,at:new Date().toISOString()});writeDb(db);}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'ArtisanAI API'}));
app.get('/api/ai/status',(req,res)=>res.json({ok:true,...aiStatus()}));
app.post('/api/auth/register',async(req,res)=>{const {name,email,password,role='customer',phone='',language='English'}=req.body;if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});if(password.length<8)return res.status(400).json({message:'Password must be at least 8 characters'});if(!['artisan','customer','b2b'].includes(role))return res.status(400).json({message:'Invalid role'});const db=readDb();if(db.users.some(u=>u.email.toLowerCase()===email.toLowerCase()))return res.status(409).json({message:'Account already exists'});const user={id:uuid(),name,email:email.toLowerCase(),password:await bcrypt.hash(password,12),role,phone,language,verified:false,createdAt:new Date().toISOString()};db.users.push(user);writeDb(db);res.status(201).json({token:sign(user),user:publicUser(user)});});
app.post('/api/auth/login',async(req,res)=>{const {email,password}=req.body;const db=readDb();const user=db.users.find(u=>u.email===String(email||'').toLowerCase());if(!user||!(await bcrypt.compare(password||'',user.password)))return res.status(401).json({message:'Invalid email or password'});res.json({token:sign(user),user:publicUser(user)});});
app.get('/api/auth/me',auth,(req,res)=>{const db=readDb();const user=db.users.find(u=>u.id===req.user.id);if(!user)return res.status(404).json({message:'User not found'});res.json({user:publicUser(user)});});
app.post('/api/auth/logout',auth,(req,res)=>{log('logout',req);res.json({ok:true});});

app.get('/api/products',(req,res)=>{const db=readDb();let p=db.products;const q=String(req.query.q||'').toLowerCase();if(q)p=p.filter(x=>[x.name,x.category,x.description,...x.tags].join(' ').toLowerCase().includes(q));res.json({products:p});});
app.get('/api/products/:id',(req,res)=>{const p=readDb().products.find(x=>x.id===req.params.id);p?res.json({product:p}):res.status(404).json({message:'Product not found'});});
app.post('/api/products',optionalAuth,upload.single('image'),(req,res)=>{const db=readDb();const body=req.body;const product={id:uuid(),artisanId:req.user?.id||'demo-artisan',name:body.name||'Handcrafted Item',category:body.category||'Handicraft',price:Number(body.price||0),description:body.description||'',material:body.material||'',location:body.location||'India',tags:body.tags?String(body.tags).split(',').map(s=>s.trim()):['handmade','artisan'],image:body.image||'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=500&q=80',stock:Number(body.stock||1),createdAt:new Date().toISOString()};if(req.file)product.image=`/uploads/${req.file.filename}`;db.products.unshift(product);writeDb(db);log('product_created',req);res.status(201).json({product});});
app.get('/api/artisan/products',auth,allow('artisan'),(req,res)=>res.json({products:readDb().products.filter(p=>p.artisanId===req.user.id)}));
app.post('/api/orders',auth,allow('customer','b2b'),(req,res)=>{const {items,address}=req.body;const db=readDb();if(!Array.isArray(items)||!items.length)return res.status(400).json({message:'Cart is empty'});let total=0;const orderItems=items.map(i=>{const p=db.products.find(x=>x.id===i.productId);if(!p)throw new Error('Product not found');const qty=Math.max(1,Number(i.qty||1));total+=p.price*qty;return {productId:p.id,name:p.name,price:p.price,qty,artisanId:p.artisanId};});const order={id:uuid(),customerId:req.user.id,items:orderItems,total,address:address||{},status:'Confirmed',paymentStatus:'Demo-Paid',createdAt:new Date().toISOString()};db.orders.unshift(order);writeDb(db);log('order_created',req);res.status(201).json({order});});
app.get('/api/orders',auth,(req,res)=>{const db=readDb();const orders=req.user.role==='admin'?db.orders:db.orders.filter(o=>o.customerId===req.user.id||o.items.some(i=>i.artisanId===req.user.id));res.json({orders});});

app.post('/api/ai/catalog',optionalAuth,async(req,res)=>res.json({result:await catalogFromInput(req.body)}));
app.post('/api/ai/price',optionalAuth,async(req,res)=>res.json({result:await priceAdvice(req.body)}));
app.post('/api/ai/marketing',optionalAuth,async(req,res)=>res.json({result:await marketing(req.body)}));
app.post('/api/ai/analyze-image',optionalAuth,upload.single('image'),async(req,res)=>{
  if(!req.file)return res.status(400).json({message:'Unable to analyze this image. Please upload a clearer product image.'});
  try {
    const buffer = fs.readFileSync(req.file.path);
    const result = await analyzeProductImage({
      filename: req.file.originalname,
      buffer,
      mimeType: req.file.mimetype,
      name: req.body.name,
      category: req.body.category,
      material: req.body.material
    });
    fs.unlinkSync(req.file.path);
    res.json({result});
  } catch (err) {
    if (fs.existsSync(req.file?.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({message: 'Failed to analyze image'});
  }
});
app.post('/api/ai/generate-description',optionalAuth,async(req,res)=>{
  const result=await catalogFromInput(req.body);
  res.json({result:{shortDescription:result.description.split('. ')[0]+'.',detailedDescription:result.description,care:result.care,tags:result.tags}});
});
app.post('/api/ai/suggest-price',optionalAuth,async(req,res)=>{
  const result=await priceAdvice(req.body);
  res.json({result:{...result,range:`₹${result.minimumPrice.toLocaleString('en-IN')} - ₹${result.premiumPrice.toLocaleString('en-IN')}`,explanation:result.reason}});
});
app.post('/api/ai/translate',optionalAuth,async(req,res)=>res.json({result:await translateText(req.body.text,req.body.language)}));
app.post('/api/ai/generate-tags',optionalAuth,(req,res)=>{
  const category=String(req.body.category||'handmade').toLowerCase();
  const material=String(req.body.material||'artisan').toLowerCase();
  res.json({tags:[...new Set([category,material,'handmade','artisan','traditional','gift'])]});
});
app.post('/api/ai/chat',async(req,res)=>{const result=await chatReply(req.body.message);res.json(result);});
app.get('/api/ai/suggestions',(req,res)=>res.json({suggestions:searchSuggestions(req.query.q,readDb().products)}));
app.post(['/api/ai/photo','/api/ai/enhance-image'],optionalAuth,upload.single('image'),async(req,res)=>{
  if(!req.file)return res.status(400).json({message:'Upload a product photo first'});
  try {
    const background=String(req.body.background||'studio');
    const enhancement=String(req.body.enhancement||'quality');
    const backgrounds={studio:{r:250,g:246,b:237},sage:{r:226,g:235,b:224},terracotta:{r:239,g:216,b:194},white:{r:255,g:255,b:255}};
    const color=backgrounds[background]||backgrounds.studio;
    const output=path.join(uploadDir,`${uuid()}.png`);
    let pipeline=sharp(req.file.path).rotate().ensureAlpha();
    if (enhancement==='quality') pipeline=pipeline.normalize().sharpen({sigma:1.2});
    if (enhancement==='lighting') pipeline=pipeline.modulate({brightness:1.12,saturation:1.04}).normalize();
    if (enhancement==='crop') pipeline=pipeline.trim();
    pipeline=pipeline.resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true});
    await pipeline.extend({top:90,bottom:90,left:90,right:90,background:{...color,alpha:1}}).png().toFile(output);
    let metadata = null;
    try {
      const buffer = fs.readFileSync(req.file.path);
      metadata = await analyzeProductImage({ filename: req.file.originalname, buffer, mimeType: req.file.mimetype });
    } catch (e) {}
    fs.unlinkSync(req.file.path);
    res.json({image:`/uploads/${path.basename(output)}`,background,enhanced:true,metadata});
  } catch (error) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Photo enhancement failed:', error.message);
    res.status(500).json({message:'Photo enhancement failed. Please use a valid JPG, PNG, or WebP image under 5MB.'});
  }
});
app.post('/api/ai/search',async(req,res)=>{
  const intent=await searchIntent(String(req.body.query||''));
  const db=readDb();
  let products=db.products;
  if(intent.budget)products=products.filter(p=>p.price<=intent.budget);
  if(intent.category)products=products.filter(p=>p.category.toLowerCase().includes(intent.category)||p.tags.some(t=>t.toLowerCase().includes(intent.category)));
  res.json({intent,products});
});
app.post('/api/ai/customer-assistant', async (req, res) => {
  try {
    const db = readDb();
    const result = await customerAssistant({
      query: req.body.query || '',
      preferences: req.body.preferences || {},
      products: db.products || []
    });
    res.json(result);
  } catch (err) {
    console.error('Customer assistant error:', err);
    res.status(500).json({ message: 'Customer assistant error', error: err.message });
  }
});
app.get('/api/ai/insight',optionalAuth,async(req,res)=>{
  const db = readDb();
  res.json({insight:await businessInsight(db.products, db.orders)});
});

app.get('/api/admin/stats',auth,allow('admin'),(req,res)=>{const db=readDb();res.json({users:db.users.length,artisans:db.users.filter(u=>u.role==='artisan').length,products:db.products.length,orders:db.orders.length,revenue:db.orders.reduce((s,o)=>s+o.total,0),pendingVerification:db.users.filter(u=>u.role==='artisan'&&!u.verified).length});});
app.post('/api/admin/verify/:id',auth,allow('admin'),(req,res)=>{const db=readDb();const u=db.users.find(x=>x.id===req.params.id);if(!u)return res.status(404).json({message:'User not found'});u.verified=true;writeDb(db);log('artisan_verified',req);res.json({user:publicUser(u)});});

app.use('/uploads',express.static(uploadDir));

// Fallback for SPA routing in production or 404 for API
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(clientDist, 'index.html'))) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }
  res.status(404).json({ message: 'Route not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[ArtisanAI Server Error]', err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const server = app.listen(PORT, () => console.log(`ArtisanAI API running on http://localhost:${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ArtisanAI Server Error] Port ${PORT} is already in use by another running Node process.`);
    console.error(`To free port ${PORT}, run in terminal: npx kill-port ${PORT} or taskkill /F /IM node.exe\n`);
  } else {
    console.error('Server error:', err);
  }
});

