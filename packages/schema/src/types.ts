import type { Context } from "hono";

/** Wrangler secrets not included in the generated Env type */
interface EnvSecrets {
	CLERK_SECRET_KEY: string;
}

export type AppBindings = Env & EnvSecrets;

export type AppVariables = {
	userId: string;
};

export type AppContext = Context<{ Bindings: AppBindings; Variables: AppVariables }>;
export type HandleArgs = [AppContext];
