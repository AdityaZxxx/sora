import {
  defaultShouldDehydrateQuery,
  dehydrateQuery,
  QueryClient,
  queryOptions,
  type DehydratedState,
  type QueryKey,
} from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";

type SeededQuery = {
  queryKey: QueryKey;
  seed: (queryClient: QueryClient, updatedAt: number) => void;
  infinite?: boolean;
};

export function seedQuery<TData>(
  queryKey: QueryKey,
  data: TData,
  infinite = false,
): SeededQuery {
  const options = queryOptions({ queryKey, initialData: data });
  return {
    queryKey: options.queryKey,
    infinite,
    seed: (queryClient, updatedAt) => {
      queryClient.setQueryData(options.queryKey, data, { updatedAt });
    },
  };
}

async function cachedHydrationUpdatedAt(tags: readonly string[]) {
  "use cache";
  cacheLife("max");
  cacheTag(...tags);
  return Date.now();
}

export async function seededHydrationState(
  queries: readonly SeededQuery[],
  tags: readonly string[],
): Promise<DehydratedState> {
  const updatedAt = await cachedHydrationUpdatedAt([...tags]);
  const queryClient = new QueryClient();
  const seeded: DehydratedState["queries"] = [];

  for (const query of queries) {
    query.seed(queryClient, updatedAt);
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
