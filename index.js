import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
const{Pool}=pkg;
dotenv.config();
const pool = new Pool({
  user: process.env.name,
  host: process.env.host,
  database: process.env.database,
  password: process.env.password,
  port: process.env.port,
});


// Using the pool to query
(async () => {
  try {
    const result = await pool.query("SELECT * FROM buyers");
    console.log(result.rows.name);
  } catch (err) {
    console.error("Error executing query", err.stack);
  }
})();
const app=express();
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.set('view engine','ejs')
app.get('/',(req,res)=>{
  res.render('index.ejs')
})
app.get('/login',(req,res)=>{
  res.render('login.ejs')
})
app.get('/farmerlogin',(req,res)=>{
  res.render('farmerlogin.ejs')
})
app.get('/signup',(req,res)=>{
  res.render('signup.ejs')
})
app.get('/farmersignup',(req,res)=>{
  res.render('farmersignup.ejs')
})

//usersignup
app.post('/signup',async(req,res)=>{
  if(req.body.password!==req.body.confirmpwd){
    res.render('signup.ejs', { error: "Invalid credentials" });
  }else{
  const result = await pool.query(
    "INSERT INTO buyers (email, password,name) VALUES ($1, $2,$3)", 
    [req.body.email, req.body.password,req.body.name]
  );
  res.redirect('userdashboard')
}
});

//userlogin using axios
app.post('/login',async(req,res)=>{
  const result= await axios.post('http://localhost:5000/login',req.body);
  if(result.data.error){
    res.render('login.ejs',{error:"Invalid credentials"})
  }
  else{
  res.redirect('userdashboard')
  }
});

//farmersignup
app.post('/farmersignup',async(req,res)=>{
  if(req.body.password!=req.body.confirmpassword){
    res.render('farmersignup.ejs', { error: "Invalid credentials" });
  }else{
  const result = await pool.query(
    "INSERT INTO farmers (name, email,password) VALUES ($1, $2, $3)", 
    [req.body.name, req.body.password,req.body.email]
  );
  res.redirect('farmerdashboard')
}
});

var name;
app.post('/farmerlogin',async(req,res)=>{
  const result = await pool.query(
    "SELECT * FROM farmers WHERE email=$1 AND password=$2", 
    [req.body.email, req.body.password]
  );
  if(result.rows.length==0){
    res.render('farmerlogin.ejs', { error: "Invalid credentials" });
  }
  else{
    res.redirect('farmerdashboard')
    name=result.rows[0].name;
  }
});



//product adding
app.get('/addproduct',(req,res)=>{
  res.render('addproduct.ejs')
})
app.post('/addproduct',upload.single('productImage'),async(req,res)=>{
  if (!req.file) {
    return res.render('addproduct.ejs', { error: "No image uploaded" });
  }

  const { productname, productDescription, productPrice, productQuantity } = req.body;
  const { buffer, originalname } = req.file; // Multer stores the file in memory as a buffer

  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, quantity, img) VALUES ($1, $2, $3, $4, $5)',
      [productname, productDescription, productPrice, productQuantity, buffer]  // Insert image as buffer
    );

    res.render('addproduct.ejs', { datafound: "Product added successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding product.');
  }
});



app.post('/loans',async(req,res)=>{
  const result = await pool.query(
    "INSERT INTO loans(name,description,url) VALUES ($1, $2, $3)",
    [req.body.loanname,req.body.loandescription,req.body.url]);
    res.render('loans.ejs',{datafound:"loan added successfully"})
});
app.get('/loans',async(req,res)=>{
  const result = await pool.query("SELECT * FROM loans");
  console.log(result.rows);
  res.render('loans.ejs',{loans:result.rows})
});
app.post('/marketprice',async(req,res)=>{
  const result = await pool.query(
    "INSERT INTO marketprice(name,price) VALUES ($1, $2)",
    [req.body.productname,req.body.productprice]);
    res.render('marketprice.ejs',{datafound:"market price added successfully"})
});

app.post('/fertilizers',async(req,res)=>{
  const result = await pool.query(
    "INSERT INTO fertilizers(name,description,price,quantity,img) VALUES ($1, $2, $3,$4,$5)",
    [req.body.fertilizername,req.body.fertilizerdescription,req.body.fertilizerprice,req.body.fertilizerquantity,req.body.fertilizerImage]);
    res.render('fertilizers.ejs',{datafound:"fertilizer added successfully"})
}
);

app.get('/products', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products");
    const products = result.rows.map(product => {
      if (product.img) {
        product.img = `data:image/jpeg;base64,${product.img.toString('base64')}`;
      }
      return product;
    });
    res.render('products', { products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving products");
  }
});


