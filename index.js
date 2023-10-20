const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.port || 5000;

// mbrandNamedleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Product Data Will Add Soon');
});
console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);
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
    await client.connect();

    const database = client.db('productDB');
    const productsCollection = database.collection('allProducts');
    const advertisementCollection = database.collection('brandAdvertisement');
    const cartCollection = database.collection('addedCart');

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
      const capitalizedBrandName =
        brandName.charAt(0).toUpperCase() + brandName.slice(1);
      const query = { brandName: capitalizedBrandName };

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
      console.log('New Cart Item Added: ', newCart);
      const result = await cartCollection.insertOne(newCart);
      res.send(result);
    });
    // get cart item by userId
    app.get('/addedCart/:userId', async (req, res) => {
      const userId = req.params.userId;
      const query = { userId: userId };

      try {
        const cursor = cartCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      }
    });

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