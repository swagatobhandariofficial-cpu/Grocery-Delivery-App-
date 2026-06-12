const Razorpay = require("razorpay");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed", err);
  } else {
    console.log("MySQL Connected ✅");
  }
});
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    `
SELECT
id,
name,
email,
role

FROM users

WHERE email=?
AND password=?
`,
    [email, password],

    (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Server Error",
        });
      }

      if (result.length === 0) {
        return res.status(401).json({
          message: "Invalid Email or Password",
        });
      }

      res.json({
        success: true,

        user: {
          id: result[0].id,

          name: result[0].name,

          email: result[0].email,

          role: result[0].role,
        },
      });
    },
  );
});

// SIGNUP
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=?",
    [email],

    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Server Error",
        });
      }

      if (result.length) {
        return res.status(400).json({
          success: false,
          message: "Email Exists",
        });
      }

      db.query(
        `
INSERT INTO users
(name,email,password,role)

VALUES
(?,?,?,?)
`,

        [name, email, password, "user"],

        (err) => {
          if (err) {
            console.log(err);

            return res.status(500).json({
              success: false,
              message: "Insert Failed",
            });
          }

          res.json({
            success: true,
          });
        },
      );
    },
  );
});

// GET PRODUCTS
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(result);
    }
  });
});

// ADD PRODUCT
app.post("/products", (req, res) => {
  const {
    name,
    category,
    price,
    stock,
    image,
    discount = 0,
  } = req.body;

  if (discount < 0 || discount > 30) {
    return res.status(400).json({
      message: "Discount must be between 0 and 30",
    });
  }

  db.query(
    `
INSERT INTO products
(name, category, price, stock, image, discount)
VALUES (?, ?, ?, ?, ?, ?)
`,
    [name, category, price, stock, image, discount],

    (err) => {
      if (err) {
        console.log(err);
        res.status(500).json(err);
      } else {
        res.json({
          message: "Product Added",
        });
      }
    },
  );
});

// DELETE PRODUCT
app.delete("/products/:id", (req, res) => {
  const id = req.params.id;

  db.query(
    "DELETE FROM products WHERE id=?",
    [id],

    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).json(err);
      } else {
        res.json({
          message: "Deleted",
          result,
        });
      }
    },
  );
});

// UPDATE PRODUCT
app.put("/products/:id", (req, res) => {
  const id = req.params.id;

  const {
    name,
    category,
    price,
    stock,
    image,
    discount = 0,
  } = req.body;

  if (discount < 0 || discount > 30) {
    return res.status(400).json({
      message: "Discount must be between 0 and 30",
    });
  }

  db.query(
    `
UPDATE products
SET
name=?,
category=?,
price=?,
stock=?,
image=?,
discount=?
WHERE id=?
`,
    [
      name,
      category,
      price,
      stock,
      image,
      discount,
      id,
    ],

    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json(err);
      }

      res.json({
        message: "Updated",
        result,
      });
    },
  );
});

// PLACE ORDER
app.post("/orders", (req, res) => {
  const { products, total } = req.body;

  db.query(
    `
INSERT INTO orders
(products,total)
VALUES (?,?)
`,
    [JSON.stringify(products), total],

    (err) => {
      if (err) {
        console.log(err);
        res.status(500).json(err);
      } else {
        res.json({
          message: "Order Saved",
        });
      }
    },
  );
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Order creation failed",
    });
  }
});

// GET ORDERS
app.get("/orders", (req, res) => {
  db.query(
    "SELECT * FROM orders ORDER BY id DESC",

    (err, result) => {
      if (err) {
        console.log(err);

        res.status(500).json({
          error: "Failed to fetch orders",
        });
      } else {
        res.json(result);
      }
    },
  );
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
