use worker::*;

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Log the request
    console_log!(
        "{} - [{}]",
        Date::now().to_string(),
        req.path()
    );

    // Create a new router
    let router = Router::new();

    router
        .get("/", |_, _| Response::ok("DAAD Worker - Ready to visualize!"))
        .get_async("/api/health", |_req, _ctx| async move {
            Response::from_json(&serde_json::json!({
                "status": "healthy",
                "service": "daad-worker",
                "version": env!("CARGO_PKG_VERSION")
            }))
        })
        .post_async("/api/diagram", |mut req, _ctx| async move {
            let body = req.text().await?;

            // Here you could process diagram data, store it in KV, etc.
            Response::from_json(&serde_json::json!({
                "success": true,
                "message": "Diagram received",
                "data_length": body.len()
            }))
        })
        .get("/worker-version", |_, ctx| {
            let version = ctx.var("WORKERS_RS_VERSION")?.to_string();
            Response::ok(version)
        })
        .run(req, env)
        .await
}
