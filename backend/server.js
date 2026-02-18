const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;


app.get('/', (req, res) => {
  res.send("CDH Backend Running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const axios = require("axios");

app.get("/aqi", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.waqi.info/feed/delhi/?token=demo"
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch AQI" });
  }
});
