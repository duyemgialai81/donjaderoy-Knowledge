import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-slate-400 selection:bg-sky-100 selection:text-sky-900 dark:bg-input/30 border-slate-200 flex h-10 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm text-slate-800 transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-sky-400 focus-visible:ring-[3px] focus-visible:ring-sky-100",
        "aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
