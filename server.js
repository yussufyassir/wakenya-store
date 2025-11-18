require("dotenv").config();
const express = require("express");
const axios = require("axios");
const moment = require("moment");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const {
    CONSUMER_KEY,
    CONSUMER_SECRET,
    SHORTCODE,
    PASSKEY,
    CALLBACK_URL
} = process.env;

// Generate OAuth Token
async function getToken() {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` }
    });

    return response.data.access_token;
}

// STK PUSH Endpoint
app.post("/stkpush", async (req, res) => {
    const { phone, amount } = req.body;

    try {
        const token = await getToken();
        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString("base64");

        const stkPayload = {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerBuyGoodsOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: CALLBACK_URL,
            AccountReference: "Wakuweza Store",
            TransactionDesc: "Online Purchase"
        };

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkPayload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({ error: "STK Push Failed" });
    }
});

// CALLBACK Endpoint
app.post("/callback", (req, res) => {
    console.log("M-Pesa Callback:", JSON.stringify(req.body, null, 4));
    res.sendStatus(200);
});

app.listen(3000, () => console.log("Server running on port 3000"));
