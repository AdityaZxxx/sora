"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const AppearanceSection = () => {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  return (
    <section className="h-full">
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>
            Choose a theme or match your device settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mounted ? (theme ?? "system") : "system"}
            onValueChange={(value) => {
              if (value === "light" || value === "dark" || value === "system") {
                setTheme(value);
              }
            }}
          >
            <TabsList aria-label="Theme">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <Tooltip key={value}>
                  <TooltipTrigger
                    render={
                      <TabsTrigger
                        value={value}
                        aria-label={`${label} theme`}
                        className="w-10 flex-none"
                      />
                    }
                  >
                    <Icon />
                  </TooltipTrigger>
                  <TooltipContent>{label} theme</TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
};

export default AppearanceSection;
