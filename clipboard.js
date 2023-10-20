// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jgwsa87.mongodb.net/?retryWrites=true&w=majority`;

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

    const database = client.db('quizDB');
    const quizCollection = database.collection('quiz');
    const submittedQuizCollection = database.collection('submittedQuiz');

    // create (POST)
    app.post('/quiz', async (req, res) => {
      const newQuiz = req.body;
      try {
        console.log('New Quiz Created : ', req.body);
        const result = await quizCollection.insertOne(newQuiz); //adding data into quiz collection and storing it's result in result (if data failed to store it will give an error and the error will also be stored in result variable)
        res.send(result); //sending a response in client side so that they can check the data is stored or not
      } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // create post for store quizSubmittedData
    app.post('/submitted-quiz', async (req, res) => {
      const submittedQuiz = req.body;
      console.log(submittedQuiz);
      const result = submittedQuizCollection.insertMany(submittedQuiz);
      res.send(result);
    });

    // read (GET)
    app.get('/quiz', async (req, res) => {
      const cursor = quizCollection.find();
      const result = await cursor.toArray();
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