app.get('/farmerdashboard',async(req,res)=>{
  const getFirstDayOfMonth = (monthOffset = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  const totalmoneythismonth = await pool.query(
    "SELECT sum(price) FROM payment WHERE dateofpurchase >= $1",
    [getFirstDayOfMonth(0)] 
  );
  const firstDayOfLastMonth = getFirstDayOfMonth(1); 
const firstDayOfThisMonth = getFirstDayOfMonth(0);
  const totalmoneylastmonth = await pool.query(
    "SELECT sum(price) FROM payment WHERE dateofpurchase >= $1 AND dateofpurchase < $2",
    [firstDayOfLastMonth, firstDayOfThisMonth]
  );
  const totalmoneylastthreemonths = await pool.query(
    "SELECT sum(price) FROM payment WHERE dateofpurchase >= $1",
    [getFirstDayOfMonth(3)] 
  );
  const query = `
    SELECT 
      to_char(dateofpurchase, 'Mon') AS month,
      EXTRACT(MONTH FROM dateofpurchase) AS month_number,
      sum(price) AS total_earnings,sum(quantity) as total_quantity
    FROM payment
    WHERE dateofpurchase >= date_trunc('year', CURRENT_DATE)
    GROUP BY month, month_number
    ORDER BY month_number;
  `;

  const result = await pool.query(query);
  const monthlyEarnings = result.rows;
  const earnings = monthlyEarnings;
const labels = earnings.map(row => row.month);
const data = earnings.map(row => row.total_earnings);
const quantity=earnings.map(row=>row.total_quantity);
  res.render('farmerdashboard.ejs',{name:"sai kiran",totalmoneythismonth:totalmoneythismonth.rows[0].sum,totalmoneylastmonth:totalmoneylastmonth.rows[0].sum,totalmoneylastthreemonths:totalmoneylastthreemonths.rows[0].sum,labels:labels,data:data,quantity:quantity})
})

app.get('/userdashboard',async(req,res)=>{
  try {
    const result = await pool.query("SELECT * FROM products");
    const products = result.rows.map(product => {
      if (product.img) {
        product.img = `data:image/jpeg;base64,${product.img.toString('base64')}`;
      }
      return product;
    });
    res.render('userdashboard', { products ,name:"sai kiran"});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving products");
  }
})


app.get('/marketprice',(req,res)=>{
  res.render('marketprice.ejs')
})
app.get('/loans',(req,res)=>{
  res.render('loans.ejs')
})
app.get('/fertilizers',async(req,res)=>{
  try {
    const result = await pool.query("SELECT * FROM fertilizers");
    const fertilizers = result.rows.map(ferti => {
      if (ferti.img) {
        ferti.img = `data:image/jpeg;base64,${ferti.img.toString('base64')}`;
      }
      return ferti;
    });
    res.render('fertilizers', { fertilizers });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving products");
  }
})


app.get('/products',(req,res)=>{
  res.render('products.ejs',{user:name})
})


app.post('/purchases',async(req,res)=>{
  const result = await pool.query(
    "INSERT INTO payment(name,productname,dateofpurchase,quantity,price,address,phone) VALUES ($1, $2, $3)",
    [req.body.name,req.body.productname,req.body.dateofpurchase,req.body.mode,req.body.quantity,req.body.price,req.body.address,req.body.phone]);
    res.render('purchases.ejs',{datafound:"product purchased successfully"})
});
const data=[];
const quantity={};
app.get('/buyed/:id',async(req,res)=>{
  if(!data.includes(req.params.id)){
  data.push(req.params.id);
  }
  if(quantity[req.params.id]==0){
    const index=data.indexOf(req.params.id);
    data.splice(index,1);
  }
  if(!quantity[req.params.id]){
    quantity[req.params.id]=1;
  }
  console.log(data);
  const result = await pool.query("SELECT * FROM products where id=any($1)",[data]);
    const products = result.rows.map(product => {
      if (product.img) {
        product.img = `data:image/jpeg;base64,${product.img.toString('base64')}`;
      }
      return product;
    });
    console.log("data from buyed products")
    console.log(quantity);
    if(data.length==0){
      res.redirect('/products');
    }
    res.render('cartandcheckout',{products:products,quantity:quantity})
});

app.post('/increment/:id',(req,res)=>{
  quantity[req.params.id]+=1;
  res.redirect('/buyed/'+req.params.id);
})
app.post('/decrement/:id',(req,res)=>{
  quantity[req.params.id]-=1;
  res.redirect('/buyed/'+req.params.id);
})

app.post('/remove/:id',(req,res)=>{
  quantity[req.params.id]=0;
  const index=data.indexOf(req.params.id);
  console.log(data,index);
  data.splice(index,1);
  console.log(data);
  res.redirect('/buyed/'+req.params.id);
}
)



app.get('/purchases',async(req,res)=>{
  const result = await pool.query("SELECT * FROM payment");
  console.log(result.rows);
  res.render('purchases.ejs',{purchases:result.rows})
});
app.get('/cartandcheckout',(req,res)=>{
  res.render('cartandcheckout.ejs')
})


app.post('/cartandcheckout/success',async(req,res)=>{
   const result = await pool.query(
     "INSERT INTO payment(name,productname,dateofpurchase,mode,quantity,price,address,phone) VALUES ($1, $2, $3,$4,$5,$6,$7,$8)",
    [req.body.name,req.body.names,new Date(),req.body.mode,req.body.quantities,req.body.sum,req.body.address,req.body.contact]);
  const date = new Date().toString();
    res.render('success.ejs',{price:req.body.sum,date:date,mode:req.body.mode})
})







app.get('/addtocart/:id',async(req,res)=>{
  try{
  const result = await pool.query("SELECT * FROM products WHERE id=$1",[req.params.id]);
  console.log(result.rows);
  const products = result.rows.map(product => {
    if (product.img) {
      product.img = `data:image/jpeg;base64,${product.img.toString('base64')}`;
    }
    return product;
  });
  res.render('product', { products ,name:"sai kiran"});
} catch (err) {
  console.error(err);
  res.status(500).send("Error retrieving product");
}
})


app.listen(8000,()=>{console.log("server started at 8000")})