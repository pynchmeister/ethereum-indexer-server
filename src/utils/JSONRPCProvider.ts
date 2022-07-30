import fetch from 'node-fetch';
import type {EIP1193Provider, EIP1193RequestArguments} from 'ethereum-indexer/src/engine/ethereum';


let counter = 0;
export async function send<U extends any, T>(
  endpoint: string,
  method: string,
  params?: U,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ++counter,
      jsonrpc: '2.0',
      method,
      params,
    }),
  });
  const json: { result?: T; error?: any } = await response.json();
  if (json.error || !json.result) {
    throw json.error || { code: 5000, message: 'No Result' };
  }
  return json.result;
}


export class JSONRPCProvider implements EIP1193Provider{

    constructor(protected endpoint: string) {}

    request<T>(args: EIP1193RequestArguments): Promise<T> {
        return send(this.endpoint, args.method, args.params)
    }

}