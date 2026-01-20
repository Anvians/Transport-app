
import express from 'express'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import cors from 'cors'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import dotenv from 'dotenv'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

dotenv.config()
const app = express()
app.use(cors())

app.use(express.json())

// 1. DATABASE (Mock Shipping Database)
let SHIPMENTS = [];

// 2. DEFINE THE LOGISTICS TOOL
const bookShipmentTool = tool(
    async ({ origin, destination, weight, item }) => {
        // Generate a fake ID
        const id = "SHIP-" + Math.floor(Math.random() * 1000);

        // Save to "Database"
        const newOrder = { id, origin, destination, weight, item, status: "Pending" };
        SHIPMENTS.push(newOrder);

        console.log(" NEW ORDER BOOKED:", newOrder); // Log it so you see it!

        return ` Shipment Booked! ID: ${id}. We will pick up ${weight} of ${item} from ${origin}.`;
    },
    {
        name: "book_shipment", // The AI looks for this name
        description: "Book a new cargo shipment. Extracts origin, destination, weight, and item details.",
        schema: z.object({
            origin: z.string().describe("Where the shipment starts (e.g., Mumbai)"),
            destination: z.string().describe("Where the shipment goes (e.g., Delhi)"),
            weight: z.string().describe("Weight of the cargo (e.g., 50kg)"),
            item: z.string().describe("What is being shipped (e.g., Steel, Fruits)"),
        }),
    }
);



// Tool to check status
const getStatusTool = tool(
    async () => {
        if (SHIPMENTS.length === 0) return "No shipments found.";
        return JSON.stringify(SHIPMENTS, null, 2);
    },
    {
        name: "get_shipment_status",
        description: "Get the status of all current shipments.",
        schema: z.object({}),
    }
);

// 3. PRICING TOOL
const calculateQuoteTool = tool(
    async ({ origin, destination, weight }) => {
        // Mock logic: randomly assume distance is 500km for now
        const distance = 500;
        const weightNum = parseInt(weight); // "500kg" -> 500

        // Simple math: $0.1 per kg per km
        const price = distance * weightNum * 0.1;

        return ` Estimated Quote: $${price} for shipping ${weight} from ${origin} to ${destination}.`;
    },
    {
        name: "get_quote",
        description: "Calculate the shipping price based on weight and route.",
        schema: z.object({
            origin: z.string(),
            destination: z.string(),
            weight: z.string(),
        }),
    }
);

const model = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.7
})

const modelWithTools = model.bindTools([bookShipmentTool, getStatusTool, calculateQuoteTool]);


app.post("/chat", async (req, res) => {
    try {
        const { message, history } = req.body
        console.log("User Sent:", message)

        // Convert frontend json history to langchain format
        const conversation = history.map(msg =>
            msg.role == "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        )

        conversation.push(new HumanMessage(message))

        // Model Thinks

        const aiResponse = await modelWithTools.invoke(conversation)

        // check if it want to use a tool

        if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
            const toolCall = aiResponse.tool_calls[0];
            let toolResult = "";

            console.log(` Agent wants to call: ${toolCall.name}`);

            if (toolCall.name === "book_shipment") {
                toolResult = await bookShipmentTool.invoke(toolCall.args);
            } else if (toolCall.name === "get_shipment_status") {
                toolResult = await getStatusTool.invoke({});
            } else if (toolCall.name === "get_quote") {
                toolResult = await calculateQuoteTool.invoke(toolCall.args);
            }

            res.json({ reply: toolResult });
        } else {
            res.json({ reply: aiResponse.content })
        }

    } catch (error) {
        console.error(" Error:", error);
        res.status(500).json({ error: error.message });
    }
})

app.get("/shipments", (req, res) => {
  res.json(SHIPMENTS);
});


app.listen(3001, () => console.log(" Server running on port 3001"));