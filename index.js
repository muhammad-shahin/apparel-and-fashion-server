const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const app = express();
const port = process.env.port || 5000;

// middleware
app.use(
  cors({
    origin: 'https://fashion-and-apparel-house.web.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middleware to check logs
const logger = async (req, res, next) => {
  const start = Date.now();
  console.log(
    'Request from : ',
    req.hostname,
    req.url,
    'IP Address: ',
    req.ip,
    'Timestamp: ',
    new Date(),
    'Method: ',
    req.method
  );
  res.on('finish', () => {
    const end = Date.now();
    console.log('Request took: ', end - start, 'ms');
  });

  next();
};

// verify token
const verifyToken = (req, res, next) => {
  // const token = req?.cookies?.token;
  const accessToken = req.headers.authorization.split(' ')[1];
  if (!accessToken) {
    return res.status(401).send({ message: 'unauthorized access' });
  }
  jwt.verify(accessToken, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

app.get('/', (req, res) => {
  res.send('Product Data Will Add Soon');
});
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.omvipub.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database = client.db('productDB');
    const productsCollection = database.collection('allProducts');
    const advertisementCollection = database.collection('brandAdvertisement');
    const cartCollection = database.collection('addedCart');
    const usersCollection = database.collection('usersCollection');

    // products related api //

    // create post for store new product
    app.post('/products', async (req, res) => {
      const newProduct = req.body;
      console.log('New Product Added: ', newProduct);
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });
    // read get all products
    app.get('/products', async (req, res) => {
      const cursor = productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // read get all products by brand name
    app.get('/products/:brandName', async (req, res) => {
      const brandName = req.params.brandName;
      const query = { brandName: brandName };

      try {
        const cursor = productsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      }
    });
    // create post for brand advertisement
    app.post('/brandAdvertisement', async (req, res) => {
      const newAdvertisement = req.body;
      console.log('New Brand Advertisement Added: ', newAdvertisement);
      const result = await advertisementCollection.insertOne(newAdvertisement);
      res.send(result);
    });
    // read get all brand advertisement
    app.get('/brandAdvertisement', async (req, res) => {
      const cursor = advertisementCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // read get all ads by brand name
    app.get('/brandAdvertisement/:brandName', async (req, res) => {
      const brandName = req.params.brandName;
      const query = { brandName: brandName };

      try {
        const cursor = advertisementCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      }
    });

    // get product by id
    app.get('/products/:brandName/:productId', async (req, res) => {
      const productId = req.params.productId;
      const query = { _id: new ObjectId(productId) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // store add to cart data by userID
    app.post('/addedCart', async (req, res) => {
      const newCart = req.body;
      const result = await cartCollection.insertOne(newCart);
      res.send(result);
    });
    // get all addedCart data
    app.get('/addedCart', async (req, res) => {
      const cursor = cartCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get cart item by userId
    app.get('/addedCart/:userId', verifyToken, async (req, res) => {
      const userId = req.params.userId;
      if (userId !== req.user.userId) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const query = { userId: userId };
      try {
        const cursor = cartCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });

    // update product details
    app.put('/products/:brandName/:productId', async (req, res) => {
      const id = req.params.productId;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: false };
      const updateProduct = req.body;
      const firstProductImage = updateProduct.productImages[0];
      const product = {
        $set: {
          productName: updateProduct.productName,
          'productImages.0': [firstProductImage],
          brandName: updateProduct.brandName,
          productType: updateProduct.productType,
          productPrice: updateProduct.productPrice,
          productRating: updateProduct.productRating,
        },
      };

      try {
        const result = await productsCollection.updateOne(
          filter,
          product,
          options
        );
        if (result.matchedCount === 1) {
          // Update product successfully
          res.json(result);
        } else {
          res.status(404).send('Product not found');
        }
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      }
    });

    // delete product from cart
    // DELETE
    app.delete('/addedCart/:userId/:cartId', async (req, res) => {
      const id = req.params.cartId;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    /*
     checkout (stripe payment) related api 
    */

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const ammount = parseInt(price * 100);

      // Create a PaymentIntent with the order amount and currency
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: ammount,
          currency: 'usd',
          payment_method_types: ['card'],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      }
    });

    /*
     token related api 
    */

    // generate token on authentication
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('User uid : ', user);
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: '30d',
      });
      res.send({ success: true, token: `Bearer ${token}` });
    });

    // clear cookie on logout
    app.post('/logout', async (req, res) => {
      const user = req.body;
      res
        .clearCookie('token', {
          maxAge: 0,
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
        })
        .send({ success: true });
    });

    // user related api //

    // post user data on registration
    app.post('/users', async (req, res) => {
      const user = req.body;
      const userId = user.userId;
      console.log('USer id from users endpoint: ', userId);
      const query = { userId: userId };
      const isRegistered = await usersCollection.findOne(query);
      console.log('isRegisterd : ', isRegistered);
      if (isRegistered) {
        return res.send({ message: 'user already registered' });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get user data by userId
    app.get('/users/:userId', async (req, res) => {
      const userId = req.params.userId;
      const filter = { userId: userId };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.log);

app.listen(port, () => {
  console.log('Server is Running On Port ', port);
});
