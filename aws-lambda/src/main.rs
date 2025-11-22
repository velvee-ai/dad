use lambda_http::{run, service_fn, Body, Error, Request, Response};
use serde_json::json;

async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    // Log the request
    tracing::info!("Request: {} {}", event.method(), event.uri().path());

    let path = event.uri().path();
    let method = event.method().as_str();

    match (method, path) {
        // Root health check endpoint
        ("GET", "/") => {
            Ok(Response::builder()
                .status(200)
                .header("content-type", "text/plain")
                .body("DAAD Lambda - Ready to visualize!".into())?)
        }

        // Detailed health endpoint
        ("GET", "/api/health") => {
            let response_body = json!({
                "status": "healthy",
                "service": "daad-lambda",
                "version": env!("CARGO_PKG_VERSION"),
                "runtime": "AWS Lambda Rust"
            });

            Ok(Response::builder()
                .status(200)
                .header("content-type", "application/json")
                .body(response_body.to_string().into())?)
        }

        // POST diagram endpoint
        ("POST", "/api/diagram") => {
            let body = event.body();
            let body_str = match body {
                Body::Text(text) => text.to_string(),
                Body::Binary(bytes) => String::from_utf8_lossy(bytes).to_string(),
                Body::Empty => String::new(),
            };

            let response_body = json!({
                "success": true,
                "message": "Diagram received",
                "data_length": body_str.len()
            });

            Ok(Response::builder()
                .status(200)
                .header("content-type", "application/json")
                .body(response_body.to_string().into())?)
        }

        // Lambda version endpoint
        ("GET", "/lambda-version") => {
            let version = env!("CARGO_PKG_VERSION");
            Ok(Response::builder()
                .status(200)
                .header("content-type", "text/plain")
                .body(version.into())?)
        }

        // 404 for unknown routes
        _ => {
            let error_body = json!({
                "error": "Not Found",
                "path": path,
                "method": method
            });

            Ok(Response::builder()
                .status(404)
                .header("content-type", "application/json")
                .body(error_body.to_string().into())?)
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}
