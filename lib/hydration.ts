import {
  defaultShouldDehydrateQuery,
  dehydrateQuery,
  QueryClient,
  type DehydratedState,
  type QueryKey,
} from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";

type SeededQuery<TData> = {
  queryKey: QueryKey;
  data: TData;
  infinite?: boolean;
};

async function cachedHydrationUpdatedAt(tags: string[]) {
  "use cache";
  cacheLife("max");
  cacheTag(...tags);
  return Date.now();
}

export async function seededHydrationState<TData extends readonly unknown[]>(
  queries: { [K in keyof TData]: SeededQuery<TData[K]> },
  tags: readonly string[],
): Promise<DehydratedState> {
  const updatedAt = await cachedHydrationUpdatedAt([...tags]);
  const queryClient = new QueryClient();
  const seeded: DehydratedState["queries"] = [];

  for (const query of queries) {
    queryClient.setQueryData<TData[number]>(query.queryKey, query.data, {
      updatedAt,
    });
    const cached = queryClient
      .getQueryCache()
      .find({ queryKey: query.queryKey });
    if (!cached || !defaultShouldDehydrateQuery(cached)) continue;

    seeded.push({
      ...dehydrateQuery(cached),
      ...(query.infinite && { queryType: "infinite" as const }),
    });
  }

  return { mutations: [], queries: seeded };
}
