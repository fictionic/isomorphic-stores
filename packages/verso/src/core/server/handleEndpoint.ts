import type {EndpointResponseData, StandardizedEndpoint} from "../common/handler/Endpoint";

export async function handleEndpoint(
  endpoint: StandardizedEndpoint,
): Promise<EndpointResponseData> {
  const data = await endpoint.getResponseData();
  return data;
}
