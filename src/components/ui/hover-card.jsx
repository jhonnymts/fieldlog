import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const HoverCard = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); HoverCard.displayName="HoverCard";
const HoverCardTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); HoverCardTrigger.displayName="HoverCardTrigger";
const HoverCardContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); HoverCardContent.displayName="HoverCardContent";
export { HoverCard, HoverCardTrigger, HoverCardContent };