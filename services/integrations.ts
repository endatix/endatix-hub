"use server";

import { SlackAuthResponse } from "@/types";
import { HeaderBuilder } from "../lib/endatix-api/shared/header-builder";

const API_BASE_URL = `${process.env.ENDATIX_API_URL}`;
const SLACK_CLIENT_ID = `${process.env.SLACK_CLIENT_ID}`;
const SLACK_CLIENT_SECRET = `${process.env.SLACK_CLIENT_SECRET}`;
const SLACK_REDIRECT_URI = `${process.env.SLACK_REDIRECT_URI}`;

export const getSlackBearerToken = async (
  code: string,
): Promise<SlackAuthResponse> => {
  const requestOptions: RequestInit = {};

  const response = await fetch(
    `https://slack.com/api/oauth.v2.access?code=${code}&client_id=${SLACK_CLIENT_ID}&client_secret=${SLACK_CLIENT_SECRET}&redirect_uri=${SLACK_REDIRECT_URI}`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("error");
  }

  return response.json();
};

export const sendSlackBearerToken = async (token: string): Promise<boolean> => {
  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const endpointUrl = `${API_BASE_URL}/slacktoken`;

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: headers,
    body: '{ "token": "' + token + '"}',
  });

  if (!response.ok) {
    return false;
  }

  return true;
};
