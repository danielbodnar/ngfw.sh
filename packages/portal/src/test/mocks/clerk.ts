/**
 * Mock implementations for Clerk authentication hooks.
 * Used in unit and integration tests.
 */

import { vi } from "vitest";

export const mockGetToken = vi.fn<() => Promise<string | null>>();

export const mockUseAuth = () => ({
	getToken: mockGetToken,
	isLoaded: true,
	isSignedIn: true,
	userId: "test-user-id",
	sessionId: "test-session-id",
	orgId: null,
	orgRole: null,
	orgSlug: null,
});

export const mockUser = {
	id: "test-user-id",
	firstName: "Test",
	lastName: "User",
	fullName: "Test User",
	primaryEmailAddress: {
		emailAddress: "test@example.com",
	},
	imageUrl: "https://example.com/avatar.jpg",
	createdAt: Date.now() - 86400000,
	twoFactorEnabled: false,
};

export const mockUseUser = () => ({
	user: mockUser,
	isLoaded: true,
	isSignedIn: true,
});

export const mockUseClerk = () => ({
	signOut: vi.fn(),
	openUserProfile: vi.fn(),
	openSignIn: vi.fn(),
	openSignUp: vi.fn(),
});

// Mock the entire Clerk module
vi.mock("@clerk/clerk-react", () => ({
	useAuth: mockUseAuth,
	useUser: mockUseUser,
	useClerk: mockUseClerk,
	SignedIn: ({ children }: { children: React.ReactNode }) => children,
	SignedOut: () => null,
	SignIn: () => null,
	UserButton: () => null,
	ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));
