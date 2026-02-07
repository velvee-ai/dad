const SMTP_HOST = process.env.SMTP_HOST || 'smtp.sendgrid.net';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@acme.com';

/**
 * EmailService handles sending transactional emails via SendGrid SMTP.
 * Used for welcome emails, password resets, and order notifications.
 */
export class EmailService {
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    console.log(`[EmailService] Sending welcome email to ${to}`);

    // In production, this would use nodemailer or SendGrid SDK
    await this.sendEmail({
      to,
      subject: `Welcome to Acme, ${name}!`,
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for creating an account with Acme.</p>
        <p>Start shopping now and enjoy free shipping on your first order.</p>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    console.log(`[EmailService] Sending password reset email to ${to}`);

    const resetUrl = `https://acme.com/reset-password?token=${resetToken}`;
    await this.sendEmail({
      to,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
  }

  async sendOrderConfirmation(to: string, orderId: string, total: number): Promise<void> {
    console.log(`[EmailService] Sending order confirmation to ${to} for order ${orderId}`);

    await this.sendEmail({
      to,
      subject: `Order Confirmed: #${orderId}`,
      html: `
        <h1>Order Confirmed!</h1>
        <p>Your order #${orderId} has been confirmed.</p>
        <p>Total: $${total.toFixed(2)}</p>
        <p>You will receive a shipping notification once your order ships.</p>
      `,
    });
  }

  private async sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
    // Mock implementation - in production, use nodemailer/SendGrid
    console.log(`[EmailService] SMTP=${SMTP_HOST} FROM=${FROM_EMAIL} TO=${params.to} SUBJECT=${params.subject}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
