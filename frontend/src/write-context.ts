export type WriteContext = {
  generation: number;
  session: unknown;
  client: unknown;
};

export function sameWriteContext(captured: WriteContext, current: WriteContext): boolean {
  return captured.generation === current.generation && captured.session === current.session && captured.client === current.client;
}
