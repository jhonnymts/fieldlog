import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Popover = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Popover.displayName="Popover";
const PopoverTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); PopoverTrigger.displayName="PopoverTrigger";
const PopoverContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); PopoverContent.displayName="PopoverContent";
const PopoverAnchor = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); PopoverAnchor.displayName="PopoverAnchor";
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };