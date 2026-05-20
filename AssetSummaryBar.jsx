import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const ScrollArea = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ScrollArea.displayName="ScrollArea";
const ScrollBar = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ScrollBar.displayName="ScrollBar";
export { ScrollArea, ScrollBar };