const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <h1>سلام متین! 🚀</h1>
    <p>سرور با موفقیت اجرا شد.</p>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
