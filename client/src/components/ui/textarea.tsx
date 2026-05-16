import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-slate-200 placeholder:text-slate-400 focus-visible:border-orange-400 focus-visible:ring-[3px] focus-visible:ring-orange-100 aria-invalid:ring-red-500/20 dark:aria-invalid:ring-red-500/40 aria-invalid:border-red-500 dark:bg-input/30 flex min-h-[80px] w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 selection:bg-orange-100 selection:text-orange-900",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
