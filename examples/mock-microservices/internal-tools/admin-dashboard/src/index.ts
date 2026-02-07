/**
 * Admin Dashboard - Internal tool for operations and customer support.
 *
 * Features:
 *   - View and manage customer orders
 *   - Process refunds and cancellations
 *   - View user accounts and activity
 *   - Monitor system health and metrics
 *   - Manage product catalog
 *
 * Communicates with:
 *   - E-Commerce API Gateway (REST/HTTPS) for order and user data
 *   - Internal metrics API for system health
 */

interface AdminConfig {
  apiGatewayUrl: string;
  metricsApiUrl: string;
}

const config: AdminConfig = {
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  metricsApiUrl: process.env.METRICS_API_URL || 'http://localhost:9090',
};

export class AdminDashboard {
  constructor(private config: AdminConfig) {}

  async getOrders(filters: { status?: string; userId?: string; page?: number }): Promise<any> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.page) params.set('page', String(filters.page));

    const response = await fetch(`${this.config.apiGatewayUrl}/api/orders?${params}`);
    return response.json();
  }

  async getUsers(page: number = 1): Promise<any> {
    const response = await fetch(`${this.config.apiGatewayUrl}/api/admin/users?page=${page}`);
    return response.json();
  }

  async processRefund(orderId: string, reason: string): Promise<any> {
    const response = await fetch(`${this.config.apiGatewayUrl}/api/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return response.json();
  }

  async getSystemHealth(): Promise<any> {
    const response = await fetch(`${this.config.metricsApiUrl}/health`);
    return response.json();
  }
}

console.log('[AdminDashboard] Initialized with config:', config);
