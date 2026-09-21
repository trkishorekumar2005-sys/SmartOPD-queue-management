require("dotenv").config();
require("./config/validateEnv")();

const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/healthRoutes");
const patientRoutes = require("./routes/patientRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const queueRoutes = require("./routes/queueRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const authRoutes = require("./routes/authRoutes");
const statsRoutes = require("./routes/statsRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const port = process.env.PORT || 5000;

app.disable("x-powered-by");
app.use(express.json());
app.use(cors());
app.use("/api/health", healthRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use(errorHandler.notFoundHandler);
app.use(errorHandler);

// A stray rejected promise should be logged, not take the whole queue system down.
process.on("unhandledRejection", (reason) => {
  console.error(`Unhandled rejection: ${reason?.message || reason}`);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`SmartOPD backend is running on http://localhost:${port}`);
});
