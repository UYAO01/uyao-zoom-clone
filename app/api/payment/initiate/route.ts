import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// If you are using Clerk for authentication, you can uncomment the line below
// import { auth } from '@clerk/nextjs';

// This is a conceptual import for your database client (e.g., Prisma, Drizzle)
// import { db } from '@/lib/db';

/**
 * Fetches a short-lived access token from the PesaPal API.
 */
async function getPesaPalAccessToken(): Promise<string> {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  const pesapalApiUrl = process.env.PESAPAL_API_URL;

  if (!consumerKey || !consumerSecret || !pesapalApiUrl) {
    throw new Error('Missing PesaPal API credentials in environment variables.');
  }

  const response = await fetch(`${pesapalApiUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.token) {
    console.error('Failed to get PesaPal token:', data);
    throw new Error('Failed to authenticate with PesaPal.');
  }

  return data.token;
}

export async function POST(request: Request) {
  // For user authentication with Clerk, you can uncomment these lines
  // const { userId } = auth();
  // if (!userId) {
  //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const { planId, planTitle, amount, currency } = await request.json();
    // In a real app, you would get user details from your authenticated session
    const user = {
      email: 'test@example.com', // Replace with actual user email from session
      firstName: 'John',         // Replace with actual user first name
      lastName: 'Doe',           // Replace with actual user last name
    };

    if (!planId || !planTitle || !amount || !currency) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const pesapalApiUrl = process.env.PESAPAL_API_URL;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ipnNotificationId = process.env.PESAPAL_IPN_ID;

    if (!ipnNotificationId || !pesapalApiUrl) {
      throw new Error('PesaPal API URL or IPN ID is not configured in environment variables.');
    }

    // Step 1: Get PesaPal authentication token
    const token = await getPesaPalAccessToken();

    // Step 2: Prepare the order payload for PesaPal
    const merchantReference = uuidv4(); // A unique ID for this transaction
    const orderPayload = {
      id: merchantReference,
      currency: currency,
      amount: amount,
      description: `Payment for ${planTitle}`,
      callback_url: `${baseUrl}/payment-confirmation?orderId=${merchantReference}`, // The URL the user is redirected to after payment
      notification_id: ipnNotificationId, // Your registered IPN URL's ID
      billing_address: {
        email_address: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
    };

    // Step 3: Submit the order to PesaPal
    const submitOrderResponse = await fetch(`${pesapalApiUrl}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const orderResponseData = await submitOrderResponse.json();

    if (!submitOrderResponse.ok || !orderResponseData.redirect_url) {
      console.error('Failed to submit PesaPal order:', orderResponseData);
      throw new Error(`Failed to create PesaPal transaction: ${orderResponseData.error?.message || 'Unknown error'}`);
    }

    // (Recommended) At this point, save the `merchantReference` and order details with a 'pending' status in your database.
    // await db.orders.create({ data: { id: merchantReference, userId, planId, amount, status: 'pending' } });

    // Step 4: Return the real PesaPal redirect URL to the frontend
    return NextResponse.json({ redirectUrl: orderResponseData.redirect_url });

  } catch (error) {
    console.error('PesaPal payment initiation failed:', error);
    // Ensure that even in case of an error, we return a JSON response
    return NextResponse.json({ message: (error as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
