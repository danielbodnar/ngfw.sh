import { fromHono } from "chanfana";
import { Hono } from "hono";
import { clerkAuth } from "../../middleware/auth";
import type { AppBindings, AppVariables } from "../../types";
import { RouteCreate } from "./routeCreate";
import { RouteDelete } from "./routeDelete";
import { RouteList } from "./routeList";
import { RouteUpdate } from "./routeUpdate";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", clerkAuth);

export const routingRouter = fromHono(app);

routingRouter.get("/routes", RouteList);
routingRouter.post("/routes", RouteCreate);
routingRouter.put("/routes/:id", RouteUpdate);
routingRouter.delete("/routes/:id", RouteDelete);
