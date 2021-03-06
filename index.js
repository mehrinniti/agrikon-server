const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require("mongodb").ObjectId;
const res = require('express/lib/response');
const admin = require("firebase-admin");
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;

//  firebase admin initialization
const serviceAccount = require('./agrikon-agricultural-website-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());

// DB_USER=agrikonDB
// DB_PASS=DsQmkuNzdW4l3Yvq

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j1xrd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }


    }
    next();
}


async function run() {
    try {
        await client.connect();
        const database = client.db('agrikon')
        const productCollection = database.collection("products");
        const farmerCollection = database.collection('farmers');
        const orderCollection = database.collection('orders');
        const usersCollection = database.collection('users');
        const reviewCollection = database.collection('reviews');
        const messageCollection = database.collection('messages');

        //  get Single Order

        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            // const date = req.query.date;
            // const date = new Date(req.query.date).toLocaleDateString();
            // console.log(date);
            const query = { userEmail: email }
            console.log(email)
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        })

        //  get orders
        // app.get('/orders', verifyToken, async (req, res) => {
        //     const cursor = orderCollection.find({});
        //     const result = await cursor.toArray();
        //     res.send(result);
        // })

        //  get all orders
        app.get('/allOrders', verifyToken, async (req, res) => {
            const cursor = orderCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        })

        // get all order single id
        app.get("/allOrders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        });

        // update order status api
        app.put("/allOrders/:id", async (req, res) => {
            const id = req.params.id;
            const updateOrder = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updateOrder.status,
                },
            };
            const result = await orderCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.json(result);
        });


        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            // console.log(result);
            res.json(result)
        })

        // PUT Update orders status api
        app.put("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const updatedOrder = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updatedOrder.status,
                },
            };
            const result = await orderCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.json(result);
        });

        // DELETE my order api
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        });

        // GET Products API
        app.get("/products", async (req, res) => {
            const cursor = productCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        });

        // GET single product api
        app.get("/products/:id", async (req, res) => {
            const id = req.params.id;
            console.log('getting specific product', id)
            const query = { _id: ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        });

        //post Products api
        app.post('/products', async (req, res) => {
            const allProduct = req.body;
            console.log("hit the post api", allProduct)
            const result = await productCollection.insertOne(allProduct);
            console.log(result);
            res.json(result);
            // res.send('post hitted')
        });

        //delete Product api
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.json(result);
        });

        //  get single order for payment
        app.get("/payment/:id", async (req, res) => {
            const id = req.params.id;
            console.log('getting specific order', id)
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            console.log('order payment result : ', result);
            res.json(result);

        });

        //  post payment
        app.post('/create-payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            // Create a PaymentIntent with the order amount and currency
            const amount = paymentInfo.productPrice * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            res.json({ clientSecret: paymentIntent.client_secret });
        })

        // update order for payment
        app.put("/payment/:id", async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment,
                },
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.json(result);
            console.log('payment result :', result);
        });




        // update order status api
        // app.put("/paymentUpdate/:id", async (req, res) => {
        //     const id = req.params.id;
        //     const updatePayment = req.body;
        //     const filter = { _id: ObjectId(id) };
        //     const options = { upsert: true };
        //     const updateDoc = {
        //         $set: {
        //             status: updateOrder.status,
        //         },
        //     };
        //     const result = await orderCollection.updateOne(
        //         filter,
        //         updateDoc,
        //         options
        //     );
        //     console.log('update order payment result : ', result);
        //     res.json(result);

        // });





        // GET farmers API
        app.get("/farmers", async (req, res) => {
            const cursor = farmerCollection.find({});
            const result = await cursor.toArray();
            res.send(result);
        });

        // GET single farmers api
        app.get("/farmers/:id", async (req, res) => {
            const id = req.params.id;
            console.log('getting specific product', id)
            const query = { _id: ObjectId(id) };
            const result = await farmerCollection.findOne(query);
            res.send(result);
        });

        //post farmers api
        app.post('/farmers', async (req, res) => {
            const allFarmer = req.body;
            console.log("hit the post api", allFarmer)
            const result = await farmerCollection.insertOne(allFarmer);
            console.log(result);
            res.json(result);
            // res.send('post hitted')
        });

        //delete farmers api
        app.delete('/farmers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await farmerCollection.deleteOne(query);
            res.json(result);
        });

        // get reviews api
        app.get("/reviews", async (req, res) => {
            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // POST a reviews api
        app.post("/reviews", async (req, res) => {
            const review = req.body;
            console.log('hit the post api', review);
            const result = await reviewCollection.insertOne(review);
            console.log(result);
            res.json(result);
            // res.send('post hitted')
        });

        // GET a message api
        app.get("/messages", async (req, res) => {
            const cursor = messageCollection.find({});
            const messages = await cursor.toArray();
            res.send(messages);
        })

        // POST a message api
        app.post("/messages", async (req, res) => {
            const message = req.body;
            console.log('hit the post api', message);
            const result = await messageCollection.insertOne(message);
            console.log(result);
            res.json(result);
        });

        //  Users

        //  Special users
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        //  Sign up users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        })

        //  Social media users
        app.put('/users', async (req, res) => {
            const user = req.body;
            // const filter = { email: user.email };
            const filter = { userEmail: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        //  Make Admin
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin.' })
            }

        })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})