import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose"; 
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONNECT TO DATABASE ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/transport_app";

mongoose.connect(MONGO_URI)
  .then(() => console.log(" Connected to MongoDB"))
  .catch(err => console.error(" MongoDB Error:", err));

// ---  DEFINE THE SCHEMA (The Blueprint) ---
const shipmentSchema = new mongoose.Schema({
  origin: String,
  destination: String,
  weight: String,
  item: String,
  status: { type: String, default: "Pending" },
  date: { type: Date, default: Date.now }
});

// Create the Model
const Shipment = mongoose.model("Shipment", shipmentSchema);

// ---  TOOLS ---
const bookShipmentTool = tool(
  async ({ origin, destination, weight, item }) => {
    try {
      // Create a new document in MongoDB
      const newOrder = await Shipment.create({
        origin,
        destination,
        weight,
        item
      });

      console.log(" DATABASE ENTRY CREATED:", newOrder._id);

      return `Shipment Booked! ID: ${newOrder._id}. We will pick up ${weight} of ${item} from ${origin}.`;
    } catch (err) {
      return " Error booking shipment: " + err.message;
    }
  },
  {
    name: "book_shipment",
    description: "Book a new cargo shipment.",
    schema: z.object({
      origin: z.string(),
      destination: z.string(),
      weight: z.string(),
      item: z.string(),
    }),
  }
);

const getStatusTool = tool(
  async () => {
    // Fetch all documents from MongoDB
    const shipments = await Shipment.find({});
    if (shipments.length === 0) return "No shipments found in the database.";
    
    // Convert to simple string for the AI
    return JSON.stringify(shipments.map(s => ({
      id: s._id,
      route: `${s.origin} to ${s.destination}`,
      status: s.status
    })));
  },
  {
    name: "get_shipment_status",
    description: "Get the status of all current shipments.",
    schema: z.object({}),
  }
);

// --- THE AI MODEL ---
const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});

const modelWithTools = model.bindTools([bookShipmentTool, getStatusTool]);

// ---  API ENDPOINTS ---

// Chat Endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const conversation = history.map(msg => 
      msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    );
    conversation.push(new HumanMessage(message));

    const aiResponse = await modelWithTools.invoke(conversation);

    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      const toolCall = aiResponse.tool_calls[0];
      let toolResult = "";

      if (toolCall.name === "book_shipment") {
        toolResult = await bookShipmentTool.invoke(toolCall.args);
      } else if (toolCall.name === "get_shipment_status") {
        toolResult = await getStatusTool.invoke({});
      }

      res.json({ reply: toolResult });
    } else {
      res.json({ reply: aiResponse.content });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Endpoint (Fetch from Real DB)
app.get("/shipments", async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ date: -1 }); // Newest first
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.listen(3001, () => console.log(" Server running on port 3001"));