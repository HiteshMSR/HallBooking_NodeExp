import express from "express"
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
// const MONGO_URL = "mongodb://localhost";
 //const MONGO_URL = "mongodb+srv://hitesh:hitesh@cluster0.cquwee5.mongodb.net/"; //  nodejs - 16+
 
 dotenv.config()

 const MONGO_URL=process.env.MONGO_URL;

async function createConnection() {
    const client = new MongoClient(MONGO_URL);
   await client.connect();
   console.log("Mongo is connected ✌😊");
   return client;
 }

const app = express()
app.use(express.json())
 
const PORT=process.env.PORT
console.log(PORT)

const client = await createConnection();
app.get('/', function (req, res) {
  res.send('Hello World')
})



  app.post("/createroom", async function(req,res){
    const data=req.body;
    console.log(data)
    const result=await createRoom(data)

    res.send(result)

  })
  
  app.post("/bookroom", async function(req,res){
    const data = req.body;
    const { id, booking_date, start_time, end_time } = data;
    data.booking_date = new Date(booking_date);
    data.start_time = new Date(booking_date + "T" + start_time + ":00.000Z");
    data.end_time = new Date(booking_date + "T" + end_time + ":00.000Z");
    data.booking_status = "booked";
  
    let isbookedresult;
  
    isbookedresult = await client
      .db("hall-booking")
      .collection("booked_rooms")
      .find({
        $and: [
          {
            $or: [
              {
                $and: [
                  { start_time: { $lte: new Date(data.start_time) } },
                  { end_time: { $gte: new Date(data.start_time) } },
                ],
              },
              {
                $and: [
                  { start_time: { $lte: new Date(data.end_time) } },
                  { end_time: { $gte: new Date(data.end_time) } },
                ],
              },
            ],
          },
          { id: id },
        ],
      })
      .toArray();
  
    if (isbookedresult.length == 0) {
      let result = await client
        .db("hall-booking")
        .collection("booked_rooms")
        .insertOne(data);
  
      let updateresult = await client
        .db("hallbookings")
        .collection("Rooms")
        .updateOne({ _id:id}, { $set: { booking_status: "Booked" } });
  
      res.send(result);
    } else {
      res.status(400).send("Room is already booked for this time slot");
    }
  })
  
  app.get("/listcustomers", async function (req, res) {
    console.log("list customer request made");
    let query = [
      { $addFields: { article_id: { $toString: "$_id" } } },
      {
        $lookup: {
          from: "booked_rooms",
          localField: "article_id",
          foreignField: "id",
          as: "booking_Details",
        },
      },
      { $unwind: "$booking_Details" },
      {
        $project: {
          _id: 0,
          "customer name": "$booking_Details.customer_name",
          "room name": "$room_name",
          "booking date": "$booking_Details.booking_date",
          "start time": "$booking_Details.start_time",
          "end time": "$booking_Details.end_time",
        },
      },
    ];
  
    const customerList = await client
      .db("hall-booking")
      .collection("rooms")
      .aggregate(query)
      .toArray();
  
    res.send(customerList);
  });
  
  app.get("/listrooms", async function (req, res) {
    let query = [
      { $addFields: { room_id: { $toString: "$_id" } } },
      {
        $lookup: {
          from: "booked_rooms",
          localField: "room_id",
          foreignField: "id",
          as: "booking_Details",
        },
      },
      { $unwind: "$booking_Details" },
      {
        $project: {
          _id: 0,
          "room number": "$_id",
          "room name": "$room_name",
          "Booking Status": "$booking_status",
          "customer name": "$booking_Details.customer_name",
          "booking time": "$booking_Details.booking_date",
          "start time": "$booking_Details.start_time",
          "end date": "$booking_Details.end_time",
        },
      },
    ];
  
    const listrooms = await client
      .db("hall-booking")
      .collection("rooms")
      .aggregate(query)
      .toArray();
  
    res.send(listrooms);
  });


  function createRoom(data){        
    return client.db("hallbookings").collection("Rooms").insertOne(data);
  }

//   function bookRoom(data){        
//     return client.db("hallbookings").collection("bookings").insertOne(data);
//   }
  app.listen(PORT,()=>{console.log(`App started in ${PORT}`)}) 