import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Tooltip = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Tooltip.displayName="Tooltip";
const TooltipTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TooltipTrigger.displayName="TooltipTrigger";
const TooltipContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TooltipContent.displayName="TooltipContent";
const TooltipProvider = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TooltipProvider.displayName="TooltipProvider";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };