"use client";
import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, PlusSquare } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";

import CategoryIcon from "@/components/CategoryIcon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCallerRole } from "@/hooks/use-members";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { fetchReadJson } from "@/lib/fetch-json";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import CreateCategoryDialog from "./CreateCategoryDialog";

interface Props {
  type: TransactionType;
  onChange: (value: string) => void;
  id?: string;
  value?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const CategoryPicker = ({
  type,
  onChange,
  id,
  value: initialValue,
  ...ariaProps
}: Props) => {
  const { canEdit } = useCallerRole();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const listId = useId();

  const selectCategory = (name: string) => {
    setValue(name);
    onChange(name);
  };

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () =>
      fetchReadJson<Category[]>(
        "/api/categories",
        "Failed to fetch categories",
        {
          params: { type },
        },
      ),
    staleTime: QUERY_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const selectedCategory = categoriesQuery.data?.find(
    (category: Category) => category.name === value,
  );
  const needle = deferredSearch.trim().toLowerCase();
  const categories: Category[] = (categoriesQuery.data ?? []).filter(
    (category: Category) =>
      !needle || category.name.toLowerCase().includes(needle),
  );

  const SuccessCallback = (category: Category) => {
    selectCategory(category.name);
    setOpen((prev) => !prev);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant={"outline"}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className="w-full justify-between"
            {...ariaProps}
          />
        }
      >
        {selectedCategory ? (
          <CategoryRow category={selectedCategory} />
        ) : (
          "Select category"
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          shouldFilter={false}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search category…"
          />
          <CommandGroup>
            <CommandList id={listId}>
              {categories.map((category) => (
                <CommandItem
                  key={category.name}
                  onSelect={() => {
                    selectCategory(category.name);
                    setOpen((prev) => !prev);
                  }}
                >
                  <CategoryRow category={category} />
                  <Check
                    className={cn(
                      "me-2 h-4 w-4 opacity-0",
                      value === category.name && "opacity-100",
                    )}
                  />
                </CommandItem>
              ))}
              {canEdit ? (
                <CreateCategoryDialog
                  key={`create-${search.trim()}`}
                  type={type}
                  successCallback={SuccessCallback}
                  defaultName={search.trim()}
                  trigger={
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm whitespace-nowrap text-muted-foreground outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                    >
                      <PlusSquare className="size-4 shrink-0 text-muted-foreground" />
                      <span>
                        {categories.length === 0 && search.trim()
                          ? `Create ${search.trim()}`
                          : "Add new"}
                      </span>
                    </button>
                  }
                />
              ) : (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Viewers cannot add categories
                </p>
              )}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryPicker;

function CategoryRow({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2">
      <CategoryIcon
        icon={category.icon}
        iconKind={category.iconKind}
        iconColor={category.iconColor}
        className="size-4 text-base"
      />
      <span>{category.name}</span>
    </div>
  );
}
