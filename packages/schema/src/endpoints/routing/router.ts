import { Hono } from "hono";
import { fromHono } from "chanfana";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { RouteList } from "./routeList";
import { RouteCreate } from "./routeCreate";
import { RouteUpdate } from "./routeUpdate";
import { RouteDelete } from "./routeDelete";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const routingRouter = fromHono(app);

routingRouter.get("/routes", RouteList);
routingRouter.post("/routes", RouteCreate);
routingRouter.put("/routes/:id", RouteUpdate);
routingRouter.delete("/routes/:id", RouteDelete);
