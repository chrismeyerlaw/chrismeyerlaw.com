import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Contact worker", () => {
	it("returns 405 for non-POST methods", async () => {
		const request = new IncomingRequest("http://example.com", { method: "GET" });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(405);
	});

	it("sends email via SendGrid endpoint (mocked)", async () => {
		const submit = {
			name: "Jane Doe",
			email: "jane@example.com",
			topic: "estate",
			message: "Hello from test",
		};

		globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 202 })) as any;

		const request = new IncomingRequest("http://example.com", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(submit),
		});

		const envWithKeys = {
			SENDGRID_API_KEY: "x-test-key",
			CONTACT_TO_EMAIL: "owner@example.com",
			CONTACT_FROM_EMAIL: "no-reply@example.com",
		};

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, envWithKeys as any, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true });
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});
});
