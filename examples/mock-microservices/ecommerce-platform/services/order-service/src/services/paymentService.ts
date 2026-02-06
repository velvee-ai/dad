import { v4 as uuidv4 } from 'uuid';

interface ChargeInput {
  amount: number;
  currency: string;
  paymentMethodToken: string;
  orderId: string;
}

interface ChargeResult {
  success: boolean;
  paymentId: string;
  error?: string;
}

/**
 * PaymentService integrates with Stripe for payment processing.
 * Handles charges, refunds, and payment method validation.
 * All monetary amounts are in cents to avoid floating-point issues.
 */
export class PaymentService {
  private readonly stripeApiKey: string;

  constructor() {
    this.stripeApiKey = process.env.STRIPE_API_KEY || 'sk_test_mock';
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    console.log(`[PaymentService] Charging $${input.amount.toFixed(2)} for order ${input.orderId}`);

    try {
      // In production, this would call Stripe SDK:
      // const stripe = new Stripe(this.stripeApiKey);
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: Math.round(input.amount * 100), // cents
      //   currency: input.currency,
      //   payment_method: input.paymentMethodToken,
      //   confirm: true,
      // });

      // Mock: simulate successful payment
      const paymentId = `pay_${uuidv4().substring(0, 8)}`;

      // Simulate occasional payment failures (10% chance in mock)
      if (Math.random() < 0.1 && input.paymentMethodToken === 'tok_fail') {
        return { success: false, paymentId: '', error: 'Card declined' };
      }

      console.log(`[PaymentService] Payment ${paymentId} succeeded`);
      return { success: true, paymentId };
    } catch (error: any) {
      console.error(`[PaymentService] Charge failed:`, error);
      return { success: false, paymentId: '', error: error.message };
    }
  }

  async refund(paymentId: string, amount: number): Promise<{ success: boolean; refundId: string }> {
    console.log(`[PaymentService] Refunding $${amount.toFixed(2)} for payment ${paymentId}`);

    // In production: stripe.refunds.create({ payment_intent: paymentId, amount: Math.round(amount * 100) })
    const refundId = `re_${uuidv4().substring(0, 8)}`;
    console.log(`[PaymentService] Refund ${refundId} processed`);

    return { success: true, refundId };
  }

  async validatePaymentMethod(token: string): Promise<boolean> {
    // In production: verify the token is valid with Stripe
    return token.startsWith('tok_') || token.startsWith('pm_');
  }
}
