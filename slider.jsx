import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Toggle = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Toggle.displayName="Toggle";
const toggleVariants = cva("inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium");
export { Toggle, toggleVariants };