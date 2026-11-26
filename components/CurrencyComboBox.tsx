"use client";
import type { Currency } from "../lib/currencies";

import { useMutation } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { actionErrorMessage } from "@/lib/action-client";

import { UpdateUserCurrency } from "../app/wizard/_actions/userSettings";
import { Currencies } from "../lib/currencies";

export function CurrencyComboBox({ currency }: { currency: string }) {
  const [open, setOpen] = React.useState(false);
  const [currencyValue, setCurrencyValue] = React.useState(currency);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const walletCurrency = Currencies.find(
    (option) => option.value === currencyValue,
  );

  const mutation = useMutation({
    mutationFn: async (value: string) => {
      const result = await UpdateUserCurrency(value);
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: (saved) => {
      toast.success("Currency updated", {
        id: "update-currency",
      });
      if (!saved) {
        return;
      }
      setCurrencyValue(saved.currency ?? currency);
    },
    onError: (error) => {
      toast.error(
        actionErrorMessage(error, "Unable to update currency. Try again."),
        {
          id: "update-currency",
        },
      );
    },
  });

  const selectOption = (option: Currency | null) => {
    if (!option) {
      toast.error("Select a currency to continue");
      return;
    }
    toast.loading("Updating currency…", {
      id: "update-currency",
    });
    mutation.mutate(option.value);
  };

  const TriggerButton = (
    <Button
      variant="outline"
      className="w-full justify-start text-left"
      disabled={mutation.isPending}
    >
      {walletCurrency ? <>{walletCurrency.label}</> : <>Select currency…</>}
      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={TriggerButton} />
        <PopoverContent className="w-full p-0" align="start">
          <CurrencyList setOpen={setOpen} setSelectedCurrency={selectOption} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <CurrencyList setOpen={setOpen} setSelectedCurrency={selectOption} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function CurrencyList({
  setOpen,
  setSelectedCurrency,
}: {
  setOpen: (open: boolean) => void;
  setSelectedCurrency: (currency: Currency | null) => void;
}) {
  const [search, setSearch] = React.useState("");
  const deferredSearch = React.useDeferredValue(search);
  const needle = deferredSearch.trim().toLowerCase();
  const currencies = needle
    ? Currencies.filter((currency) =>
        `${currency.label} ${currency.value}`.toLowerCase().includes(needle),
      )
    : Currencies;

  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Filter currency…"
      />
      <CommandList>
        {currencies.length === 0 ? (
          <p className="py-6 text-center text-sm">No results found.</p>
        ) : (
          <CommandGroup>
            {currencies.map((currency) => (
              <CommandItem
                key={currency.value}
                value={currency.value}
                onSelect={(value) => {
                  setSelectedCurrency(
                    Currencies.find((priority) => priority.value === value) ??
                      null,
                  );
                  setOpen(false);
                }}
              >
                {currency.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
