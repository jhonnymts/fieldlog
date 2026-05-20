import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Collapsible = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Collapsible.displayName="Collapsible";
const CollapsibleTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CollapsibleTrigger.displayName="CollapsibleTrigger";
const CollapsibleContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CollapsibleContent.displayName="CollapsibleContent";
export { Collapsible, CollapsibleTrigger, CollapsibleContent };