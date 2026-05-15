import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const ToggleGroup = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ToggleGroup.displayName="ToggleGroup";
const ToggleGroupItem = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ToggleGroupItem.displayName="ToggleGroupItem";
export { ToggleGroup, ToggleGroupItem };