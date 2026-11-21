import type { CreateTransactionSchemaType } from "@/schemas/transaction";

export type MutationKind = "create-transaction";

export type MutationPayloads = {
  "create-transaction": CreateTransactionSchemaType & {
    idempotencyKey: string;
  };
};

export type Mutation = {
  [Kind in MutationKind]: {
    kind: Kind;
    url: string;
    payload: MutationPayloads[Kind];
    idempotencyKey: string;
  };
}[MutationKind];

export function describeMutation(mutation: Mutation): string {
  return mutation.payload.description?.trim() || "Transaction";
}
