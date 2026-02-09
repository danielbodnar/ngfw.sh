// HTTP client wrapper for API testing

use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

/// API client for E2E testing
pub struct ApiClient {
    client: Client,
    base_url: String,
    jwt_token: String,
    device_id: String,
}

impl ApiClient {
    /// Create a new API client
    pub fn new(base_url: String, jwt_token: String, device_id: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            client,
            base_url,
            jwt_token,
            device_id,
        }
    }

    /// Create a client without authentication (for health check, etc.)
    pub fn new_unauthenticated(base_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            client,
            base_url,
            jwt_token: String::new(),
            device_id: String::new(),
        }
    }

    /// Perform a GET request
    pub async fn get(&self, path: &str) -> Result<Response, reqwest::Error> {
        let mut request = self
            .client
            .get(format!("{}{}", self.base_url, path));

        if !self.jwt_token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", self.jwt_token));
        }

        if !self.device_id.is_empty() {
            request = request.header("X-Device-ID", &self.device_id);
        }

        request.send().await
    }

    /// Perform a POST request with JSON body
    pub async fn post<T: Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, reqwest::Error> {
        let mut request = self
            .client
            .post(format!("{}{}", self.base_url, path))
            .json(body);

        if !self.jwt_token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", self.jwt_token));
        }

        if !self.device_id.is_empty() {
            request = request.header("X-Device-ID", &self.device_id);
        }

        request.send().await
    }

    /// Perform a PUT request with JSON body
    pub async fn put<T: Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, reqwest::Error> {
        let mut request = self
            .client
            .put(format!("{}{}", self.base_url, path))
            .json(body);

        if !self.jwt_token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", self.jwt_token));
        }

        if !self.device_id.is_empty() {
            request = request.header("X-Device-ID", &self.device_id);
        }

        request.send().await
    }

    /// Perform a DELETE request
    pub async fn delete(&self, path: &str) -> Result<Response, reqwest::Error> {
        let mut request = self
            .client
            .delete(format!("{}{}", self.base_url, path));

        if !self.jwt_token.is_empty() {
            request = request.header("Authorization", format!("Bearer {}", self.jwt_token));
        }

        if !self.device_id.is_empty() {
            request = request.header("X-Device-ID", &self.device_id);
        }

        request.send().await
    }

    /// Update the JWT token
    pub fn set_token(&mut self, token: String) {
        self.jwt_token = token;
    }

    /// Update the device ID
    pub fn set_device_id(&mut self, device_id: String) {
        self.device_id = device_id;
    }
}

/// Response assertion helpers
pub struct ResponseAssertion {
    response: Response,
}

impl ResponseAssertion {
    pub fn new(response: Response) -> Self {
        Self { response }
    }

    /// Assert response status code
    pub async fn assert_status(self, expected: StatusCode) -> Self {
        let actual = self.response.status();
        assert_eq!(
            actual, expected,
            "Expected status {}, got {}. Response body: {:?}",
            expected,
            actual,
            self.response.text().await.unwrap_or_default()
        );
        self
    }

    /// Assert response is successful (2xx)
    pub async fn assert_success(self) -> Self {
        assert!(
            self.response.status().is_success(),
            "Expected successful response, got {}",
            self.response.status()
        );
        self
    }

    /// Assert response contains JSON
    pub async fn assert_json<T: for<'de> Deserialize<'de>>(mut self) -> (Self, T) {
        let json = self
            .response
            .json::<T>()
            .await
            .expect("Failed to parse JSON response");
        (self, json)
    }

    /// Get the response for further processing
    pub fn into_response(self) -> Response {
        self.response
    }
}

/// Helper trait to convert Response to ResponseAssertion
pub trait IntoAssertion {
    fn assert(self) -> ResponseAssertion;
}

impl IntoAssertion for Response {
    fn assert(self) -> ResponseAssertion {
        ResponseAssertion::new(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = ApiClient::new(
            "http://localhost:8787".to_string(),
            "test_token".to_string(),
            "test_device".to_string(),
        );
        assert_eq!(client.base_url, "http://localhost:8787");
    }

    #[test]
    fn test_unauthenticated_client() {
        let client = ApiClient::new_unauthenticated("http://localhost:8787".to_string());
        assert!(client.jwt_token.is_empty());
        assert!(client.device_id.is_empty());
    }

    #[test]
    fn test_client_token_update() {
        let mut client = ApiClient::new_unauthenticated("http://localhost:8787".to_string());
        client.set_token("new_token".to_string());
        assert_eq!(client.jwt_token, "new_token");
    }
}
