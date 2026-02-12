//! NGFW.sh API Server
//!
//! A Rust-based API server running on Cloudflare Workers that provides:
//! - RESTful API endpoints for router management
//! - WebSocket RPC for real-time communication with router agents
//! - Authentication via Clerk
//! - Storage via Cloudflare KV, D1, and R2
//! - OpenAPI 3.1 specification at `/openapi.json`

mod handlers;
mod middleware;
mod models;
mod openapi;
mod rpc;
mod storage;

use worker::*;

pub use handlers::router::build_router;
pub use openapi::ApiDoc;
pub use rpc::agent_connection::AgentConnection;

/// Main entry point for the Cloudflare Worker
#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    let router = build_router();
    router.run(req, env).await
}
