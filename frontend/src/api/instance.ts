import { createApiClient, type ApiClient } from './client'

// A swappable singleton so stores can use the API while tests inject a fake client.
let client: ApiClient = createApiClient()

export function setApiClient(next: ApiClient): void {
  client = next
}

export function api(): ApiClient {
  return client
}
