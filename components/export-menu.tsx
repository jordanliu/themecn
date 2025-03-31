"use client";

import { useState } from "react";
import { useThemeStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";

export function ExportMenu() {
  const {
    exportMenuOpen,
    setExportMenuOpen,
    generateCSSVariables,
    getRegistryUrl,
  } = useThemeStore();
  const [copied, setCopied] = useState(false);
  const [registryCopied, setRegistryCopied] = useState(false);
  const [selectedPackageManager, setSelectedPackageManager] = useState("pnpm");

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCSSVariables());
    setCopied(true);
    toast("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegistryCopy = () => {
    const registryUrl = getRegistryUrl();
    const command = getRegistryCommand(selectedPackageManager, registryUrl);
    navigator.clipboard.writeText(command);
    setRegistryCopied(true);
    toast("Command copied to clipboard!");
    setTimeout(() => setRegistryCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = generateCSSVariables();
    const blob = new Blob([code], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "globals.css";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const packageManagers = ["pnpm", "npm", "bun"];
  const registryUrl = getRegistryUrl();

  const getRegistryCommand = (packageManager: string, url: string) => {
    switch (packageManager) {
      case "pnpm":
        return `pnpm dlx shadcn@canary add ${url}`;
      case "npm":
        return `npx shadcn@canary add ${url}`;
      case "bun":
        return `bunx --bun shadcn@canary add ${url}`;
      default:
        return `pnpm dlx shadcn@canary add ${url}`;
    }
  };

  const registryCommand = getRegistryCommand(
    selectedPackageManager,
    registryUrl
  );

  return (
    <Dialog open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white text-black rounded-md border-0 shadow-lg p-6 light-mode-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl text-black font-semibold">
            Export Theme Configuration
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Choose your preferred format to export your theme configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full mt-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm">
          <p className="font-medium mb-2">Use with shadcn/ui CLI:</p>

          <div className="flex flex-wrap gap-2 mt-2">
            {packageManagers.map((pm) => (
              <Button
                key={pm}
                size="sm"
                variant="outline"
                onClick={() => setSelectedPackageManager(pm)}
                className={`h-8 px-3 rounded-full cursor-pointer ${
                  selectedPackageManager === pm
                    ? "bg-gray-900 text-white hover:bg-black dark:bg-gray-900 dark:text-white dark:hover:bg-black border-0"
                    : "bg-gray-200 text-gray-700 border-0 hover:bg-gray-300 dark:bg-gray-200 dark:text-gray-700 dark:hover:bg-gray-300"
                }`}
              >
                {pm}
              </Button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between bg-white rounded border border-gray-200 overflow-hidden">
            <div className="p-2 overflow-hidden whitespace-nowrap overflow-ellipsis flex-1">
              <code className="text-xs block overflow-hidden text-ellipsis max-w-screen-sm">
                {registryCommand}
              </code>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="cursor-pointer h-full rounded-none border-l border-gray-200 bg-gray-50 text-gray-700 "
              onClick={handleRegistryCopy}
            >
              {registryCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="mt-2 text-xs text-gray-600">
            Import your theme directly with the shadcn registry endpoint.
          </p>
        </div>

        <Tabs defaultValue="globals" className="mt-2">
          <span className="text-sm">globals.css</span>
          <TabsContent value="globals">
            <div className="relative">
              <pre className="p-4 rounded-md bg-[#f5f7f9] border border-gray-200 overflow-auto max-h-[400px] text-sm text-gray-800 font-mono">
                <code>{generateCSSVariables()}</code>
              </pre>
              <div className="absolute top-2 right-2 flex gap-2 mr-2">
                <Button
                  size="sm"
                  className="bg-[#f5f7f9] cursor-pointer text-gray-700 border border-gray-300 hover:bg-gray-200 rounded-full p-2 h-8 w-8"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  className="bg-[#f5f7f9] cursor-pointer text-gray-700 border border-gray-300 hover:bg-gray-200 rounded-full p-2 h-8 w-8"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 text-sm">
          <p className="font-medium mb-1">Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tailwind CSS v4 or later</li>
            <li>shadcn/ui</li>
          </ul>
        </div>

        <div className="flex justify-end mt-6">
          <Button
            variant="outline"
            onClick={() => setExportMenuOpen(false)}
            className="bg-white dark:bg-white dark:hover:bg-gray-100 dark:hover:text-gray-800 cursor-pointer text-gray-800 border border-gray-200 hover:bg-gray-100 rounded-md"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
