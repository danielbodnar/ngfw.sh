import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { Connect } from "./connect";
import { Disconnect } from "./disconnect";
import { ProfileCreate } from "./profileCreate";
import { ProfileDelete } from "./profileDelete";
import { ProfileList } from "./profileList";
import { ProfileUpdate } from "./profileUpdate";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const vpnClientRouter = fromHono(app);

vpnClientRouter.get("/profiles", ProfileList);
vpnClientRouter.post("/profiles", ProfileCreate);
vpnClientRouter.put("/profiles/:id", ProfileUpdate);
vpnClientRouter.delete("/profiles/:id", ProfileDelete);
vpnClientRouter.post("/profiles/:id/connect", Connect);
vpnClientRouter.post("/profiles/:id/disconnect", Disconnect);
