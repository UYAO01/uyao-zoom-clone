"use server";

import { StreamClient } from "@stream-io/node-sdk";

const getStreamConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET_KEY;

  if (!apiKey) throw new Error("Stream API Key is not defined");
  if (!apiSecret) throw new Error("Stream API Secret is not defined");

  return { apiKey, apiSecret };
};

export const tokenProvider = async (userId: string) => {
  if (!userId) throw new Error('User ID is required');

  const { apiKey, apiSecret } = getStreamConfig();
  const client = new StreamClient(apiKey, apiSecret);

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60; // 1 hour expiration

  return client.createToken(userId, exp);
};
