import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, {recursive:true});
const file = path.join(dataDir, 'db.json');

function seed(){
  if(fs.existsSync(file)) return;
  const password = bcrypt.hashSync('Artisan@123', 10);
  const customerPass = bcrypt.hashSync('Customer@123',10);
  const adminPass = bcrypt.hashSync('Admin@123',10);
  const now = new Date().toISOString();
  const artisanId='artisan-demo', customerId='customer-demo', adminId='admin-demo';
  const db={
    users:[
      {id:artisanId,name:'Lakshmi Devi',email:'artisan@demo.com',password,role:'artisan',phone:'+91 90000 00001',language:'Tamil',verified:true,createdAt:now},
      {id:customerId,name:'Arun Kumar',email:'customer@demo.com',password:customerPass,role:'customer',phone:'+91 90000 00002',language:'English',verified:true,createdAt:now},
      {id:adminId,name:'Platform Admin',email:'admin@demo.com',password:adminPass,role:'admin',language:'English',verified:true,createdAt:now}
    ],
    products:[
      {id:'p1',artisanId,name:'Handwoven Bamboo Fruit Basket',category:'Bamboo Craft',price:499,description:'Meticulously handwoven from seasoned natural bamboo. Lightweight, durable, and 100% biodegradable for conscious living and festive hampers.',material:'Natural bamboo',location:'Assam & Tamil Nadu',tags:['bamboo','handmade','eco-friendly','basket','gift','home decor'],image:'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=80',stock:18,createdAt:now},
      {id:'p2',artisanId,name:'Terracotta Festive Diya Lamp',category:'Terracotta',price:699,description:'Traditional terracotta clay lamp hand-thrown on a potters wheel with intricate lattice carvings for warm, ambient festive lighting.',material:'Terracotta clay',location:'Panchmura, West Bengal',tags:['terracotta','lamp','clay','traditional','diwali','gift','lighting'],image:'https://images.unsplash.com/photo-1602874801006-e26c8c6e6f25?auto=format&fit=crop&w=900&q=80',stock:15,createdAt:now},
      {id:'p3',artisanId,name:'Treated Palm Leaf Storage Trunk',category:'Palm Leaf Craft',price:849,description:'Eco-friendly organizer trunk woven from sun-cured palm leaves with traditional herringbone weave pattern.',material:'Palm leaf & cotton twine',location:'Tamil Nadu',tags:['palm leaf','storage','eco-friendly','sustainable','organizer'],image:'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=80',stock:10,createdAt:now},
      {id:'p4',artisanId,name:'Handcrafted Dhokra Brass Bell',category:'Brass Craft',price:1299,description:'Lost-wax cast brass tribal bell crafted by master Dhokra metalsmiths. Produces a clear, resonant chime for pooja rooms or patio decor.',material:'Cast Bell Brass',location:'Bastar, Chhattisgarh',tags:['brass','dhokra','metal','tribal','bell','pooja','traditional'],image:'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=80',stock:8,createdAt:now},
      {id:'p5',artisanId,name:'Jaipur Blue Pottery Floral Vase',category:'Pottery',price:1450,description:'Authentic quartz-powder blue pottery vase with Persian cobalt motifs. Fired without clay using traditional recipes from Rajasthan.',material:'Quartz stone & natural glass glaze',location:'Jaipur, Rajasthan',tags:['blue pottery','jaipur','pottery','vase','ceramic','home decor','gift'],image:'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=80',stock:12,createdAt:now},
      {id:'p6',artisanId,name:'Handloom Organic Cotton Saree',category:'Textile',price:2850,description:'Pure handloom cotton saree woven on traditional pit looms with natural plant-based indigo dye and hand block printed border.',material:'Organic Handspun Cotton',location:'Chanderi, Madhya Pradesh',tags:['cotton','saree','textile','handloom','indigo','clothing','wedding'],image:'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',stock:6,createdAt:now},
      {id:'p7',artisanId,name:'Kashmir Walnut Wood Carved Box',category:'Woodwork',price:1899,description:'Intricately hand-carved jewelry keepsake box crafted from aged Kashmiri walnut wood with floral filigree relief work.',material:'Seasoned Walnut Wood',location:'Srinagar, Kashmir',tags:['wood','walnut','carving','box','keepsake','gift','luxury'],image:'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=80',stock:9,createdAt:now},
      {id:'p8',artisanId,name:'Hand-Painted Madhubani Wall Art',category:'Painting',price:2100,description:'Authentic Mithila folk painting depicting Tree of Life using natural twig brushes and vegetable pigments on handmade rice paper.',material:'Handmade Rice Paper & Natural Dyes',location:'Madhubani, Bihar',tags:['painting','madhubani','wall art','folk art','traditional','home decor'],image:'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=900&q=80',stock:5,createdAt:now},
      {id:'p9',artisanId,name:'Braided Jute Floor Mat & Runner',category:'Jute Craft',price:750,description:'Thick, durable runner hand-braided from golden jute fibers. Naturally dirt-resistant, reversible, and 100% compostable.',material:'Golden Natural Jute',location:'West Bengal',tags:['jute','rug','mat','runner','eco-friendly','sustainable','home decor'],image:'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=900&q=80',stock:14,createdAt:now},
      {id:'p10',artisanId,name:'Dokra Brass Peacock Figurine',category:'Brass Craft',price:1650,description:'Handcrafted antique brass peacock sculpture made with ancient 4000-year-old non-ferrous metal casting method.',material:'Cast Brass Alloy',location:'Odisha',tags:['brass','sculpture','peacock','dhokra','traditional','gift','metal'],image:'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=80',stock:7,createdAt:now},
      {id:'p11',artisanId,name:'Terracotta Clay Cooking Handi Pot',category:'Terracotta',price:550,description:'Unglazed natural earthenware handi pot for slow cooking. Retains nutrients, alkalizes acidity, and infuses natural earthy aroma into curries.',material:'Natural Earthen Clay',location:'Thanjavur, Tamil Nadu',tags:['terracotta','clay','cooking','pot','handi','kitchen','organic'],image:'https://images.unsplash.com/photo-1602874801006-e26c8c6e6f25?auto=format&fit=crop&w=900&q=80',stock:20,createdAt:now},
      {id:'p12',artisanId,name:'Hand-Block Printed Silk Stole',category:'Textile',price:1350,description:'Lightweight mulberry silk stole with Bagru vegetable dye wooden block prints, finished with hand-knotted fringe.',material:'Mulberry Silk',location:'Bagru, Rajasthan',tags:['silk','stole','scarf','block print','fashion','gift','textile'],image:'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80',stock:11,createdAt:now}
    ],
    orders:[
      {id:'ord-101',customerId,items:[{productId:'p1',name:'Handwoven Bamboo Fruit Basket',price:499,qty:1,artisanId}],total:499,address:{name:'Arun Kumar',street:'12 Gandhi Road',city:'Chennai',state:'Tamil Nadu',pincode:'600001'},status:'Delivered',paymentStatus:'Demo-Paid',createdAt:now}
    ],
    reviews:[], sessions:[], auditLogs:[]
  };
  fs.writeFileSync(file, JSON.stringify(db,null,2));
}
seed();
export function readDb(){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function writeDb(db){fs.writeFileSync(file,JSON.stringify(db,null,2));}
