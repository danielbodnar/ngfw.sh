import { ClerkProvider } from "@clerk/clerk-react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Check if running in demo mode
const IS_DEMO = import.meta.env.DEMO_INSTANCE === "true";

// Clerk publishable key from environment
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!IS_DEMO && !PUBLISHABLE_KEY) {
	throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		{IS_DEMO ? (
			<App />
		) : (
			<ClerkProvider
				publishableKey={PUBLISHABLE_KEY}
				afterSignOutUrl="/"
				signInForceRedirectUrl="/"
				signUpForceRedirectUrl="/"
			>
				<App />
			</ClerkProvider>
		)}
	</React.StrictMode>,
);
