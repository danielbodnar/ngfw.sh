import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { DeviceList } from "./deviceList";
import { DeviceRegister } from "./deviceRegister";
import { DeviceDelete } from "./deviceDelete";
import { DeviceStatus } from "./deviceStatus";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const fleetRouter = fromHono(app);

fleetRouter.get("/devices", DeviceList);
fleetRouter.post("/devices", DeviceRegister);
fleetRouter.delete("/devices/:id", DeviceDelete);
fleetRouter.get("/devices/:id/status", DeviceStatus);
